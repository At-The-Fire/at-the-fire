const pool = require('../utils/pool');

module.exports = class Purchase {
  id;
  buyerSub;
  sellerCustomerId;
  itemType;
  itemId;
  quantity;
  amountPaid;
  processorTransactionId;
  status;
  createdAt;

  constructor(row) {
    this.id = row.id;
    this.buyerSub = row.buyer_sub;
    this.sellerCustomerId = row.seller_customer_id;
    this.itemType = row.item_type;
    this.itemId = row.item_id;
    this.quantity = row.quantity;
    this.amountPaid = row.amount_paid;
    this.processorTransactionId = row.processor_transaction_id;
    this.status = row.status;
    this.createdAt = row.created_at;
  }

  static async insert({ buyerSub, sellerCustomerId, itemType, itemId, quantity, amountPaid }) {
    const { rows } = await pool.query(
      `
      INSERT INTO purchases (buyer_sub, seller_customer_id, item_type, item_id, quantity, amount_paid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [buyerSub, sellerCustomerId, itemType, itemId, quantity, amountPaid],
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
      SELECT * FROM purchases
      WHERE buyer_sub = $1
      ORDER BY created_at DESC
      `,
      [sub],
    );

    return rows.map((row) => new Purchase(row));
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
};
