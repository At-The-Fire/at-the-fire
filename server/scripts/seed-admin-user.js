require('dotenv').config();
const pool = require('../lib/utils/pool');

async function run() {
  const cognitoRows = JSON.parse(process.env.DEV_ADMIN_COGNITO_USERS);
  const stripeRows = JSON.parse(process.env.DEV_ADMIN_STRIPE_CUSTOMERS);
  const subscriptionRows = JSON.parse(process.env.DEV_ADMIN_SUBSCRIPTION);
  const invoiceRows = JSON.parse(process.env.DEV_ADMIN_INVOICES);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const row of cognitoRows) {
      await client.query(
        `INSERT INTO cognito_users
          (sub, email, customer_id, image_url, public_id, first_name, last_name, bio, email_hash, social_media_links, accepted_tos_at, tos_version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (sub) DO NOTHING`,
        [
          row.sub,
          row.email,
          row.customer_id,
          row.image_url,
          row.public_id,
          row.first_name,
          row.last_name,
          row.bio,
          row.email_hash,
          row.social_media_links ? JSON.stringify(row.social_media_links) : null,
          row.accepted_tos_at,
          row.tos_version,
        ],
      );
      console.info(`cognito_users: upserted ${row.sub}`);
    }

    for (const row of stripeRows) {
      await client.query(
        `INSERT INTO stripe_customers
          (aws_sub, customer_id, email, name, phone, display_name, website_url, social_media_links, logo_image_url, logo_public_id, confirmed, email_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (customer_id) DO NOTHING`,
        [
          row.aws_sub,
          row.customer_id,
          row.email,
          row.name,
          row.phone,
          row.display_name,
          row.website_url,
          row.social_media_links ? JSON.stringify(row.social_media_links) : null,
          row.logo_image_url,
          row.logo_public_id,
          row.confirmed,
          row.email_hash,
        ],
      );
      console.info(`stripe_customers: upserted ${row.customer_id}`);
    }

    for (const row of subscriptionRows) {
      await client.query(
        `INSERT INTO subscriptions
          (customer_id, subscription_id, is_active, interval, subscription_start_date, subscription_end_date, trial_start_date, trial_end_date, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (subscription_id) DO NOTHING`,
        [
          row.customer_id,
          row.subscription_id,
          row.is_active,
          row.interval,
          row.subscription_start_date,
          row.subscription_end_date,
          row.trial_start_date,
          row.trial_end_date,
          row.status,
        ],
      );
      console.info(`subscriptions: upserted ${row.subscription_id}`);
    }

    for (const row of invoiceRows) {
      await client.query(
        `INSERT INTO invoices
          (customer_id, invoice_id, start_date, end_date, invoice_status, subscription_id, amount_due, amount_paid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (invoice_id) DO NOTHING`,
        [
          row.customer_id,
          row.invoice_id,
          row.start_date,
          row.end_date,
          row.invoice_status,
          row.subscription_id,
          row.amount_due,
          row.amount_paid,
        ],
      );
      console.info(`invoices: upserted ${row.invoice_id}`);
    }

    await client.query('COMMIT');
    console.info('Done.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
