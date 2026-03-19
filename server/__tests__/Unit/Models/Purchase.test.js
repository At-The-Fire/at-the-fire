jest.mock('../../../lib/utils/pool');

const Purchase = require('../../../lib/models/Purchase.js');
const pool = require('../../../lib/utils/pool.js');

describe('Purchase Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a Purchase instance from a row', () => {
    const row = {
      id: 1,
      buyer_sub: 'sub_123',
      seller_sub: 'seller_sub_123',
      item_type: 'gallery_post',
      item_id: 10,
      quantity: 2,
      amount_paid: '49.98',
      processor_transaction_id: 'pi_abc123',
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
    };

    const purchase = new Purchase(row);
    expect(purchase.id).toBe(1);
    expect(purchase.buyerSub).toBe('sub_123');
    expect(purchase.sellerSub).toBe('seller_sub_123');
    expect(purchase.itemType).toBe('gallery_post');
    expect(purchase.itemId).toBe(10);
    expect(purchase.quantity).toBe(2);
    expect(purchase.amountPaid).toBe('49.98');
    expect(purchase.processorTransactionId).toBe('pi_abc123');
    expect(purchase.status).toBe('completed');
    expect(purchase.createdAt).toBe('2024-01-01T00:00:00Z');
  });

  describe('insert', () => {
    it('creates a new purchase and returns a Purchase instance', async () => {
      const mockRow = {
        id: 1,
        buyer_sub: 'sub_123',
        seller_sub: 'seller_sub_123',
        item_type: 'gallery_post',
        item_id: 10,
        quantity: 1,
        amount_paid: '24.99',
        processor_transaction_id: null,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Purchase.insert({
        buyerSub: 'sub_123',
        sellerSub: 'seller_sub_123',
        itemType: 'gallery_post',
        itemId: 10,
        quantity: 1,
        amountPaid: '24.99',
      });

      expect(result).toBeInstanceOf(Purchase);
      expect(result.buyerSub).toBe('sub_123');
      expect(result.itemType).toBe('gallery_post');
      expect(result.status).toBe('pending');
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO purchases'), [
        'sub_123',
        'seller_sub_123',
        'gallery_post',
        10,
        1,
        '24.99',
      ]);
    });
  });

  describe('getById', () => {
    it('returns a purchase by id', async () => {
      const mockRow = {
        id: 5,
        buyer_sub: 'sub_123',
        seller_sub: 'seller_sub_123',
        item_type: 'gallery_post',
        item_id: 10,
        quantity: 1,
        amount_paid: '24.99',
        processor_transaction_id: null,
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Purchase.getById(5);

      expect(result).toBeInstanceOf(Purchase);
      expect(result.id).toBe(5);
      expect(result.buyerSub).toBe('sub_123');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    it('returns null when purchase not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Purchase.getById(99999);

      expect(result).toBeNull();
    });
  });

  describe('getByBuyerSub', () => {
    it.only('returns all purchases for a buyer ordered by created_at DESC', async () => {
      const mockRows = [
        {
          id: 2,
          buyer_sub: 'sub_123',
          seller_sub: 'seller_sub_123',
          item_type: 'gallery_post',
          item_id: 20,
          quantity: 1,
          amount_paid: '50.00',
          processor_transaction_id: null,
          status: 'completed',
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: 1,
          buyer_sub: 'sub_123',
          seller_sub: 'seller_sub_123',
          item_type: 'gallery_post',
          item_id: 10,
          quantity: 1,
          amount_paid: '24.99',
          processor_transaction_id: null,
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });
      pool.query.mockResolvedValueOnce({
        rows: [
          { post_id: 20, image_url: 'https://example.com/image-20.jpg' },
          { post_id: 10, image_url: 'https://example.com/image-10.jpg' },
        ],
      });

      const results = await Purchase.getByBuyerSub('sub_123');

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Purchase);
      expect(results[0].id).toBe(2);
      expect(results[1].id).toBe(1);
      expect(results[0].imageUrls).toEqual(['https://example.com/image-20.jpg']);
      expect(results[1].imageUrls).toEqual(['https://example.com/image-10.jpg']);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when buyer has no purchases', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Purchase.getByBuyerSub('sub_nopurchases');

      expect(results).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('updates the status and returns updated Purchase instance', async () => {
      const mockRow = {
        id: 1,
        buyer_sub: 'sub_123',
        seller_sub: 'seller_sub_123',
        item_type: 'gallery_post',
        item_id: 10,
        quantity: 1,
        amount_paid: '24.99',
        processor_transaction_id: null,
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Purchase.updateStatus(1, 'completed');

      expect(result).toBeInstanceOf(Purchase);
      expect(result.status).toBe('completed');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'completed']);
    });

    it('throws error when purchase not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(Purchase.updateStatus(99999, 'completed')).rejects.toThrow('Purchase not found');
    });
  });

  describe('updateTransactionId', () => {
    it('updates the processor_transaction_id and returns updated Purchase instance', async () => {
      const mockRow = {
        id: 1,
        buyer_sub: 'sub_123',
        seller_sub: 'seller_sub_123',
        item_type: 'gallery_post',
        item_id: 10,
        quantity: 1,
        amount_paid: '24.99',
        processor_transaction_id: 'pi_abc123',
        status: 'pending',
        created_at: '2024-01-01T00:00:00Z',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Purchase.updateTransactionId(1, 'pi_abc123');

      expect(result).toBeInstanceOf(Purchase);
      expect(result.processorTransactionId).toBe('pi_abc123');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1, 'pi_abc123']);
    });

    it('throws error when purchase not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(Purchase.updateTransactionId(99999, 'pi_abc123')).rejects.toThrow(
        'Purchase not found',
      );
    });
  });
});
