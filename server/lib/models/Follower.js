const pool = require('../utils/pool');
const AWSUser = require('./AWSUser.js');

module.exports = class Gallery {
  follower_id;
  following_id;
  created_at;

  constructor(row) {
    this.follower_id = row.follower_id;
    this.following_id = row.following_id;
    this.created_at = row.created_at;
  }

  static async createFollower(followerId, followedId) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO followers (follower_id, followed_id)
         VALUES ($1, $2)
         RETURNING *`,
        [followerId, followedId]
      );

      return rows[0];
    } catch (error) {
      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        throw new Error('Already following this user.');
      }
      throw error;
    }
  }

  // Delete a follower relationship
  static async deleteFollower(followerId, followedId) {
    const { rows } = await pool.query(
      `DELETE FROM followers
       WHERE follower_id = $1 AND followed_id = $2
       RETURNING *`,
      [followerId, followedId]
    );

    if (rows.length === 0) {
      throw new Error('Follower relationship not found.');
    }

    return rows[0];
  }

  // Get all followers of a user
  static async getFollowers(userId) {
    const { rows } = await pool.query(
      `SELECT 
        u.sub, 
        u.email, 
        u.image_url, 
        u.first_name, 
        u.last_name,
        u.social_media_links,
        f.created_at as followed_since,
        c.display_name,
        c.logo_image_url,
        c.website_url
       FROM followers f
       JOIN cognito_users u ON f.follower_id = u.sub
       LEFT JOIN stripe_customers c ON u.sub = c.aws_sub
       WHERE f.followed_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    // Decrypt the sensitive fields using your existing CognitoUser model
    const decryptedRows = await Promise.all(
      rows.map(async (row) => {
        const userInstance = new AWSUser(row);
        return {
          ...row,
          first_name: userInstance.firstName,
          last_name: userInstance.lastName,
        };
      })
    );

    return decryptedRows;
  }

  // Get all users that a user is following
  static async getFollowing(userId) {
    const { rows } = await pool.query(
      `SELECT 
        u.sub, 
        u.email, 
        u.image_url, 
        u.first_name, 
        u.last_name,
        u.social_media_links,
        f.created_at as following_since,
        c.display_name,
        c.logo_image_url,
        c.website_url
       FROM followers f
       JOIN cognito_users u ON f.followed_id = u.sub
       LEFT JOIN stripe_customers c ON u.sub = c.aws_sub
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    // Decrypt the sensitive fields using your existing CognitoUser model
    const decryptedRows = await Promise.all(
      rows.map(async (row) => {
        const userInstance = new AWSUser(row);
        return {
          ...row,
          first_name: userInstance.firstName,
          last_name: userInstance.lastName,
        };
      })
    );

    return decryptedRows;
  }

  // Check if a follow relationship exists
  static async isFollowing(followerId, followedId) {
    const { rows } = await pool.query(
      `SELECT EXISTS (
         SELECT 1 
         FROM followers
         WHERE follower_id = $1 AND followed_id = $2
       ) as is_following`,
      [followerId, followedId]
    );

    return rows[0].is_following;
  }

  // Get follower count for a user
  static async getFollowerCount(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count
       FROM followers
       WHERE followed_id = $1`,
      [userId]
    );

    return parseInt(rows[0].count);
  }

  // Get following count for a user
  static async getFollowingCount(userId) {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as count
       FROM followers
       WHERE follower_id = $1`,
      [userId]
    );

    return parseInt(rows[0].count);
  }
};
