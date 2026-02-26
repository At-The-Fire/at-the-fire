const pool = require('../utils/pool');

module.exports = class Bid {
  id;
  auctionId;
  bidderSub;
  bidAmount;
  createdAt;
  updatedAt;

  constructor(row) {
    this.id = row.id;
    this.auctionId = row.auction_id;
    this.bidderSub = row.bidder_sub;
    this.bidAmount = row.bid_amount;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }

  // Accept an optional client so this can participate in an external transaction.
  // If no client is provided, fall back to the pool.
  static async insert({ auctionId, bidderSub, bidAmount }, client = null) {
    const runner = client || pool;
    const { rows } = await runner.query(
      `
      INSERT INTO bids (auction_id, bidder_sub, bid_amount)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [auctionId, bidderSub, bidAmount],
    );

    if (!rows[0]) return null;
    return new Bid(rows[0]);
  }

  static async getByAuctionId(auctionId) {
    const { rows } = await pool.query(
      `
      SELECT * FROM bids
      WHERE auction_id = $1
      ORDER BY bid_amount DESC, created_at ASC
      `,
      [auctionId],
    );

    if (!rows.length) return [];
    return rows.map((row) => new Bid(row));
  }

  static async getHighestBid(auctionId) {
    const { rows } = await pool.query(
      `
      SELECT * FROM bids
      WHERE auction_id = $1
      ORDER BY bid_amount DESC, created_at ASC
      LIMIT 1
      `,
      [auctionId],
    );

    if (!rows[0]) return null;
    return new Bid(rows[0]);
  }

  static async getByUserSub(sub) {
    const { rows } = await pool.query(
      `
      SELECT b.*, a.title, a.image_urls, a.end_time, a.current_bid, a.is_active
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.bidder_sub = $1 AND a.is_active = true
      ORDER BY b.created_at DESC
      `,
      [sub],
    );

    if (!rows.length) return [];
    return rows.map((row) => ({
      ...new Bid(row),
      title: row.title,
      imageUrls: row.image_urls,
      endTime: row.end_time,
      currentBid: row.current_bid ? Number(row.current_bid) : null,
      isActive: row.is_active,
    }));
  }

  static async deleteByAuctionId(auctionId) {
    const { rows } = await pool.query(
      `
      DELETE FROM bids
      WHERE auction_id = $1
      RETURNING *
      `,
      [auctionId],
    );

    if (!rows.length) return [];
    return rows.map((row) => new Bid(row));
  }
};
