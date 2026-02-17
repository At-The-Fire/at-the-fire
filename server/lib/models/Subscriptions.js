const pool = require('../utils/pool.js');

module.exports = class Subscriptions {
  customerId;
  subscriptionId;
  isActive;
  interval;
  subscriptionStartDate;
  subscriptionEndDate;
  trialStartDate;
  trialEndDate;
  status;

  constructor(row) {
    this.customerId = row.customer_id;
    this.subscriptionId = row.subscription_id;
    this.isActive = row.is_active;
    this.interval = row.interval;
    this.subscriptionStartDate = row.subscription_start_date;
    this.subscriptionEndDate = row.subscription_end_date;
    this.trialStartDate = row.trial_start_date;
    this.trialEndDate = row.trial_end_date;
    this.status = row.status;
  }

  static async insertSubscription(
    customerId,
    subscriptionId,
    isActive,
    interval,
    subscriptionStartDate,
    subscriptionEndDate,
    trialStartDate,
    trialEndDate,
    status
  ) {
    const { rows } = await pool.query(
      `
      INSERT INTO subscriptions (customer_id, subscription_id, is_active, interval, 
      subscription_start_date, subscription_end_date, trial_start_date, trial_end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        customerId,
        subscriptionId,
        isActive,
        interval,
        subscriptionStartDate,
        subscriptionEndDate,
        trialStartDate,
        trialEndDate,
        status,
      ]
    );
    return new Subscriptions(rows[0]);
  }

  static async getSubscriptionByCustomerId({ customerId }) {
    const { rows } = await pool.query(
      `SELECT *
      FROM subscriptions
      WHERE customer_id = $1`,
      [customerId]
    );

    if (rows.length === 0) {
      return null;
    }
    return new Subscriptions(rows[0]);
  }

  static async updateSubscription(
    customerId,
    subscriptionId,
    isActive,
    interval,
    subscriptionStartDate,
    subscriptionEndDate,
    trialStartDate,
    trialEndDate,
    status
  ) {
    const { rows } = await pool.query(
      `
      UPDATE subscriptions
      SET subscription_id = $2, is_active = $3,interval = $4, subscription_start_date = $5, subscription_end_date= $6,
      trial_start_date = $7, trial_end_date = $8, status = $9
      WHERE customer_id = $1
      RETURNING *
      `,
      [
        customerId,
        subscriptionId,
        isActive,
        interval,
        subscriptionStartDate,
        subscriptionEndDate,
        trialStartDate,
        trialEndDate,
        status,
      ]
    );
    return new Subscriptions(rows[0]);
  }

  static async cancelSubscriptionData(subscription_id, canceled_at, comment, feedback, reason) {
    const { rows } = await pool.query(
      `
      INSERT INTO cancellation_data (subscription_id, canceled_at, comment, feedback, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [subscription_id, canceled_at, comment, feedback, reason]
    );
    return new Subscriptions(rows[0]);
  }

  static async setStatusInactive(subscriptionId) {
    await pool.query(
      `
      UPDATE subscriptions
      SET is_active = false
      WHERE subscription_id = $1
      `,
      [subscriptionId]
    );

    return;
  }

  static async getAllSubscriptions() {
    const { rows } = await pool.query(
      `
  SELECT * FROM subscriptions
    `
    );
    if (!rows) {
      return null;
    }
    return rows.map((row) => new Subscriptions(row));
  }

  static async upsertSubscription(
    customerId,
    subscriptionId,
    isActive,
    interval,
    subscriptionStartDate,
    subscriptionEndDate,
    trialStartDate,
    trialEndDate,
    status
  ) {
    const { rows } = await pool.query(
      `
      INSERT INTO subscriptions (
        customer_id, subscription_id, is_active, interval, 
        subscription_start_date, subscription_end_date, trial_start_date, trial_end_date, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (customer_id) DO UPDATE SET
        subscription_id = EXCLUDED.subscription_id,
        is_active = EXCLUDED.is_active,
        interval = EXCLUDED.interval,
        subscription_start_date = EXCLUDED.subscription_start_date,
        subscription_end_date = EXCLUDED.subscription_end_date,
        trial_start_date = EXCLUDED.trial_start_date,
        trial_end_date = EXCLUDED.trial_end_date,
        status = EXCLUDED.status
      RETURNING *
      `,
      [
        customerId,
        subscriptionId,
        isActive,
        interval,
        subscriptionStartDate,
        subscriptionEndDate,
        trialStartDate,
        trialEndDate,
        status,
      ]
    );
    return new Subscriptions(rows[0]);
  }
};
