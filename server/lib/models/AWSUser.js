const pool = require('../utils/pool');
const Post = require('./Post.js');
const { encrypt, decrypt } = require('../services/encryption.js');
const crypto = require('crypto');

module.exports = class AWSUser {
  id;
  sub;
  email;
  customerId;
  createdAt;
  imageUrl;
  publicId;
  firstName;
  lastName;
  bio;
  emailHash;
  socialMediaLinks;
  displayName;

  constructor(row) {
    this.id = row.id;
    this.sub = row.sub;
    this.email = row.email ? decrypt(row.email) : null;
    // this.email = row.email;
    this.customerId = row.customer_id;
    this.createdAt = row.created_at;
    this.imageUrl = row.image_url;
    this.publicId = row.public_id;
    // this.firstName = row.first_name ? decrypt(row.first_name) : null; //! remove encryption for search
    this.firstName = row.first_name;
    // this.lastName = row.last_name ? decrypt(row.last_name) : null; //! remove encryption for search
    this.lastName = row.last_name;
    this.bio = row.bio;
    this.emailHash = row.email_hash;
    this.socialMediaLinks = row.social_media_links;
    this.displayName = row.display_name;
  }

  // email hashing functions
  static hashEmail(email) {
    return crypto.createHash('sha256').update(email).digest('hex');
  }

  static async emailExists(email) {
    const { rows } = await pool.query(
      'SELECT 1 FROM cognito_users WHERE email_hash = $1',
      [this.hashEmail(email)]
    );
    return rows.length > 0;
  }

  static async insertAWS({ sub, email }) {
    if (await this.emailExists(email)) {
      throw new Error(
        'duplicate key value violates unique constraint "cognito_users_email_key"'
      );
    }
    const { rows } = await pool.query(
      `
INSERT INTO cognito_users (sub, email, email_hash)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [sub, encrypt(email), this.hashEmail(email)]
    );

    return new AWSUser(rows[0]);
  }

  static async getCognitoUserBySub({ sub }) {
    const { rows } = await pool.query(
      `
		SELECT * FROM cognito_users
		WHERE sub = $1
	`,
      [sub]
    );

    // If the query returns no results, throw a specific error
    if (rows.length === 0) {
      return null;
    }

    return new AWSUser(rows[0]);
    // return rows[0];
  }

  static async getGalleryPosts(customer_id) {
    const { rows } = await pool.query(
      `
    SELECT * FROM gallery_posts
    WHERE customer_id=$1
    ORDER BY created_at DESC;
    
  `,
      [customer_id]
    );
    return rows.map((row) => new Post(row));
  }

  static async updateCognitoUserBySub(
    { sub },
    { firstName, lastName, bio, socialMediaLinks, imageUrl, publicId }
  ) {
    const { rows } = await pool.query(
      `
    UPDATE cognito_users
    SET first_name=$1, last_name=$2, bio=$3, social_media_links=$4, image_url=$5, public_id=$6
    WHERE sub=$7
    RETURNING *;
  `,
      [
        // encrypt(firstName),
        // encrypt(lastName),
        firstName,
        lastName,
        bio,
        socialMediaLinks,
        imageUrl,
        publicId,
        sub,
      ]
    );

    if (rows.length === 0) {
      throw new Error('User not found');
    } else {
      return new AWSUser(rows[0]);
    }
    // return new AWSUser(rows[0]);
  }

  static async deleteCustomerId(sub) {
    const { rows } = await pool.query(
      `
    UPDATE cognito_users
    SET customer_id = null
    WHERE sub = $1
    RETURNING *;
  `,
      [sub]
    );

    return new AWSUser(rows[0]);
  }

  static async getEmailBySub({ sub }) {
    const { rows } = await pool.query(
      `
    SELECT email FROM cognito_users
    WHERE sub = $1
  `,
      [sub]
    );

    return rows[0];
  }

  static async getAllUsers() {
    const { rows } = await pool.query(
      `
      SELECT * FROM cognito_users
      `
    );

    if (!rows) {
      return null;
    }
    return rows.map((row) => new AWSUser(row));
  }

  static async deleteUser(sub) {
    const data = await AWSUser.getCognitoUserBySub({ sub });
    if (!data) {
      return null;
    }
    const { rows } = await pool.query(
      `
    DELETE from cognito_users
    WHERE sub = $1
    RETURNING *
    `,
      [sub]
    );

    return new AWSUser(rows[0]);
  }

  static async checkAndRecordImageUploads(customerId, imageCount) {
    const recentUploads = await pool.query(
      `SELECT SUM(image_count) 
      FROM image_uploads 
      WHERE customer_id = $1 
      AND created_at > NOW() - INTERVAL '24 hours'`,
      [customerId]
    );

    const existingCount = parseInt(recentUploads.rows[0].sum) || 0;

    if (existingCount + imageCount > 100) {
      throw new Error('Daily upload limit of 50 images exceeded');
    }

    await pool.query(
      `INSERT INTO image_uploads (customer_id, image_count)
      VALUES ($1, $2)`,
      [customerId, imageCount]
    );

    return true;
  }

  static async searchUsers(searchTerm) {
    const { rows } = await pool.query(
      `
      SELECT *
FROM (
  -- Query A: Cognito users without a Stripe record
  SELECT 
    c.id, 
    c.first_name, 
    c.last_name,
    c.sub,                         -- Added: include cognito_users.sub
    NULL::text AS display_name,
    'cognito' AS source
  FROM cognito_users c
  WHERE (c.first_name ILIKE $1 OR c.last_name ILIKE $1)
    AND NOT EXISTS (
      SELECT 1 
      FROM stripe_customers s 
      WHERE s.aws_sub = c.sub
    )
  
  UNION ALL
  
  -- Query B: Users with a Stripe record (using DISTINCT ON)
  SELECT  
  id, 
  first_name, 
  last_name, 
  sub,
  display_name, 
  source
  FROM (
    SELECT DISTINCT ON (c.sub)
		c.id,
    COALESCE(s.name, c.first_name) AS first_name,
    CASE WHEN s.name IS NULL THEN c.last_name ELSE '' END AS last_name,
    c.sub,  -- Move this to the 4th position so it matches Query A
    s.display_name,
    'stripe' AS source
    FROM cognito_users c
    LEFT JOIN stripe_customers s ON s.aws_sub = c.sub
    WHERE (c.first_name ILIKE $1 
           OR c.last_name ILIKE $1 
           OR s.name ILIKE $1
           OR s.display_name ILIKE $1)
      AND s.aws_sub IS NOT NULL  -- Only include users with a stripe record
    ORDER BY c.sub, (CASE WHEN s.aws_sub IS NOT NULL THEN 0 ELSE 1 END)
  ) AS stripe_sub
) AS combined
LIMIT 10;
      `,
      [`%${searchTerm}%`]
    );

    if (!rows) {
      return [];
    }
    return rows.map((row) => new AWSUser(row));
  }
};
