const Bid = require('../../../lib/models/Bid.js');
const pool = require('../../../lib/utils/pool.js');

jest.mock('../../../lib/utils/pool');

describe('Bid Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Bid instance from a row', () => {
    const row = {
      id: 1,
      auction_id: 10,
      bidder_sub: 'sub_123',
      bid_amount: '150.00',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const bid = new Bid(row);
    expect(bid.id).toBe(1);
    expect(bid.auctionId).toBe(10);
    expect(bid.bidderSub).toBe('sub_123');
    expect(bid.bidAmount).toBe('150.00');
    expect(bid.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(bid.updatedAt).toBe('2024-01-01T00:00:00Z');
  });

  describe('insert', () => {
    it('inserts a bid using pool and returns a Bid instance', async () => {
      const mockRow = {
        id: 1,
        auction_id: 10,
        bidder_sub: 'sub_123',
        bid_amount: '150.00',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Bid.insert({ auctionId: 10, bidderSub: 'sub_123', bidAmount: '150.00' });

      expect(result).toBeInstanceOf(Bid);
      expect(result.id).toBe(1);
      expect(result.auctionId).toBe(10);
      expect(result.bidAmount).toBe('150.00');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bids'),
        [10, 'sub_123', '150.00'],
      );
    });

    it('uses the provided client instead of pool when given', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              auction_id: 10,
              bidder_sub: 'sub_456',
              bid_amount: '200.00',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      };

      const result = await Bid.insert(
        { auctionId: 10, bidderSub: 'sub_456', bidAmount: '200.00' },
        mockClient,
      );

      expect(result).toBeInstanceOf(Bid);
      expect(result.bidderSub).toBe('sub_456');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO bids'),
        [10, 'sub_456', '200.00'],
      );
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('returns null when no row is returned', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Bid.insert({ auctionId: 10, bidderSub: 'sub_123', bidAmount: '150.00' });

      expect(result).toBeNull();
    });
  });

  describe('getByAuctionId', () => {
    it('returns bids for an auction ordered by bid_amount DESC', async () => {
      const mockRows = [
        {
          id: 2,
          auction_id: 10,
          bidder_sub: 'sub_456',
          bid_amount: '200.00',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 1,
          auction_id: 10,
          bidder_sub: 'sub_123',
          bid_amount: '150.00',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Bid.getByAuctionId(10);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Bid);
      expect(results[0].bidAmount).toBe('200.00');
      expect(results[1].bidAmount).toBe('150.00');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    it('returns empty array when no bids exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Bid.getByAuctionId(99999);

      expect(results).toEqual([]);
    });
  });

  describe('getHighestBid', () => {
    it('returns the highest bid for an auction', async () => {
      const mockRow = {
        id: 2,
        auction_id: 10,
        bidder_sub: 'sub_456',
        bid_amount: '200.00',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Bid.getHighestBid(10);

      expect(result).toBeInstanceOf(Bid);
      expect(result.bidAmount).toBe('200.00');
      expect(result.bidderSub).toBe('sub_456');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    it('returns null when no bids exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Bid.getHighestBid(99999);

      expect(result).toBeNull();
    });
  });

  describe('getByUserSub', () => {
    it('returns all bids for a user ordered by created_at DESC', async () => {
      const mockRows = [
        {
          id: 3,
          auction_id: 20,
          bidder_sub: 'sub_123',
          bid_amount: '300.00',
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-03T00:00:00Z',
        },
        {
          id: 1,
          auction_id: 10,
          bidder_sub: 'sub_123',
          bid_amount: '150.00',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Bid.getByUserSub('sub_123');

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Bid);
      expect(results[0].bidderSub).toBe('sub_123');
      expect(results[0].auctionId).toBe(20);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['sub_123']);
    });

    it('returns empty array when user has no bids', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Bid.getByUserSub('sub_nobids');

      expect(results).toEqual([]);
    });
  });

  describe('deleteByAuctionId', () => {
    it('deletes all bids for an auction and returns them', async () => {
      const mockRows = [
        {
          id: 1,
          auction_id: 10,
          bidder_sub: 'sub_123',
          bid_amount: '150.00',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          auction_id: 10,
          bidder_sub: 'sub_456',
          bid_amount: '200.00',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Bid.deleteByAuctionId(10);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Bid);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM bids'),
        [10],
      );
    });

    it('returns empty array when no bids to delete', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Bid.deleteByAuctionId(99999);

      expect(results).toEqual([]);
    });
  });
});
