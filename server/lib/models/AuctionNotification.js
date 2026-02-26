const pool = require('../utils/pool');

module.exports = class AuctionNotification {
  id;
  userSub;
  auctionId;
  type;
  createdAt;
  isRead;

  constructor(row) {
    this.id = row.id;
    this.userSub = row.user_sub;
    this.auctionId = row.auction_id;
    this.type = row.type;
    this.createdAt = row.created_at;
    this.isRead = row.is_read;
  }

  static async insert({ userSub, auctionId, type }) {
    const { rows } = await pool.query(
      `
      INSERT INTO auction_notifications (user_sub, auction_id, type)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [userSub, auctionId, type],
    );

    if (!rows[0]) return null;
    return new AuctionNotification(rows[0]);
  }

  static async getUnreadByUserSub(userSub) {
    const { rows } = await pool.query(
      `
      SELECT * FROM auction_notifications
      WHERE user_sub = $1 AND is_read = false
      ORDER BY created_at DESC, id DESC
      `,
      [userSub],
    );

    if (!rows.length) return [];
    return rows.map((row) => new AuctionNotification(row));
  }

  static async markAsRead(userSub) {
    const { rows } = await pool.query(
      `
      UPDATE auction_notifications
      SET is_read = true
      WHERE user_sub = $1
      RETURNING *
      `,
      [userSub],
    );

    if (!rows.length) return [];
    return rows.map((row) => new AuctionNotification(row));
  }
};
