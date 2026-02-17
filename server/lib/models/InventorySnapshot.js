const pool = require('../utils/pool');
module.exports = class InventorySnapshot {
  id;
  created_at;
  category_count;
  price_count;
  customer_id;

  constructor(row) {
    this.id = row.id;
    this.created_at = row.created_at;
    this.category_count = row.category_count;
    this.price_count = row.price_count;
    this.customer_id = row.customer_id;
  }

  static async getInventorySnapshots(customerId) {
    const { rows } = await pool.query(
      `
      SELECT category_count, price_count, id, created_at FROM inventory_snapshot 
      WHERE customer_id=$1 
      ORDER BY created_at ASC
      `,
      [customerId]
    );

    return rows.map((row) => new InventorySnapshot(row));
  }

  //  this is the new insertInventorySnapshot
  //

  static async findSnapshotForToday(customerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to 00:00:00 for consistent date comparison

    const { rows } = await pool.query(
      `SELECT * FROM inventory_snapshot 
       WHERE customer_id = $1 
       AND DATE(created_at) = DATE($2)`,
      [customerId, today]
    );

    if (!rows[0]) return null;
    return rows[0];
  }

  static async fetchCurrentPosts(customerId) {
    // Fetch posts from the database
    const { rows } = await pool.query(
      'SELECT * FROM gallery_posts WHERE customer_id = $1',
      [customerId]
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
  static async addOrUpdateSnapshot(
    customerId,
    newCategoryCount,
    newPriceCount
  ) {
    const existingSnapshot = await this.findSnapshotForToday(customerId);

    if (existingSnapshot) {
      // Fetch current posts and recalculate counts
      const currentPosts = await this.fetchCurrentPosts(customerId);
      const recalculatedCounts = this.recalculateCounts(currentPosts);

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
      // Insert new snapshot
      const { rows } = await pool.query(
        `INSERT INTO inventory_snapshot (customer_id, category_count, price_count) 
         VALUES ($1, $2, $3)
         RETURNING category_count, price_count, id, created_at`,
        [customerId, newCategoryCount, newPriceCount]
      );
      return rows[0];
    }
  }
};
