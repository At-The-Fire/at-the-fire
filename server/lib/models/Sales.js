const pool = require('../utils/pool');

class Sales {
  constructor(row) {
    this.id = row.id;
    this.productId = row.product_id;
    this.quantitySold = row.quantity_sold;
    this.dateSold = row.date_sold;
  }

  static async updateSale(saleId, { quantitySold, dateSold }) {
    const { rows } = await pool.query(
      `
      UPDATE product_sales
      SET quantity_sold = $1,
          date_sold = $2
      WHERE id = $3
      RETURNING *
      `,
      [quantitySold, dateSold, saleId]
    );

    if (rows.length === 0) {
      return null;
    }

    return new Sales(rows[0]);
  }

  static async insertSale({ productId, quantitySold, dateSold, isSold }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert the sale
      const saleResult = await client.query(
        `INSERT INTO product_sales (product_id, quantity_sold, date_sold)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [productId, quantitySold, dateSold]
      );

      // Update the sold status
      await client.query(
        `
        UPDATE quota_tracking 
        SET sold = $1,
            date_sold = CASE WHEN $1 = true THEN $3 ELSE NULL END
        WHERE id = $2
        `,
        [isSold, productId, dateSold]
      );

      await client.query('COMMIT');
      return saleResult.rows.length ? new Sales(saleResult.rows[0]) : null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSalesByProductId(product_id) {
    const { rows } = await pool.query(
      `
      SELECT * FROM product_sales 
      WHERE product_id = $1 
      ORDER BY date_sold DESC
      `,
      [product_id]
    );
    return rows.map((row) => new Sales(row));
  }

  static async deleteSale(saleId) {
    const { rows } = await pool.query(
      `
      DELETE FROM product_sales WHERE id = $1 RETURNING *
      `,
      [saleId]
    );

    if (rows.length === 0) {
      return null;
    }
    return rows.length ? new Sales(rows[0]) : null;
  }
}

module.exports = Sales;
