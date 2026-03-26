jest.mock('../../../lib/utils/pool');

const Subscriptions = require('../../../lib/models/Subscriptions.js');
const pool = require('../../../lib/utils/pool.js');

const mockRow = {
  customer_id: 'cus_123',
  subscription_id: 'sub_abc',
  is_active: true,
  interval: 'month',
  subscription_start_date: '2026-01-01',
  subscription_end_date: '2026-02-01',
  trial_start_date: '2026-01-01',
  trial_end_date: '2026-01-15',
  status: 'active',
};

describe('Subscriptions Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('maps all 9 row columns to instance properties', () => {
      const sub = new Subscriptions(mockRow);
      expect(sub.customerId).toBe('cus_123');
      expect(sub.subscriptionId).toBe('sub_abc');
      expect(sub.isActive).toBe(true);
      expect(sub.interval).toBe('month');
      expect(sub.subscriptionStartDate).toBe('2026-01-01');
      expect(sub.subscriptionEndDate).toBe('2026-02-01');
      expect(sub.trialStartDate).toBe('2026-01-01');
      expect(sub.trialEndDate).toBe('2026-01-15');
      expect(sub.status).toBe('active');
    });

    it('maps null trial dates to null', () => {
      const sub = new Subscriptions({ ...mockRow, trial_start_date: null, trial_end_date: null });
      expect(sub.trialStartDate).toBeNull();
      expect(sub.trialEndDate).toBeNull();
    });
  });

  describe('upsertSubscription()', () => {
    it('returns a Subscriptions instance on insert or update', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Subscriptions.upsertSubscription(
        'cus_123',
        'sub_abc',
        true,
        'month',
        '2026-01-01',
        '2026-02-01',
        '2026-01-01',
        '2026-01-15',
        'active',
      );

      expect(result).toBeInstanceOf(Subscriptions);
      expect(result.customerId).toBe('cus_123');
      expect(result.isActive).toBe(true);
    });

    it('query includes ON CONFLICT upsert clause', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      await Subscriptions.upsertSubscription(
        'cus_123',
        'sub_abc',
        true,
        'month',
        '2026-01-01',
        '2026-02-01',
        null,
        null,
        'active',
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (customer_id) DO UPDATE'),
        expect.any(Array),
      );
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(
        Subscriptions.upsertSubscription(
          'cus_123',
          'sub_abc',
          true,
          'month',
          null,
          null,
          null,
          null,
          'active',
        ),
      ).rejects.toThrow('db error');
    });
  });

  describe('cancelSubscriptionData()', () => {
    it('calls pool.query with INSERT INTO cancellation_data and correct params', async () => {
      const cancellationRow = {
        subscription_id: 'sub_abc',
        canceled_at: 1700000000,
        comment: 'Too expensive',
        feedback: 'too_expensive',
        reason: 'cancellation_requested',
      };
      pool.query.mockResolvedValueOnce({ rows: [cancellationRow] });

      await Subscriptions.cancelSubscriptionData(
        'sub_abc',
        1700000000,
        'Too expensive',
        'too_expensive',
        'cancellation_requested',
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cancellation_data'),
        ['sub_abc', 1700000000, 'Too expensive', 'too_expensive', 'cancellation_requested'],
      );
    });

  });

  describe('setStatusInactive()', () => {
    it('calls pool.query with UPDATE is_active = false and the subscriptionId param', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await Subscriptions.setStatusInactive('sub_abc');

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('is_active = false'), [
        'sub_abc',
      ]);
    });

    it('returns undefined', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await Subscriptions.setStatusInactive('sub_abc');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllSubscriptions()', () => {
    it('returns an array of Subscriptions instances', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow, { ...mockRow, customer_id: 'cus_456' }] });

      const result = await Subscriptions.getAllSubscriptions();

      expect(result).toHaveLength(2);
      result.forEach((s) => expect(s).toBeInstanceOf(Subscriptions));
      expect(result[0].customerId).toBe('cus_123');
      expect(result[1].customerId).toBe('cus_456');
    });

    it('returns an empty array when there are no subscriptions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await Subscriptions.getAllSubscriptions();
      expect(result).toEqual([]);
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(Subscriptions.getAllSubscriptions()).rejects.toThrow('db error');
    });
  });
});
