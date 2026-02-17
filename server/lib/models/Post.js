const pool = require('../utils/pool');

module.exports = class Post {
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
  resource_type;
  sold;
  logo_image_url;
  date_sold;

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
    this.resource_type = row.resource_type;
    this.sold = row.sold;
    this.logo_image_url = row.logo_image_url;
    this.date_sold = row.date_sold;
  }

  // post a new post
  static async postNewPost(
    title,
    description,
    image_url,
    category,
    price,
    customerId,
    public_id,
    num_imgs,
    sold,
    date_sold
  ) {
    const { rows } = await pool.query(
      'INSERT INTO gallery_posts (title, description, image_url, category, price, customer_id, public_id, num_imgs,sold, date_sold) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [
        title,
        description,
        image_url,
        category,
        price,
        customerId,
        public_id,
        num_imgs,
        sold,
        date_sold,
      ]
    );

    const data = new Post(rows[0]);

    return data;
  }

  // add additional image urls/ public_id's beyond the first one
  static async addGalleryImages(post_id, image_urls, image_public_ids, resource_types) {
    const insertQuery = `
      INSERT INTO posts_imgs (post_id, image_url, public_id, resource_type)
      VALUES ($1, $2, $3,$4)
      RETURNING *;
    `;

    const addedImages = [];
    for (let i = 0; i < image_urls.length; i++) {
      const { rows } = await pool.query(insertQuery, [
        post_id,
        image_urls[i],
        image_public_ids[i],
        resource_types[i],
      ]);
      addedImages.push(new Post(rows[0]));
    }
    return addedImages;
  }

  // update a post
  static async updateById(
    id,
    title,
    description,
    image_url,
    category,
    price,
    customerId,
    public_id,
    num_imgs,
    sold,
    date_sold
  ) {
    const { rows } = await pool.query(
      `
      UPDATE gallery_posts
      SET title = $2,
          description = $3,
          image_url = $4,
          category = $5,
          price = $6,
          customer_id = $7,
          public_id = $8,
          num_imgs = $9,
          sold = $10,
          date_sold = $11
      WHERE id = $1
      RETURNING *;
      `,
      [
        id,
        title,
        description,
        image_url,
        category,
        price,
        customerId,
        public_id,
        num_imgs,
        sold,
        date_sold,
      ]
    );

    if (!rows[0]) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    return new Post(rows[0]);
  }

  // update thumbnail
  static async updateMainImage(id, imageUrl, publicId) {
    const { rows } = await pool.query(
      `UPDATE gallery_posts 
     SET image_url = $2, public_id = $3
     WHERE id = $1 
     RETURNING *`,
      [id, imageUrl, publicId]
    );

    if (!rows[0]) {
      const error = new Error('Post not found');
      error.status = 404;
      throw error;
    }

    return rows[0];
  }

  //get a post by id
  static async getById(post_id) {
    const { rows } = await pool.query(
      `
      SELECT * 
      FROM gallery_posts 
      WHERE id=$1 
      `,
      [post_id]
    );
    if (!rows[0]) {
      return null;
    }

    return new Post(rows[0]);
  }

  static async deleteById(post) {
    const data = await Post.getById(post);
    if (!data) {
      return null;
    }
    const { rows } = await pool.query(
      `
    DELETE from gallery_posts
    WHERE id = $1
    RETURNING *
    `,
      [post]
    );

    return new Post(rows[0]);
  }

  static async deleteImgDataById(post_id, public_id) {
    const { rows } = await pool.query(
      `
    DELETE from posts_imgs
    WHERE post_id = $1 AND public_id = $2
    RETURNING *
    `,
      [post_id, public_id]
    );

    if (!rows[0]) {
      const error = new Error('Image not found');
      error.status = 404;
      throw error;
    }

    return new Post(rows[0]);
  }

  static async getAdditionalImages(post_id) {
    const { rows } = await pool.query(
      `
      SELECT * 
      FROM posts_imgs 
      WHERE post_id=$1 
      `,
      [post_id]
    );
    if (!rows[0]) {
      return [];
    }

    return rows;
  }

  static async transferImagesToPostImgs(post_id) {
    try {
      // Step 1: Retrieve the image_url and public_id from gallery_posts for the given post_id
      const { rows: galleryRows } = await pool.query(
        `
      SELECT image_url, public_id 
      FROM gallery_posts 
      WHERE id=$1
      `,
        [post_id]
      );

      if (!galleryRows[0]) {
        throw new Error(`No data found in gallery_posts for post_id: ${post_id}`);
      }

      const { image_url, public_id } = galleryRows[0];

      // Step 2: Insert the retrieved data into posts_imgs with resource_type set to 'image'
      const { rows: postImgsRows } = await pool.query(
        `
      INSERT INTO posts_imgs (post_id, image_url, public_id, resource_type)
      VALUES ($1, $2, $3, 'image')
      RETURNING *
      `,
        [post_id, image_url, public_id]
      );

      return postImgsRows[0];
    } catch (error) {
      console.error('Error transferring images to posts_imgs:', error);
      throw error;
    }
  }

  static async getAllPosts() {
    const { rows } = await pool.query(
      `
    SELECT * FROM gallery_posts
    `
    );

    if (!rows) {
      return null;
    }
    return rows.map((row) => new Post(row));
  }

  static async getFeedPosts(sub) {
    const { rows } = await pool.query(
      `
SELECT 
    posts.category,
    posts.created_at,
    posts.customer_id,
    posts.description,
    posts.id,
    posts.image_url,
    posts.num_imgs,
    posts.price,
    posts.public_id,
    posts.title,
    posts.sold,
    sc.display_name,
    sc.logo_image_url
FROM gallery_posts posts
JOIN stripe_customers sc ON posts.customer_id = sc.customer_id
JOIN followers f ON sc.aws_sub = f.followed_id
WHERE f.follower_id = $1
ORDER BY posts.created_at DESC
LIMIT 50;

      `,
      [sub]
    );

    if (!rows) {
      return null;
    }

    return rows.map((row) => new Post(row));
  }
};
