const pool = require('../utils/pool');

module.exports = class Gallery {
  id;
  created_at;
  title;
  description;
  image_url;
  category;
  price;
  seller_sub;
  public_id;
  num_imgs;
  quantity;
  shipping_cost;
  display_name;
  logo_image_url;
  sub;
  sold;

  constructor(row) {
    this.id = row.id;
    this.created_at = row.created_at;
    this.title = row.title;
    this.description = row.description;
    this.image_url = row.image_url;
    this.category = row.category;
    this.price = row.price;
    this.seller_sub = row.seller_sub;
    this.public_id = row.public_id;
    this.num_imgs = row.num_imgs;
    this.quantity = row.quantity;
    this.shipping_cost = row.shipping_cost ?? 0;
    this.display_name = row.display_name;
    this.logo_image_url = row.logo_image_url;
    this.sub = row.sub;
    this.sold = row.sold;
  }

  static async getGalleryPosts() {
    const { rows } = await pool.query(
      `
      SELECT
          g.category,
          g.created_at,
          g.seller_sub,
          g.seller_sub AS sub,
          g.description,
          g.id,
          g.image_url,
          g.num_imgs,
          g.price,
          g.public_id,
          g.title,
          g.sold,
          g.quantity,
          g.shipping_cost,
          sc.display_name,
          sc.logo_image_url
      FROM gallery_posts AS g
      JOIN cognito_users cu ON g.seller_sub = cu.sub
      LEFT JOIN stripe_customers sc ON cu.sub = sc.aws_sub
      WHERE g.deleted_at IS NULL ORDER BY created_at DESC;
      `
    );

    return rows.map((row) => new Gallery(row));
  }

  // get profile posts
  static async getGalleryPostsBySub(sub) {
    const { rows } = await pool.query(
      `
      SELECT
          g.category,
          g.created_at,
          g.seller_sub,
          g.seller_sub AS sub,
          g.description,
          g.id,
          g.image_url,
          g.num_imgs,
          g.price,
          g.public_id,
          g.title,
          g.shipping_cost,
          sc.display_name,
          sc.logo_image_url
      FROM gallery_posts AS g
      JOIN cognito_users cu ON g.seller_sub = cu.sub
      LEFT JOIN stripe_customers sc ON cu.sub = sc.aws_sub
      WHERE g.seller_sub = $1 AND g.deleted_at IS NULL
      ORDER BY created_at DESC;
      `,
      [sub]
    );

    return rows.map((row) => new Gallery(row));
  }

  static async getGalleryPostById(id) {
    const { rows } = await pool.query(
      `
      SELECT
          g.category,
          g.created_at,
          g.seller_sub,
          g.seller_sub AS sub,
          g.description,
          g.id,
          g.image_url,
          g.num_imgs,
          g.price,
          g.public_id,
          g.title,
          g.sold,
          g.quantity,
          g.shipping_cost,
          sc.display_name,
          sc.logo_image_url
      FROM gallery_posts AS g
      JOIN cognito_users cu ON g.seller_sub = cu.sub
      LEFT JOIN stripe_customers sc ON cu.sub = sc.aws_sub
      WHERE g.id = $1 AND g.deleted_at IS NULL
      ORDER BY created_at DESC;
      `,
      [id]
    );

    if (!rows[0]) {
      return null;
    }
    return new Gallery(rows[0]);
  }

  static async getGalleryImagesByPostId(post_id) {
    const { rows } = await pool.query(
      'SELECT * FROM  posts_imgs WHERE post_id=$1',
      [post_id]
    );
    return rows.map((row) => new Gallery(row));
  }
};
