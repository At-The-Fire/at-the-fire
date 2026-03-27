const AuctionNotification = require('../../../lib/models/AuctionNotification.js');
const pool = require('../../../lib/utils/pool.js');

jest.mock('../../../lib/utils/pool');

describe('AuctionNotification Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an AuctionNotification instance from a row', () => {
    const row = {
      id: 1,
      user_sub: 'sub_123',
      auction_id: 10,
      type: 'outbid',
      created_at: '2024-01-01T00:00:00Z',
      is_read: false,
    };

    const notification = new AuctionNotification(row);
    expect(notification.id).toBe(1);
    expect(notification.userSub).toBe('sub_123');
    expect(notification.auctionId).toBe(10);
    expect(notification.type).toBe('outbid');
    expect(notification.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(notification.isRead).toBe(false);
  });

  describe('insert', () => {
    it('creates a new notification and returns an AuctionNotification instance', async () => {
      const mockRow = {
        id: 1,
        user_sub: 'sub_123',
        auction_id: 10,
        type: 'outbid',
        created_at: '2024-01-01T00:00:00Z',
        is_read: false,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await AuctionNotification.insert({
        userSub: 'sub_123',
        auctionId: 10,
        type: 'outbid',
      });

      expect(result).toBeInstanceOf(AuctionNotification);
      expect(result.userSub).toBe('sub_123');
      expect(result.auctionId).toBe(10);
      expect(result.type).toBe('outbid');
      expect(result.isRead).toBe(false);
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auction_notifications'),
        ['sub_123', 10, 'outbid'],
      );
    });

    it('returns null when no row is returned', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await AuctionNotification.insert({
        userSub: 'sub_123',
        auctionId: 10,
        type: 'outbid',
      });

      expect(result).toBeNull();
    });
  });

  describe('getUnreadByUserSub', () => {
    it('returns unread won notifications for a user ordered by created_at DESC', async () => {
      const mockRows = [
        {
          id: 2,
          user_sub: 'sub_123',
          auction_id: 20,
          type: 'won',
          created_at: '2024-01-02T00:00:00Z',
          is_read: false,
        },
        {
          id: 1,
          user_sub: 'sub_123',
          auction_id: 10,
          type: 'won',
          created_at: '2024-01-01T00:00:00Z',
          is_read: false,
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await AuctionNotification.getUnreadByUserSub('sub_123');

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(AuctionNotification);
      expect(results[0].id).toBe(2);
      expect(results[1].id).toBe(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE user_sub = $1 AND is_read = false AND type IN ('won', 'outbid')",
        ),
        ['sub_123'],
      );
    });

    it('returns empty array when user has no unread notifications', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await AuctionNotification.getUnreadByUserSub('sub_notifications');

      expect(results).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('calls pool.query with SET is_read = true for the given user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await AuctionNotification.markAsRead('sub_123');

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SET is_read = true'), [
        'sub_123',
      ]);
    });
  });
});
