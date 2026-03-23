jest.mock('../../../lib/utils/pool');

const Payout = require('../../../lib/models/Payout.js');
const pool = require('../../../lib/utils/pool.js');

describe('Payout Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSellerSummaries', () => {
    it('returns seller summaries with pending and paid totals', async () => {
      const mockRows = [
        {
          seller_sub: 'seller_1',
          first_name: 'Test',
          last_name: 'Seller',
          total_earned: '125.00',
          pending_balance: '25.00',
          total_paid_out: '100.00',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await Payout.getSellerSummaries();

      expect(result).toEqual(mockRows);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WITH gallery_earnings'));
    });
  });

  describe('getSellerEarnings', () => {
    it('returns combined pending/paid totals and payout history for seller', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ pending: '10.50', paid: '90.00' }] })
        .mockResolvedValueOnce({ rows: [{ pending: '5.25', paid: '20.00' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, amount: '30.00' }] });

      const result = await Payout.getSellerEarnings('seller_1');

      expect(result).toEqual({
        pendingBalance: 15.75,
        totalPaidOut: 110,
        payouts: [{ id: 1, amount: '30.00' }],
      });
      expect(pool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('createPayout', () => {
    it('creates payout and stamps related purchase and auction rows in one transaction', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({
            rows: [
              {
                id: 9,
                seller_sub: 'seller_1',
                amount: '45.00',
              },
            ],
          }) // INSERT seller_payouts
          .mockResolvedValueOnce({}) // UPDATE purchases
          .mockResolvedValueOnce({}) // UPDATE auction_results
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      const result = await Payout.createPayout({
        sellerSub: 'seller_1',
        amount: 45,
        periodStart: '2026-03-01',
        periodEnd: '2026-03-15',
        notes: 'Batch payout',
        paidBySub: 'admin_sub_1',
      });

      expect(result).toEqual({ id: 9, seller_sub: 'seller_1', amount: '45.00' });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back and rethrows when transaction fails', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('insert failed'))
          .mockResolvedValueOnce({}),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        Payout.createPayout({
          sellerSub: 'seller_1',
          amount: 45,
          periodStart: null,
          periodEnd: null,
          notes: null,
          paidBySub: 'admin_sub_1',
        }),
      ).rejects.toThrow('insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getPayoutHistory', () => {
    it('returns full payout history rows', async () => {
      const mockRows = [
        {
          id: 1,
          seller_sub: 'seller_1',
          amount: '30.00',
          first_name: 'Test',
          last_name: 'Seller',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await Payout.getPayoutHistory();

      expect(result).toEqual(mockRows);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('FROM seller_payouts sp'));
    });
  });
});
