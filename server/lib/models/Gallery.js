const pool = require('../utils/pool');

module.exports = class Gallery {
  id;
  created_at;
  title;
  description;
  image_url;
  category;
  price;
  customer_id;
  public_id;
  num_imgs;
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
    this.customer_id = row.customer_id;
    this.public_id = row.public_id;
    this.num_imgs = row.num_imgs;
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
        g.customer_id,
        g.description,
        g.id,
        g.image_url,
        g.num_imgs,
        g.price,
        g.public_id,
        g.title,
        g.sold,
        s.display_name,
        s.logo_image_url
    FROM
        gallery_posts AS g 
    JOIN
        stripe_customers AS s ON g.customer_id = s.customer_id ORDER BY created_at DESC;

            `
    );

    return rows.map((row) => new Gallery(row));
  }

  // get profile posts
  static async getGalleryPostsByStripeId(customerId) {
    const { rows } = await pool.query(
      `
      SELECT
      g.category,
      g.created_at,
      g.customer_id,
      g.description,
      g.id,
      g.image_url,
      g.num_imgs,
      g.price,
      g.public_id,
      g.title,
      s.display_name,
      s.logo_image_url,
      cu.sub
  FROM
      gallery_posts AS g
  JOIN
      stripe_customers AS s ON g.customer_id = s.customer_id
  JOIN
      cognito_users AS cu ON s.aws_sub = cu.sub
  WHERE 
      g.customer_id= $1
  ORDER BY 
      created_at DESC;
  
      `,
      [customerId]
    );

    return rows.map((row) => new Gallery(row));
  }

  static async getGalleryPostById(id) {
    const { rows } = await pool.query(
      `
      SELECT
      g.category,
      g.created_at,
      g.customer_id,
      g.description,
      g.id,
      g.image_url,
      g.num_imgs,
      g.price,
      g.public_id,
      g.title,
      g.sold,
      s.display_name,
      s.logo_image_url,
      cu.sub
  FROM
      gallery_posts AS g
  JOIN
      stripe_customers AS s ON g.customer_id = s.customer_id
  JOIN
      cognito_users AS cu ON s.aws_sub = cu.sub
  WHERE 
      g.id= $1
  ORDER BY 
      created_at DESC;
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
