/**
 * E2E Test Data Cleanup Script
 *
 * Deletes all test data created by USER1 and USER2 during E2E runs,
 * including associated S3 objects. Preserves the test user accounts
 * themselves (cognito_users, stripe_customers, subscriptions, quota_goals).
 *
 * Usage (run from server/ directory):
 *   node scripts/e2e-cleanup.js
 *   node scripts/e2e-cleanup.js --dry-run
 *
 * Required env vars (loaded from server/.env):
 *   DATABASE_URL, AWS_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID,
 *   AWS_SECRET_ACCESS_KEY, APP_ENV, ENCRYPTION_KEY
 *
 * USER1 and USER2 are resolved from USER1_EMAIL / USER2_EMAIL in server/.env.test,
 * or you may set USER1_SUB / USER2_SUB directly to skip email lookup.
 */

'use strict';

const path = require('path');
const crypto = require('crypto');

// Load server .env (credentials, DB URL, AWS, APP_ENV)
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// Load .env.test on top — provides USER1_EMAIL, USER2_EMAIL (won't override existing vars)
require('dotenv').config({ path: path.join(__dirname, '../.env.test'), override: false });
const pool = require('../lib/utils/pool');
const { S3Client, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run');
const APP_ENV = process.env.APP_ENV || 'development';
const DEV_SUFFIX = APP_ENV === 'development' ? '-dev' : '';
const BUCKET = process.env.AWS_BUCKET_NAME;

if (!BUCKET) {
  console.error('AWS_BUCKET_NAME is not set');
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

async function resolveSubByEmail(email) {
  const hash = hashEmail(email);
  const { rows } = await pool.query(
    'SELECT sub FROM cognito_users WHERE email_hash = $1',
    [hash]
  );
  return rows[0]?.sub ?? null;
}

async function deleteS3Objects(keys) {
  if (keys.length === 0) {
    console.log('  No S3 objects to delete.');
    return;
  }
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would delete ${keys.length} S3 objects:`);
    keys.forEach((k) => console.log(`    ${k}`));
    return;
  }
  // S3 DeleteObjects supports up to 1000 per request
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    await s3.send(
      new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: batch, Quiet: true } })
    );
  }
  console.log(`  Deleted ${keys.length} S3 objects.`);
}

async function dbRun(label, sql, params = []) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${label}`);
    return { rowCount: 0 };
  }
  const result = await pool.query(sql, params);
  console.log(`  ${label}: ${result.rowCount} row(s) affected`);
  return result;
}

// ---------------------------------------------------------------------------
// S3 key collection (must run BEFORE DB records are deleted)
// ---------------------------------------------------------------------------
async function collectS3Keys(user1Sub) {
  const keys = [];

  // Gallery post main images — public_id is just the uniqueId (not the full key)
  const { rows: postRows } = await pool.query(
    `SELECT public_id FROM gallery_posts
     WHERE seller_sub = $1 AND public_id IS NOT NULL`,
    [user1Sub]
  );
  for (const { public_id } of postRows) {
    // Skip legacy/placeholder values that are not real S3 keys
    if (public_id && !public_id.startsWith('http') && !public_id.startsWith('publicID_') && !public_id.startsWith('sample_')) {
      keys.push(`at-the-fire${DEV_SUFFIX}/${public_id}`);
    }
  }

  // Additional gallery post images (posts_imgs table)
  const { rows: imgRows } = await pool.query(
    `SELECT pi.public_id
     FROM posts_imgs pi
     JOIN gallery_posts gp ON pi.post_id = gp.id
     WHERE gp.seller_sub = $1 AND pi.public_id IS NOT NULL`,
    [user1Sub]
  );
  for (const { public_id } of imgRows) {
    if (public_id && !public_id.startsWith('http') && !public_id.startsWith('publicID_')) {
      keys.push(`at-the-fire${DEV_SUFFIX}/${public_id}`);
    }
  }

  // Auction images — stored as full S3/CloudFront URLs in image_urls TEXT[]
  const { rows: auctionRows } = await pool.query(
    'SELECT image_urls FROM auctions WHERE seller_sub = $1',
    [user1Sub]
  );
  for (const { image_urls } of auctionRows) {
    for (const url of image_urls || []) {
      try {
        const parsed = new URL(url);
        const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
        if (key.startsWith('at-the-fire')) {
          keys.push(key);
        }
      } catch {
        // Not a valid URL — skip
      }
    }
  }

  // Quota tracking images — same format as gallery posts
  const { rows: qtRows } = await pool.query(
    `SELECT qt.public_id
     FROM quota_tracking qt
     JOIN stripe_customers sc ON qt.customer_id = sc.customer_id
     WHERE sc.aws_sub = $1 AND qt.public_id IS NOT NULL`,
    [user1Sub]
  );
  for (const { public_id } of qtRows) {
    if (
      public_id &&
      !public_id.startsWith('http') &&
      !public_id.startsWith('image-public-id') &&
      !public_id.startsWith('publicID_')
    ) {
      keys.push(`at-the-fire${DEV_SUFFIX}/${public_id}`);
    }
  }

  // Deduplicate
  return [...new Set(keys)];
}

// ---------------------------------------------------------------------------
// Main cleanup
// ---------------------------------------------------------------------------
async function cleanup() {
  if (DRY_RUN) {
    console.log('=== DRY RUN MODE — no changes will be made ===\n');
  }

  // --- Resolve subs ---
  let user1Sub = process.env.USER1_SUB;
  let user2Sub = process.env.USER2_SUB;

  if (!user1Sub) {
    const email = process.env.USER1_EMAIL;
    if (!email) {
      console.error('Set USER1_SUB or USER1_EMAIL in env');
      process.exit(1);
    }
    user1Sub = await resolveSubByEmail(email);
    if (!user1Sub) {
      console.error(`No user found for USER1_EMAIL=${email}`);
      process.exit(1);
    }
    console.log(`Resolved USER1_SUB=${user1Sub} from email`);
  }

  if (!user2Sub) {
    const email = process.env.USER2_EMAIL;
    if (!email) {
      console.error('Set USER2_SUB or USER2_EMAIL in env');
      process.exit(1);
    }
    user2Sub = await resolveSubByEmail(email);
    if (!user2Sub) {
      console.error(`No user found for USER2_EMAIL=${email}`);
      process.exit(1);
    }
    console.log(`Resolved USER2_SUB=${user2Sub} from email`);
  }

  console.log(`\nCleaning up E2E test data`);
  console.log(`  USER1 sub: ${user1Sub}`);
  console.log(`  USER2 sub: ${user2Sub}\n`);

  // --- Get USER1's customer_id ---
  const { rows: custRows } = await pool.query(
    'SELECT customer_id FROM stripe_customers WHERE aws_sub = $1',
    [user1Sub]
  );
  const user1CustomerId = custRows[0]?.customer_id ?? null;
  if (user1CustomerId) {
    console.log(`  USER1 customer_id: ${user1CustomerId}`);
  } else {
    console.log('  USER1 has no stripe_customers row — quota_tracking/orders skipped');
  }

  // --- Collect S3 keys before any DB records are deleted ---
  console.log('\n[1/5] Collecting S3 keys...');
  const s3Keys = await collectS3Keys(user1Sub);
  console.log(`  Found ${s3Keys.length} S3 objects to delete`);

  // --- DB cleanup ---
  console.log('\n[2/5] Cleaning up database records...');

  // Null out payout_id references before deleting seller_payouts
  // (payout_id FK has no ON DELETE CASCADE so must be cleared first)
  await dbRun(
    'NULL payout_id in purchases (USER1 sales)',
    'UPDATE purchases SET payout_id = NULL WHERE seller_sub = $1',
    [user1Sub]
  );
  await dbRun(
    'NULL payout_id in auction_results (USER1 auctions)',
    `UPDATE auction_results SET payout_id = NULL
     WHERE auction_id IN (SELECT id FROM auctions WHERE seller_sub = $1)`,
    [user1Sub]
  );

  // Seller payouts
  await dbRun(
    'Delete seller_payouts (USER1)',
    'DELETE FROM seller_payouts WHERE seller_sub = $1',
    [user1Sub]
  );

  // Purchases — both where USER1 is seller and USER2 is buyer
  await dbRun(
    'Delete purchases (USER1 seller + USER2 buyer)',
    'DELETE FROM purchases WHERE seller_sub = $1 OR buyer_sub = $2',
    [user1Sub, user2Sub]
  );

  // Auction results (no CASCADE from auctions, must delete before auctions)
  await dbRun(
    'Delete auction_results (USER1 auctions)',
    'DELETE FROM auction_results WHERE auction_id IN (SELECT id FROM auctions WHERE seller_sub = $1)',
    [user1Sub]
  );

  // Auction notifications for both users
  await dbRun(
    'Delete auction_notifications (USER1 + USER2)',
    'DELETE FROM auction_notifications WHERE user_sub = $1 OR user_sub = $2',
    [user1Sub, user2Sub]
  );

  // Auctions — bids CASCADE automatically
  await dbRun(
    'Delete auctions (USER1)',
    'DELETE FROM auctions WHERE seller_sub = $1',
    [user1Sub]
  );

  // Gallery posts — posts_imgs and likes CASCADE automatically
  await dbRun(
    'Delete gallery_posts (USER1)',
    'DELETE FROM gallery_posts WHERE seller_sub = $1',
    [user1Sub]
  );

  // Quota tracking — product_sales CASCADE automatically
  if (user1CustomerId) {
    await dbRun(
      'Delete quota_tracking (USER1)',
      'DELETE FROM quota_tracking WHERE customer_id = $1',
      [user1CustomerId]
    );

    // Orders: delete test orders (order_numbers above 24 are test data;
    // seed orders 21-24 are kept as they are part of the base test setup)
    await dbRun(
      'Delete test orders (USER1, order_number > 24)',
      'DELETE FROM orders WHERE customer_id = $1 AND order_number > 24',
      [user1CustomerId]
    );
  }

  // Inventory snapshots
  await dbRun(
    'Delete inventory_snapshot (USER1)',
    'DELETE FROM inventory_snapshot WHERE user_sub = $1',
    [user1Sub]
  );

  // Image upload quota log
  await dbRun(
    'Delete image_uploads log (USER1 + USER2)',
    'DELETE FROM image_uploads WHERE user_sub = $1 OR user_sub = $2',
    [user1Sub, user2Sub]
  );

  // Conversations between USER1 and USER2 (messages/participants/visibility CASCADE)
  const { rows: convRows } = await pool.query(
    `SELECT cp1.conversation_id
     FROM conversation_participants cp1
     JOIN conversation_participants cp2
       ON cp1.conversation_id = cp2.conversation_id
     WHERE cp1.user_sub = $1 AND cp2.user_sub = $2`,
    [user1Sub, user2Sub]
  );
  const convIds = convRows.map((r) => r.conversation_id);
  if (convIds.length > 0) {
    await dbRun(
      `Delete conversations between USER1 and USER2 (${convIds.length} found)`,
      'DELETE FROM conversations WHERE id = ANY($1)',
      [convIds]
    );
  } else {
    console.log('  No conversations found between USER1 and USER2');
  }

  // Likes by test users on any posts (not already cascade-deleted)
  await dbRun(
    'Delete likes (USER1 + USER2)',
    'DELETE FROM likes WHERE sub = $1 OR sub = $2',
    [user1Sub, user2Sub]
  );

  // Followers involving test users
  await dbRun(
    'Delete followers (USER1 + USER2)',
    'DELETE FROM followers WHERE follower_id = $1 OR follower_id = $2 OR followed_id = $1 OR followed_id = $2',
    [user1Sub, user2Sub]
  );

  // --- S3 cleanup ---
  console.log('\n[3/5] Deleting S3 objects...');
  await deleteS3Objects(s3Keys);

  console.log('\n✅ E2E cleanup complete.');
  await pool.end();
}

cleanup().catch((e) => {
  console.error('Cleanup failed:', e.message);
  pool.end().finally(() => process.exit(1));
});
