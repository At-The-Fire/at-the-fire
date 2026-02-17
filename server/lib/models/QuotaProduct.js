const pool = require('../utils/pool');
const { encrypt, decrypt } = require('../services/encryption.js');
// const { enc } = require('crypto-js');
// const { encrypt } = require('../creator-gallery-be/lib/services/encryption.js');

module.exports = class QuotaProduct {
  id;
  created_at;
  type;
  date;
  title;
  description;
  category;
  price;
  image_url;
  public_id;
  customer_id;
  num_days;
  post_id;
  sold;
  date_sold;
  qty;

  constructor(row) {
    this.id = row.id;
    this.created_at = row.created_at;
    this.type = row.type ? decrypt(row.type) : null;
    this.date = row.date;
    this.title = row.title ? decrypt(row.title) : null;
    this.description = row.description ? decrypt(row.description) : null;
    this.category = row.category ? decrypt(row.category) : null;
    this.price = row.price ? decrypt(row.price) : null;
    this.image_url = row.image_url ? decrypt(row.image_url) : null;
    this.public_id = row.public_id ? decrypt(row.public_id) : null;
    this.customer_id = row.customer_id; // primary key
    this.num_days = row.num_days;
    this.post_id = row.post_id;
    // this.sold = row.sold ? decrypt(row.sold) : null;
    this.sold = row.sold;
    this.date_sold = row.date_sold;
    this.qty = row.qty;
  }

  static async getQuotaProducts(customerId) {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM quota_tracking
      WHERE customer_id=$1
      ORDER BY date DESC, id ASC
      `,
      [customerId]
    );

    if (rows.length === 0) {
      return [];
    }

    return rows.map((row) => new QuotaProduct(row));
  }

  static async getQuotaProductById(id) {
    const { rows } = await pool.query(
      `
      SELECT * FROM quota_tracking
      WHERE id=$1
      `,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return new QuotaProduct(rows[0]);
  }

  static async insertNewProduct({
    type,
    date,
    title,
    description,
    category,
    price,
    image_url,
    public_id,
    customer_id,
    num_days,
    post_id,
    sold,
    date_sold,
    qty,
  }) {
    const { rows } = await pool.query(
      `
      INSERT INTO quota_tracking (type, date, title, description, category, price, image_url, public_id, customer_id,num_days, post_id, sold, date_sold, qty) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12,$13,$14) 
      RETURNING *
      `,
      [
        encrypt(type),
        date,
        encrypt(title),
        encrypt(description),
        encrypt(category),
        encrypt(price),
        encrypt(image_url),
        encrypt(public_id),
        customer_id,
        num_days,
        post_id,
        // encrypt(sold),
        sold,
        date_sold,
        qty,
      ]
    );

    return new QuotaProduct(rows[0]);
  }

  static async updateProduct(
    {
      type,
      date,
      title,
      description,
      category,
      price,
      image_url,
      public_id,
      num_days,
      post_id,
      sold,
      date_sold,
      qty,
    },
    id,
    customer_id
  ) {
    const { rows } = await pool.query(
      `
      UPDATE quota_tracking
      SET type=$1,
          date=$2,
          title=$3,
          description=$4,
          category=$5,
          price=$6,
          image_url=$7,
          public_id=$8,
          customer_id=$9,
          num_days=$10,
          post_id=$11,
          sold=$12,
          date_sold=$13,
          qty=$14
      WHERE id=$15
      RETURNING *
      
      `,
      [
        encrypt(type),
        date,
        encrypt(title),
        encrypt(description),
        encrypt(category),
        encrypt(price),
        encrypt(image_url),
        encrypt(public_id),
        customer_id,
        num_days,
        post_id,
        sold,
        date_sold,
        qty,
        id,
      ]
    );

    if (rows.length === 0) {
      return null;
    }

    return new QuotaProduct(rows[0]);
  }

  static async deleteProduct(id) {
    const { rows } = await pool.query(
      `
      DELETE FROM quota_tracking
      WHERE id=$1
      RETURNING *
      `,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return new QuotaProduct(rows[0]);
  }

  static async updateProductSales({ quantity_sold, date_sold, product_id }) {
    const { rows } = await pool.query(
      `
      INSERT INTO product_sales (quantity_sold, date_sold, product_id)    
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [quantity_sold, date_sold, product_id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  static async getSalesTotal(product_id) {
    const { rows } = await pool.query(
      `
      SELECT COALESCE(SUM(quantity_sold),0) AS total FROM product_sales WHERE product_id=$1
      `,
      [product_id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].total;
  }
};
