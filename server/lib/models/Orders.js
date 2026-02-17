const pool = require('../utils/pool.js');

module.exports = class Orders {
  id;
  customerId;
  created_at;
  order_number;
  date;
  is_fulfilled;
  client_name;
  items;
  shipping;

  constructor(row) {
    this.id = row.id;
    this.customerId = row.customer_id;
    this.created_at = row.created_at;
    this.order_number = row.order_number;
    this.date = row.date;
    this.is_fulfilled = row.is_fulfilled;
    this.client_name = row.client_name;
    this.items = row.items;
    this.shipping = row.shipping;
  }

  static async getOrders(customerId) {
    const { rows } = await pool.query(
      `
SELECT * FROM orders
WHERE customer_id = $1
ORDER BY date DESC
`,
      [customerId]
    );

    return rows.map((row) => new Orders(row));
  }

  static async insertNewOrder({
    customerId,
    order_number,
    date,
    client_name,
    items,
    shipping,
  }) {
    const { rows } = await pool.query(
      `
INSERT INTO orders (customer_id, order_number, date, client_name, items, shipping)
VALUES ($1, $2, $3, $4, $5, $6)

RETURNING *
`,
      [customerId, order_number, date, client_name, items, shipping]
    );

    return new Orders(rows[0]);
  }

  static async getOrderById(orderId) {
    const { rows } = await pool.query(
      ` 
SELECT * FROM orders
WHERE id = $1
`,
      [orderId]
    );

    if (rows.length === 0) {
      return null;
    }

    return new Orders(rows[0]);
  }

  static async editOrder(orderId, customerId, orderData) {
    const { order_number, date, client_name, items, shipping } = orderData;

    const { rows } = await pool.query(
      `
      UPDATE orders
      SET order_number = $2, date = $3, client_name = $4, items = $5, shipping = $6
      WHERE id = $1 AND customer_id = $7
      RETURNING *
      `,
      [orderId, order_number, date, client_name, items, shipping, customerId]
    );

    if (rows.length === 0) {
      throw new Error('Order not found or access denied');
    }

    return new Orders(rows[0]);
  }

  static async updateFulfillment(orderId, customerId, fulfillment) {
    const { rows } = await pool.query(
      `
    UPDATE orders
    SET is_fulfilled = $3
    WHERE id = $1 AND customer_id = $2
    RETURNING *
    `,
      [orderId, customerId, fulfillment]
    );

    if (rows.length === 0) {
      throw new Error('Order not found or access denied');
    }

    return new Orders(rows[0]);
  }

  static async deleteOrder(orderId, customerId) {
    const { rowCount } = await pool.query(
      `
      DELETE FROM orders
      WHERE id = $1 AND customer_id = $2
      `,
      [orderId, customerId]
    );

    if (rowCount === 0) {
      throw new Error('Order not found or access denied');
    }

    return { message: 'Order successfully deleted' };
  }
};
