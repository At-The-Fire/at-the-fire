const pool = require('../utils/pool');

class Payout {
  // Admin: all sellers who have sales, with earnings + pending balance
  static async getSellerSummaries() {
    const { rows } = await pool.query(`
      WITH gallery_earnings AS (
        SELECT seller_sub,
          COALESCE(SUM(seller_net) FILTER (WHERE status = 'completed'), 0)                        AS total,
          COALESCE(SUM(seller_net) FILTER (WHERE status = 'completed' AND payout_id IS NULL), 0)  AS pending
        FROM purchases
        GROUP BY seller_sub
      ),
      auction_earnings AS (
        SELECT a.seller_sub,
          COALESCE(SUM(ar.seller_net) FILTER (WHERE ar.is_paid = TRUE), 0)                        AS total,
          COALESCE(SUM(ar.seller_net) FILTER (WHERE ar.is_paid = TRUE AND ar.payout_id IS NULL), 0) AS pending
        FROM auction_results ar
        JOIN auctions a ON a.id = ar.auction_id
        GROUP BY a.seller_sub
      ),
      payout_totals AS (
        SELECT seller_sub, SUM(amount) AS total_paid_out
        FROM seller_payouts
        GROUP BY seller_sub
      )
      SELECT
        cu.sub                                                              AS seller_sub,
        cu.first_name,
        cu.last_name,
        COALESCE(ge.total, 0) + COALESCE(ae.total, 0)                     AS total_earned,
        COALESCE(ge.pending, 0) + COALESCE(ae.pending, 0)                 AS pending_balance,
        COALESCE(pt.total_paid_out, 0)                                     AS total_paid_out
      FROM cognito_users cu
      LEFT JOIN gallery_earnings ge ON ge.seller_sub = cu.sub
      LEFT JOIN auction_earnings ae ON ae.seller_sub = cu.sub
      LEFT JOIN payout_totals pt ON pt.seller_sub = cu.sub
      WHERE (COALESCE(ge.total, 0) + COALESCE(ae.total, 0)) > 0
      ORDER BY pending_balance DESC
    `);
    return rows;
  }

  // Seller: own pending balance + payout history
  static async getSellerEarnings(sellerSub) {
    const [galleryResult, auctionResult, payoutsResult] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(seller_net) FILTER (WHERE status = 'completed' AND payout_id IS NULL), 0)     AS pending,
           COALESCE(SUM(seller_net) FILTER (WHERE status = 'completed' AND payout_id IS NOT NULL), 0) AS paid
         FROM purchases
         WHERE seller_sub = $1`,
        [sellerSub]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(ar.seller_net) FILTER (WHERE ar.is_paid = TRUE AND ar.payout_id IS NULL), 0)     AS pending,
           COALESCE(SUM(ar.seller_net) FILTER (WHERE ar.is_paid = TRUE AND ar.payout_id IS NOT NULL), 0) AS paid
         FROM auction_results ar
         JOIN auctions a ON a.id = ar.auction_id
         WHERE a.seller_sub = $1`,
        [sellerSub]
      ),
      pool.query(
        `SELECT id, amount, period_start, period_end, notes, created_at
         FROM seller_payouts
         WHERE seller_sub = $1
         ORDER BY created_at DESC`,
        [sellerSub]
      ),
    ]);

    const g = galleryResult.rows[0];
    const a = auctionResult.rows[0];
    return {
      pendingBalance: Number(g.pending) + Number(a.pending),
      totalPaidOut: Number(g.paid) + Number(a.paid),
      payouts: payoutsResult.rows,
    };
  }

  // Admin: create a payout record and stamp the covered purchases/auction_results
  static async createPayout({ sellerSub, amount, periodStart, periodEnd, notes, paidBySub }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO seller_payouts (seller_sub, amount, period_start, period_end, notes, paid_by_sub)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [sellerSub, amount, periodStart || null, periodEnd || null, notes || null, paidBySub]
      );
      const payout = rows[0];

      await client.query(
        `UPDATE purchases SET payout_id = $1
         WHERE seller_sub = $2 AND status = 'completed' AND payout_id IS NULL`,
        [payout.id, sellerSub]
      );

      await client.query(
        `UPDATE auction_results ar SET payout_id = $1
         FROM auctions a
         WHERE ar.auction_id = a.id AND a.seller_sub = $2 AND ar.is_paid = TRUE AND ar.payout_id IS NULL`,
        [payout.id, sellerSub]
      );

      await client.query('COMMIT');
      return payout;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // Admin: full payout history across all sellers
  static async getPayoutHistory() {
    const { rows } = await pool.query(`
      SELECT sp.id, sp.seller_sub, sp.amount, sp.period_start, sp.period_end, sp.notes, sp.created_at,
             cu.first_name, cu.last_name
      FROM seller_payouts sp
      JOIN cognito_users cu ON cu.sub = sp.seller_sub
      ORDER BY sp.created_at DESC
    `);
    return rows;
  }
}

module.exports = Payout;
