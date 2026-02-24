const Auction = require('../../../lib/models/Auction.js');
const pool = require('../../../lib/utils/pool.js');

jest.mock('../../../lib/utils/pool');

describe('Auction Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an auction instance from a row', () => {
    const row = {
      id: 1,
      title: 'Test Auction',
      description: 'Test auction description',
      image_urls: ['http://test.com/image1.jpg', 'http://test.com/image2.jpg'],
      start_price: '100.00',
      buy_now_price: '500.00',
      current_bid: '150.00',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      is_active: true,
      seller_sub: 'sub_seller123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      is_paid: false,
      tracking_number: null,
    };

    const auction = new Auction(row);
    expect(auction.id).toBe(1);
    expect(auction.title).toBe('Test Auction');
    expect(auction.sellerSub).toBe('sub_seller123');
    expect(auction.imageUrls).toEqual(['http://test.com/image1.jpg', 'http://test.com/image2.jpg']);
    expect(auction.isActive).toBe(true);
  });

  describe('insert', () => {
    it('creates a new auction and returns an Auction instance', async () => {
      const mockRow = {
        id: 1,
        title: 'New Auction',
        description: 'Description',
        image_urls: ['image1.jpg'],
        start_price: '50.00',
        buy_now_price: '200.00',
        current_bid: null,
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-07T00:00:00Z',
        is_active: true,
        seller_sub: 'sub_seller456',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Auction.insert({
        title: 'New Auction',
        description: 'Description',
        imageUrls: ['image1.jpg'],
        startPrice: '50.00',
        buyNowPrice: '200.00',
        currentBid: null,
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-07T00:00:00Z',
        isActive: true,
        sellerSub: 'sub_seller456',
      });

      expect(result).toBeInstanceOf(Auction);
      expect(result.title).toBe('New Auction');
      expect(result.sellerSub).toBe('sub_seller456');
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auctions'),
        expect.arrayContaining(['New Auction', 'Description', ['image1.jpg']]),
      );
    });
  });

  describe('getAllActive', () => {
    it('returns all auctions ordered by end_time DESC', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Auction 1',
          seller_sub: 'sub_123',
          end_time: '2024-01-07T00:00:00Z',
          is_active: true,
        },
        {
          id: 2,
          title: 'Auction 2',
          seller_sub: 'sub_456',
          end_time: '2024-01-06T00:00:00Z',
          is_active: true,
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Auction.getAllActive();

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Auction);
      expect(results[0].title).toBe('Auction 1');
      expect(results[1].title).toBe('Auction 2');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no auctions exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Auction.getAllActive();

      expect(results).toHaveLength(0);
    });
  });

  describe('getBySeller', () => {
    it('returns all auctions for a seller as Auction instances', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Fire Bowl',
          seller_sub: 'sub_seller',
          image_urls: [],
          start_price: '100.00',
          buy_now_price: null,
          current_bid: null,
          start_time: new Date(),
          end_time: new Date(),
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Auction.getBySeller('sub_seller');

      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(Auction);
      expect(results[0].sellerSub).toBe('sub_seller');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['sub_seller']);
    });

    it('returns empty array when seller has no auctions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const results = await Auction.getBySeller('sub_nobody');
      expect(results).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns an auction by id', async () => {
      const mockRow = {
        id: 1,
        title: 'Test Auction',
        seller_sub: 'sub_123',
        is_active: true,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Auction.getById(1);

      expect(result).toBeInstanceOf(Auction);
      expect(result.id).toBe(1);
      expect(result.title).toBe('Test Auction');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    it('returns null when auction not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Auction.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateById', () => {
    it('updates an auction and returns updated instance', async () => {
      const currentAuction = {
        id: 1,
        title: 'Old Title',
        description: 'Old Description',
        image_urls: ['old.jpg'],
        start_price: '100',
        buy_now_price: '500',
        current_bid: null,
        start_time: '2024-01-01',
        end_time: '2024-01-07',
        is_active: true,
        seller_sub: 'sub_123',
      };

      const updatedAuction = {
        id: 1,
        title: 'New Title',
        description: 'Old Description',
        image_urls: ['old.jpg'],
        start_price: '100',
        buy_now_price: '500',
        current_bid: null,
        start_time: '2024-01-01',
        end_time: '2024-01-07',
        is_active: true,
        seller_sub: 'sub_123',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [currentAuction] }) // getById
        .mockResolvedValueOnce({ rows: [updatedAuction] }); // UPDATE

      const result = await Auction.updateById(1, { title: 'New Title' });

      expect(result).toBeInstanceOf(Auction);
      expect(result.title).toBe('New Title');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('throws error when auction not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(Auction.updateById(999, { title: 'New' })).rejects.toThrow('Auction not found');
    });
  });

  describe('closeAuction', () => {
    it('closes an auction and creates result record', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // UPDATE auctions
          .mockResolvedValueOnce({ rows: [{ id: 1, auction_id: 1, winner_sub: 'sub_winner' }] }) // INSERT result
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      const result = await Auction.closeAuction({
        auctionId: 1,
        winnerSub: 'sub_winner',
        finalBid: '250.00',
        closedReason: 'expired',
      });

      expect(result.winner_sub).toBe('sub_winner');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rolls back transaction on error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('DB Error')),
        release: jest.fn(),
      };

      pool.connect.mockResolvedValueOnce(mockClient);

      await expect(
        Auction.closeAuction({
          auctionId: 1,
          winnerSub: 'sub_winner',
          finalBid: '250.00',
          closedReason: 'expired',
        }),
      ).rejects.toThrow('DB Error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getUserAuctionWins', () => {
    it('returns auction wins for a user', async () => {
      const mockRows = [
        {
          id: 1,
          auction_id: 5,
          winner_sub: 'sub_123',
          final_bid: '250.00',
          closed_at: '2024-01-08',
          closed_reason: 'expired',
          is_paid: false,
          title: 'Won Auction',
          image_urls: ['image.jpg'],
          buy_now_price: '500.00',
          tracking_number: null,
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Auction.getUserAuctionWins('sub_123');

      expect(results).toHaveLength(1);
      expect(results[0].winnerSub).toBe('sub_123');
      expect(results[0].finalBid).toBe(250);
      expect(results[0].title).toBe('Won Auction');
    });
  });

  describe('markPaid', () => {
    it('marks an auction result as paid', async () => {
      const mockRow = {
        id: 1,
        auction_id: 5,
        is_paid: true,
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Auction.markPaid(5, true);

      expect(result.is_paid).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [5, true]);
    });

    it('throws error when result not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(Auction.markPaid(999, true)).rejects.toThrow('Auction result not found');
    });
  });

  describe('getAuctionResults', () => {
    it('returns auction results with winner profile', async () => {
      const mockRow = {
        closed_reason: 'buy_now',
        winner_sub: 'sub_123',
        first_name: 'John',
        image_url: 'profile.jpg',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Auction.getAuctionResults(1);

      expect(result.reason).toBe('buy_now');
      expect(result.profile.firstName).toBe('John');
      expect(result.profile.imageUrl).toBe('profile.jpg');
    });

    it('returns null when no results found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Auction.getAuctionResults(999);

      expect(result).toBeNull();
    });
  });
});
