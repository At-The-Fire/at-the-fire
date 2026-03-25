const pool = require('../utils/pool');
const { decrypt } = require('../services/encryption');

module.exports = class Auction {
  id;
  title;
  description;
  imageUrls;
  startPrice;
  buyNowPrice;
  currentBid;
  startTime;
  endTime;
  isActive;
  sellerSub;
  sellerDisplayName;
  sellerLogoImageUrl;
  sellerFirstName;
  createdAt;
  updatedAt;
  winnerSub;
  finalBid;
  closedAt;
  closedReason;
  isPaid;
  trackingNumber;

  constructor(row) {
    this.id = row.id;
    this.title = row.title;
    this.description = row.description;
    this.imageUrls = row.image_urls;
    this.startPrice = row.start_price;
    this.buyNowPrice = row.buy_now_price;
    this.currentBid = row.current_bid;
    this.startTime = row.start_time;
    this.endTime = row.end_time;
    this.isActive = row.is_active;
    this.sellerSub = row.seller_sub;
    this.sellerDisplayName = row.seller_display_name ?? null;
    this.sellerLogoImageUrl = row.seller_logo_image_url ?? null;
    this.sellerFirstName = row.seller_first_name ?? null;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
    this.winnerSub = row.winner_sub ?? null;
    this.finalBid = row.final_bid ?? null;
    this.closedAt = row.closed_at ?? null;
    this.closedReason = row.closed_reason ?? null;
    this.isPaid = row.is_paid ?? null;
    this.trackingNumber = row.tracking_number ?? null;
    this.shippingCost = row.shipping_cost ?? 0;
  }

  static async insert({
    title,
    description,
    imageUrls = [],
    startPrice,
    buyNowPrice,
    currentBid,
    startTime,
    endTime,
    isActive = true,
    sellerSub,
    shippingCost = 0,
  }) {
    const { rows } = await pool.query(
      `
      INSERT INTO auctions (
        title,
        description,
        image_urls,
        start_price,
        buy_now_price,
        current_bid,
        start_time,
        end_time,
        is_active,
        seller_sub,
        shipping_cost
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        title,
        description,
        imageUrls,
        startPrice,
        buyNowPrice,
        currentBid,
        startTime,
        endTime,
        isActive,
        sellerSub,
        shippingCost || 0,
      ],
    );

    return new Auction(rows[0]);
  }

  static async getAllActive() {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM auctions
      ORDER BY end_time DESC
      `,
    );

    return rows.map((row) => new Auction(row));
  }

  static async getBySeller(sellerSub) {
    const { rows } = await pool.query(
      `
      SELECT a.*, ar.winner_sub, ar.final_bid, ar.closed_at, ar.closed_reason,
             ar.is_paid, ar.tracking_number, p.shipping_address
      FROM auctions a
      LEFT JOIN auction_results ar ON ar.auction_id = a.id
      LEFT JOIN purchases p ON p.item_type = 'auction' AND p.item_id = a.id
      WHERE a.seller_sub = $1
      ORDER BY a.end_time DESC
      `,
      [sellerSub],
    );
    return rows.map((row) => {
      const auction = new Auction(row);
      const raw = row.shipping_address ? decrypt(row.shipping_address) : null;
      auction.winnerShippingAddress = raw ? JSON.parse(raw) : null;
      return auction;
    });
  }

  static async getById(id) {
    const { rows } = await pool.query(
      `
      SELECT a.*,
        sc.display_name AS seller_display_name,
        sc.logo_image_url AS seller_logo_image_url,
        cu.first_name AS seller_first_name
      FROM auctions a
      LEFT JOIN cognito_users cu ON a.seller_sub = cu.sub
      LEFT JOIN stripe_customers sc ON cu.sub = sc.aws_sub
      WHERE a.id = $1
      `,
      [id],
    );

    if (!rows[0]) return null;
    return new Auction(rows[0]);
  }

  static async updateById(id, fields) {
    const current = await Auction.getById(id);
    if (!current) throw new Error('Auction not found');

    const updated = {
      title: fields.title ?? current.title,
      description: fields.description ?? current.description,
      imageUrls: fields.imageUrls ?? current.imageUrls,
      startPrice: fields.startPrice ?? current.startPrice,
      buyNowPrice: fields.buyNowPrice ?? current.buyNowPrice,
      currentBid: fields.currentBid ?? current.currentBid,
      startTime: fields.startTime ?? current.startTime,
      endTime: fields.endTime ?? current.endTime,
      isActive: fields.isActive ?? current.isActive,
      sellerSub: fields.sellerSub ?? current.sellerSub,
      shippingCost: fields.shippingCost ?? current.shippingCost ?? 0,
    };

    const { rows } = await pool.query(
      `
      UPDATE auctions
      SET
        title = $2,
        description = $3,
        image_urls = $4,
        start_price = $5,
        buy_now_price = $6,
        current_bid = $7,
        start_time = $8,
        end_time = $9,
        is_active = $10,
        seller_sub = $11,
        shipping_cost = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        updated.title,
        updated.description,
        updated.imageUrls,
        updated.startPrice,
        updated.buyNowPrice,
        updated.currentBid,
        updated.startTime,
        updated.endTime,
        updated.isActive,
        updated.sellerSub,
        updated.shippingCost,
      ],
    );

    return new Auction(rows[0]);
  }

  // Deletes auction_results first, then the auction, in a transaction
  static async deleteAuctionAndResultsById(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete auction_results first
      await client.query(
        `
        DELETE FROM auction_results
        WHERE auction_id = $1
        `,
        [id],
      );

      // Delete the auction
      const { rows } = await client.query(
        `
        DELETE FROM auctions
        WHERE id = $1
        RETURNING *
        `,
        [id],
      );

      await client.query('COMMIT');
      if (!rows[0]) return null;
      return new Auction(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Accept an optional client to allow callers to manage transactions across multiple models.
  // If no client is provided, this method will create its own client and manage the transaction.
  static async closeAuction({ auctionId, winnerSub, finalBid, closedReason }, client = null) {
    let localClient = client;
    let createdClient = false;

    if (!localClient) {
      localClient = await pool.connect();
      createdClient = true;
      await localClient.query('BEGIN');
    }

    try {
      await localClient.query(
        `
      UPDATE auctions
      SET is_active = false
      WHERE id = $1
      RETURNING *;
      `,
        [auctionId],
      );

      const { rows } = await localClient.query(
        `
      INSERT INTO auction_results (auction_id, winner_sub, final_bid, closed_reason)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
      `,
        [auctionId, winnerSub, finalBid, closedReason],
      );

      if (createdClient) {
        await localClient.query('COMMIT');
      }

      return rows[0];
    } catch (err) {
      if (createdClient) {
        await localClient.query('ROLLBACK');
      }
      throw err;
    } finally {
      if (createdClient) {
        localClient.release();
      }
    }
  }

  // Fetch the data needed to validate and price an auction payment.
  static async getResultForPayment(auctionId) {
    const { rows } = await pool.query(
      `SELECT a.shipping_cost, a.seller_sub, ar.final_bid, ar.winner_sub, ar.is_paid
       FROM auction_results ar
       JOIN auctions a ON a.id = ar.auction_id
       WHERE ar.auction_id = $1`,
      [auctionId]
    );
    return rows[0] || null;
  }

  // Atomically mark auction_results as paid and record fee amounts.
  // Idempotency guard: WHERE is_paid = FALSE prevents double-payment.
  // Returns the updated row, or null if blocked (already paid or not found).
  static async setIsPaidWithFees(auctionId, buyerSub, { platformFee, sellerNet }, client) {
    const { rows } = await client.query(
      `UPDATE auction_results
       SET is_paid = TRUE, platform_fee = $2, seller_net = $3
       WHERE auction_id = $1 AND winner_sub = $4 AND is_paid = FALSE
       RETURNING *`,
      [auctionId, platformFee, sellerNet, buyerSub]
    );
    return rows[0] || null;
  }

  static async getUserAuctionWins(sub) {
    const { rows } = await pool.query(
      `
SELECT ar.*, a.title, a.image_urls, a.buy_now_price, a.shipping_cost
FROM auction_results ar
JOIN auctions a ON ar.auction_id = a.id
WHERE ar.winner_sub = $1
ORDER BY ar.closed_at DESC

    `,
      [sub],
    );

    return rows.map((r) => ({
      id: r.id,
      auctionId: r.auction_id,
      winnerSub: r.winner_sub,
      finalBid: Number(r.final_bid),
      closedAt: r.closed_at,
      closedReason: r.closed_reason,
      isPaid: r.is_paid === true,
      title: r.title,
      imageUrls: r.image_urls,
      buyNowPrice: r.buy_now_price,
      shippingCost: Number(r.shipping_cost ?? 0),
      trackingNumber: r.tracking_number,
    }));
  }

  static async getAllForAdmin() {
    const { rows } = await pool.query(
      `
    SELECT
      a.*,
      ar.is_paid,
      ar.tracking_number
    FROM auctions a
    LEFT JOIN auction_results ar
      ON ar.auction_id = a.id
    ORDER BY a.end_time DESC
    `,
    );

    return rows.map((row) => new Auction(row));
  }

  static async updateTrackingNumber(auctionId, trackingNumber) {
    const { rows } = await pool.query(
      `
    UPDATE auction_results
    SET tracking_number = $2
    WHERE auction_id = $1
    RETURNING *
    `,
      [auctionId, trackingNumber],
    );

    if (!rows[0]) throw new Error('Auction result not found');
    return rows[0];
  }

  static async getAuctionResults(auctionId) {
    const { rows } = await pool.query(
      `
      SELECT ar.closed_reason, ar.winner_sub, cu.first_name, cu.image_url
      FROM auction_results ar
      JOIN cognito_users cu ON ar.winner_sub = cu.sub
      WHERE ar.auction_id = $1
      `,
      [auctionId],
    );

    if (!rows[0]) return null;

    const reason = rows[0].closed_reason;
    const profile = {
      firstName: rows[0].first_name,
      imageUrl: rows[0].image_url,
    };

    return { reason, profile };
  }
};
