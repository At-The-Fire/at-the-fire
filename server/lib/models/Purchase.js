const pool = require('../utils/pool');
const Post = require('./Post');

module.exports = class Purchase {
  id;
  buyerSub;
  sellerSub;
  itemType;
  itemId;
  quantity;
  amountPaid;
  processorTransactionId;
  status;
  trackingNumber;
  shippedAt;
  createdAt;
  // Optional join fields
  title;
  imageUrls;

  constructor(row) {
    this.id = row.id;
    this.buyerSub = row.buyer_sub;
    this.sellerSub = row.seller_sub;
    this.itemType = row.item_type;
    this.itemId = row.item_id;
    this.quantity = row.quantity;
    this.amountPaid = row.amount_paid;
    this.processorTransactionId = row.processor_transaction_id;
    this.status = row.status;
    this.trackingNumber = row.tracking_number || null;
    this.shippedAt = row.shipped_at || null;
    this.createdAt = row.created_at;
    this.shippingCost = row.shipping_cost ?? 0;
    this.title = row.title || null;
    this.imageUrls = null;
  }

  static async insert({ buyerSub, sellerSub, itemType, itemId, quantity, amountPaid }) {
    const { rows } = await pool.query(
      `
      INSERT INTO purchases (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [buyerSub, sellerSub, itemType, itemId, quantity, amountPaid],
    );

    return new Purchase(rows[0]);
  }

  static async getById(id) {
    const { rows } = await pool.query(
      `
      SELECT * FROM purchases
      WHERE id = $1
      `,
      [id],
    );

    if (!rows[0]) return null;
    return new Purchase(rows[0]);
  }

  static async getByBuyerSub(sub) {
    const { rows } = await pool.query(
      `
      SELECT p.*, gp.title
      FROM purchases p
      LEFT JOIN gallery_posts gp ON p.item_type = 'gallery_post' AND p.item_id = gp.id
      WHERE p.buyer_sub = $1
      ORDER BY p.created_at DESC
      `,
      [sub],
    );

    const purchases = await Promise.all(
      rows.map(async (row) => {
        const purchase = new Purchase(row);
        if (row.item_type === 'gallery_post' && row.item_id) {
          const imgs = await Post.getAdditionalImages(row.item_id);
          purchase.imageUrls = imgs.map((i) => i.image_url);
        }
        return purchase;
      }),
    );

    return purchases;
  }

  static async updateStatus(id, status) {
    const { rows } = await pool.query(
      `
      UPDATE purchases
      SET status = $2
      WHERE id = $1
      RETURNING *
      `,
      [id, status],
    );

    if (!rows[0]) throw new Error('Purchase not found');
    return new Purchase(rows[0]);
  }

  static async updateTransactionId(id, processorTransactionId) {
    const { rows } = await pool.query(
      `
      UPDATE purchases
      SET processor_transaction_id = $2
      WHERE id = $1
      RETURNING *
      `,
      [id, processorTransactionId],
    );

    if (!rows[0]) throw new Error('Purchase not found');
    return new Purchase(rows[0]);
  }

  static async getBySellerSub(sub) {
    const { rows } = await pool.query(
      `
      SELECT p.*, gp.title
      FROM purchases p
      LEFT JOIN gallery_posts gp ON p.item_type = 'gallery_post' AND p.item_id = gp.id
      WHERE p.seller_sub = $1
      ORDER BY p.created_at DESC
      `,
      [sub],
    );

    return Promise.all(
      rows.map(async (row) => {
        const purchase = new Purchase(row);
        if (row.item_type === 'gallery_post' && row.item_id) {
          const imgs = await Post.getAdditionalImages(row.item_id);
          purchase.imageUrls = imgs.map((i) => i.image_url);
        }
        return purchase;
      }),
    );
  }

  static async updateTracking(id, trackingNumber) {
    const { rows } = await pool.query(
      `
      UPDATE purchases
      SET tracking_number = $2, shipped_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, trackingNumber],
    );

    if (!rows[0]) throw new Error('Purchase not found');
    return new Purchase(rows[0]);
  }
};
