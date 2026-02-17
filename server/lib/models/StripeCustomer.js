const pool = require('../utils/pool');
const { encrypt, decrypt } = require('../services/encryption.js');

module.exports = class StripeCustomer {
  customerId;
  awsSub;
  name;
  email;
  phone;
  displayName;
  websiteUrl;
  logoImageUrl;
  logoPublicId;
  confirmed;
  emailHash;

  constructor(row) {
    this.customerId = row.customer_id;
    this.awsSub = row.aws_sub;
    // this.name = decrypt(row.name); //! remove encryption for search
    this.name = row.name;
    this.email = decrypt(row.email);
    this.phone = decrypt(row.phone);
    this.displayName = row.display_name;
    this.websiteUrl = row.website_url;
    this.logoImageUrl = row.logo_image_url;
    this.logoPublicId = row.logo_public_id;
    this.confirmed = row.confirmed;
    this.emailHash = row.email_hash;
  }

  static async insertNewStripeCustomer(customerId, awsSub, name, email, phone) {
    const { rows } = await pool.query(
      `
      INSERT INTO stripe_customers (customer_id, aws_sub, name, email, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [customerId, awsSub, name, email, encrypt(phone)]
    );

    return new StripeCustomer(rows[0]);
  }

  static async insertNewStripeCustomerAndAwsUser(customerId, awsSub, name, email, phone) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update the Subscriptions table
      await client.query(
        `
        INSERT INTO stripe_customers (customer_id, aws_sub, name, email, phone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
        [customerId, awsSub, name, encrypt(email), encrypt(phone)]
      );

      // Update the Users table (assuming there's a field isActive in users table)
      await client.query(
        `
        UPDATE cognito_users
        SET customer_id = $1
        WHERE sub = $2
      `,
        [customerId, awsSub]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async getStripeByCustomerId(customerId) {
    const { rows } = await pool.query(
      `
      SELECT * FROM stripe_customers
      WHERE customer_id = $1
      `,
      [customerId]
    );
    if (!rows[0]) return null;
    return new StripeCustomer(rows[0]);
  }

  static async getStripeByAWSSub(awsSub) {
    const { rows } = await pool.query(
      `
      SELECT * FROM stripe_customers
      WHERE aws_sub = $1
      `,
      [awsSub]
    );

    if (!rows[0]) return null;
    return new StripeCustomer(rows[0]);
  }

  static async updateByCustomerId(customerId, newAttrs) {
    const stripe = await StripeCustomer.getStripeByCustomerId(customerId);

    if (!stripe) return null;
    const { name, email, phone, displayName, websiteUrl, logoImageUrl, logoPublicId } = {
      ...stripe,
      ...newAttrs,
    };
    const { rows } = await pool.query(
      `
      UPDATE stripe_customers
      SET name = $2, email = $3, phone = $4, display_name = $5, website_url = $6, logo_image_url = $7, logo_public_id = $8
      WHERE customer_id = $1
      RETURNING *
      `,
      [
        customerId,
        name,
        encrypt(email),
        encrypt(phone),
        displayName,
        websiteUrl,
        logoImageUrl ? logoImageUrl : null,
        logoPublicId,
      ]
    );

    return new StripeCustomer(rows[0]);
  }

  static async updateCustomerConfirmedStatus(customerId, confirmed) {
    const { rows } = await pool.query(
      `
      UPDATE stripe_customers
      SET confirmed = $2
      WHERE customer_id = $1
      RETURNING *
      `,
      [customerId, confirmed]
    );

    if (!rows[0]) return null;
    return new StripeCustomer(rows[0]);
  }

  static async deleteCustomerData(sub) {
    const { rows } = await pool.query(
      `
    DELETE from stripe_customers
    WHERE aws_sub = $1
    RETURNING *
    `,
      [sub]
    );
    return new StripeCustomer(rows[0]);
  }

  static async getAllCustomers() {
    const { rows } = await pool.query(
      `
      SELECT * FROM stripe_customers
      `
    );

    if (!rows) {
      return null;
    }
    return rows.map((row) => new StripeCustomer(row));
  }

  // TODO
  //! Need to add "ON DELETE CASCADE" for schema-> customer_id foreign keys, this is good for now
  //! ultimately needs to detect posts-> images-> delete from S3 before database...

  static async deleteSubscriber(sub) {
    const data = await StripeCustomer.getStripeByAWSSub(sub);

    if (!data) {
      return null;
    }

    const customerId = data.customerId;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM image_uploads WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM quota_tracking WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM quota_goals WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM orders WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM inventory_snapshot WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM subscriptions WHERE customer_id = $1', [customerId]);
      await client.query('DELETE FROM invoices WHERE customer_id = $1', [customerId]);
      //^ need to add these to the schema- from autocomplete, need full investigation and testing (as above still), image deletion...
      // await client.query('DELETE FROM followers WHERE customer_id = $1', [customerId]);
      // await client.query('DELETE FROM posts WHERE customer_id = $1', [customerId]);
      // await client.query('DELETE FROM comments WHERE customer_id = $1', [customerId]);
      // await client.query('DELETE FROM likes WHERE customer_id = $1', [customerId]);
      const result = await client.query(
        'DELETE FROM stripe_customers WHERE customer_id = $1 RETURNING *',
        [customerId]
      );

      await client.query('COMMIT');

      if (!result.rows.length) {
        // Handle the case where no rows were deleted
        return null;
      }

      return new StripeCustomer(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
