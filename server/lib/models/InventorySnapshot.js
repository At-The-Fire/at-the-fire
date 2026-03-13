const pool = require('../utils/pool');
module.exports = class InventorySnapshot {
  id;
  created_at;
  category_count;
  price_count;
  user_sub;

  constructor(row) {
    this.id = row.id;
    this.created_at = row.created_at;
    this.category_count = row.category_count;
    this.price_count = row.price_count;
    this.user_sub = row.user_sub;
  }

  static async getInventorySnapshots(userSub) {
    const { rows } = await pool.query(
      `
      SELECT category_count, price_count, id, created_at FROM inventory_snapshot
      WHERE user_sub=$1
      ORDER BY created_at ASC
      `,
      [userSub]
    );

    return rows.map((row) => new InventorySnapshot(row));
  }

  static async findSnapshotForToday(userSub) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to 00:00:00 for consistent date comparison

    const { rows } = await pool.query(
      `SELECT * FROM inventory_snapshot
       WHERE user_sub = $1
       AND DATE(created_at) = DATE($2)`,
      [userSub, today]
    );

    if (!rows[0]) return null;
    return rows[0];
  }

  static async fetchCurrentPosts(sub) {
    // Fetch posts from the database
    const { rows } = await pool.query(
      'SELECT * FROM gallery_posts WHERE seller_sub = $1',
      [sub]
    );

    return rows;
  }
  static recalculateCounts(posts) {
    const categoryCount = {};
    const priceCount = {};

    posts.forEach((post) => {
      const category = post.category;
      const price = parseFloat(post.price) || 0;

      categoryCount[category] = (categoryCount[category] || 0) + 1;
      priceCount[category] = (priceCount[category] || 0) + price;
    });

    return { categoryCount, priceCount };
  }
  static adjustCounts(recalculatedCounts, newCounts) {
    const adjustedCounts = {};

    // Update counts for categories that exist in both recalculatedCounts and newCounts
    for (const category in recalculatedCounts) {
      if (category in newCounts) {
        adjustedCounts[category] = newCounts[category];
      }
    }

    // Add new categories that might not exist in recalculatedCounts
    for (const category in newCounts) {
      if (!(category in recalculatedCounts)) {
        adjustedCounts[category] = newCounts[category];
      }
    }

    return adjustedCounts;
  }
  static sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;

    if (Array.isArray(obj)) {
      return obj.map(this.sortObject);
    }

    return Object.keys(obj)
      .sort()
      .reduce((sortedObj, key) => {
        sortedObj[key] = this.sortObject(obj[key]);
        return sortedObj;
      }, {});
  }
  static async addOrUpdateSnapshot(userSub) {
    const existingSnapshot = await this.findSnapshotForToday(userSub);

    // Always calculate from actual current posts in the DB
    const currentPosts = await this.fetchCurrentPosts(userSub);
    const recalculatedCounts = this.recalculateCounts(currentPosts);

    if (existingSnapshot) {

      // Use recalculated counts directly for updating snapshot
      const adjustedCategoryCount = recalculatedCounts.categoryCount;
      const adjustedPriceCount = recalculatedCounts.priceCount;

      const sortedExistingCategoryCount = this.sortObject(
        existingSnapshot.category_count
      );
      const sortedExistingPriceCount = this.sortObject(
        existingSnapshot.price_count
      );
      const sortedAdjustedCategoryCount = this.sortObject(
        adjustedCategoryCount
      );
      const sortedAdjustedPriceCount = this.sortObject(adjustedPriceCount);
      // Check if the recalculated counts are different from the existing snapshot
      const isNewData =
        JSON.stringify(sortedAdjustedCategoryCount) !==
          JSON.stringify(sortedExistingCategoryCount) ||
        JSON.stringify(sortedAdjustedPriceCount) !==
          JSON.stringify(sortedExistingPriceCount);

      // If there's no new data, return a flag and the existing snapshot
      if (!isNewData) {
        return { ...existingSnapshot, willBeNewSnapShot: false };
      }

      // Update existing snapshot
      const { rows } = await pool.query(
        `UPDATE inventory_snapshot
         SET category_count = $2, price_count = $3
         WHERE id = $1
         RETURNING category_count, price_count, id, created_at`,
        [existingSnapshot.id, adjustedCategoryCount, adjustedPriceCount]
      );
      return rows[0];
    } else {
      // Insert new snapshot using server-calculated counts
      const { rows } = await pool.query(
        `INSERT INTO inventory_snapshot (user_sub, category_count, price_count)
         VALUES ($1, $2, $3)
         RETURNING category_count, price_count, id, created_at`,
        [userSub, recalculatedCounts.categoryCount, recalculatedCounts.priceCount]
      );
      return rows[0];
    }
  }
};
