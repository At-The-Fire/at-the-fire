const pool = require('../../lib/utils/pool.js');

module.exports = class Like {
  like_id;
  sub;
  post_id;
  created_at;

  constructor(row) {
    this.like_id = row.like_id;
    this.sub = row.sub;
    this.post_id = row.post_id;
    this.created_at = row.created_at;
  }

  static async toggleLike({ sub, post_id }) {
    // First try to delete (unlike)
    const { rowCount } = await pool.query(
      'DELETE FROM likes WHERE sub = $1 AND post_id = $2 RETURNING *',
      [sub, post_id]
    );

    // If nothing was deleted, create the like
    if (rowCount === 0) {
      const { rows } = await pool.query(
        'INSERT INTO likes (sub, post_id) VALUES ($1, $2) RETURNING *',
        [sub, post_id]
      );
      return new Like(rows[0]);
    }

    // Return null to indicate unlike success
    return null;
  }

  static async getLikeCount(post_id) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
      [post_id]
    );
    return parseInt(rows[0].count);
  }

  static async getPostLikeStatus({ sub, post_id }) {
    const { rows } = await pool.query(
      'SELECT * FROM likes WHERE sub = $1 AND post_id = $2',
      [sub, post_id]
    );
    return rows.length > 0;
  }
};
