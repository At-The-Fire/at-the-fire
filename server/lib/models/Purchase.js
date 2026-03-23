const pool = require('../utils/pool');
const { encrypt, decrypt } = require('../services/encryption');

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
  platformFee;
  sellerNet;
  shippingAddress;
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
    this.platformFee = row.platform_fee ?? 0;
    this.sellerNet = row.seller_net ?? 0;
    this.title = row.title || null;
    this.imageUrls = null;
    const raw = row.shipping_address ? decrypt(row.shipping_address) : null;
    this.shippingAddress = raw ? JSON.parse(raw) : null;
  }

  // Insert a completed purchase within a transaction.
  // client must be provided (pool client mid-transaction).
  static async insertCompleted(
    { buyerSub, sellerSub, itemType, itemId, quantity, amountPaid, shippingCost, platformFee, sellerNet, processorTransactionId, shippingAddress },
    client
  ) {
    const encryptedAddress = shippingAddress ? encrypt(JSON.stringify(shippingAddress)) : null;
    const { rows } = await client.query(
      `INSERT INTO purchases
         (buyer_sub, seller_sub, item_type, item_id, quantity, amount_paid,
          shipping_cost, platform_fee, seller_net, processor_transaction_id, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed')
       RETURNING id`,
      [buyerSub, sellerSub, itemType, itemId, quantity, amountPaid,
       shippingCost, platformFee, sellerNet, processorTransactionId, encryptedAddress]
    );
    return rows[0];
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

    const imageMap = await Purchase.fetchImageMap(rows);
    return rows.map((row) => {
      const purchase = new Purchase(row);
      purchase.imageUrls = imageMap[row.item_id] ?? null;
      return purchase;
    });
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

    const imageMap = await Purchase.fetchImageMap(rows);
    return rows.map((row) => {
      const purchase = new Purchase(row);
      purchase.imageUrls = imageMap[row.item_id] ?? null;
      return purchase;
    });
  }

  // Fetches all posts_imgs rows for gallery_post purchases in one query,
  // returns a map of { [postId]: [url, ...] }
  static async fetchImageMap(rows) {
    const postIds = [
      ...new Set(
        rows
          .filter((row) => row.item_type === 'gallery_post' && row.item_id)
          .map((row) => row.item_id),
      ),
    ];

    if (!postIds.length) return {};

    const { rows: imgRows } = await pool.query(
      `
      SELECT post_id, image_url
      FROM posts_imgs
      WHERE post_id = ANY($1::bigint[])
      `,
      [postIds],
    );

    return imgRows.reduce((map, img) => {
      if (!map[img.post_id]) map[img.post_id] = [];
      map[img.post_id].push(img.image_url);
      return map;
    }, {});
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
