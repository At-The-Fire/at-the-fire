const pool = require('../utils/pool');

module.exports = class WebhookEvent {
  id;
  event_id;
  event_type;
  created_at;

  constructor(row) {
    this.id = row.id;
    this.event_id = row.event_id;
    this.event_type = row.event_type;
    this.created_at = row.created_at;
  }

  static async insert({ event_id, event_type }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO webhook_events (event_id, event_type) 
         VALUES ($1, $2) 
         RETURNING *`,
        [event_id, event_type]
      );
      return new WebhookEvent(rows[0]);
    } catch (error) {
      // If we get a unique constraint error, it means this is a duplicate
      if (error.code === '23505') {
        // Postgres unique violation code
        return null;
      }
      throw error;
    }
  }
};
