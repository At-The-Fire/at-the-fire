const pool = require('../utils/pool');

module.exports = class QuotaGoal {
  id;
  created_at;
  monthly_quota;
  work_days;
  customer_id;

  constructor(row) {
    this.id = row.id;
    this.created_at = row.created_at;
    this.monthly_quota = row.monthly_quota;
    this.work_days = row.work_days;
    this.customer_id = row.customer_id;
  }
  static async getQuotaGoals(customerId) {
    const { rows } = await pool.query(
      `
    SELECT * FROM quota_goals 
    WHERE customer_id=$1 
        `,
      [customerId]
    );

    return rows.map((row) => new QuotaGoal(row));
  }

  static async editQuotaGoals(customerId, { quotaData }) {
    const { monthly_quota, work_days } = quotaData;

    const result = await pool.query(
      `
      INSERT INTO quota_goals (customer_id, monthly_quota, work_days)
      VALUES ($1, $2, $3)
      ON CONFLICT (customer_id) 
      DO UPDATE SET monthly_quota = EXCLUDED.monthly_quota, work_days = EXCLUDED.work_days
      RETURNING *
      `,
      [customerId, monthly_quota, work_days]
    );

    return result.rows.map((row) => new QuotaGoal(row));
  }
};
