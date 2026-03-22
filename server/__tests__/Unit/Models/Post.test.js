jest.mock('../../../lib/utils/pool');

const Post = require('../../../lib/models/Post.js');
const pool = require('../../../lib/utils/pool.js');

describe('Post Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getForPurchase', () => {
    it('returns purchase-facing post fields when found', async () => {
      const mockRow = {
        id: 10,
        seller_sub: 'seller_sub_123',
        price: '24.99',
        available_quantity: 3,
        sold: false,
        shipping_cost: '5.00',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Post.getForPurchase(10);

      expect(result).toEqual(mockRow);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [10]);
    });

    it('returns null when post is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Post.getForPurchase(99999);

      expect(result).toBeNull();
    });
  });

  describe('decrementQuantity', () => {
    it('decrements quantity and returns updated id using transaction client', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [{ id: 10 }] }),
      };

      const result = await Post.decrementQuantity(10, 1, false, 2, mockClient);

      expect(result).toEqual({ id: 10 });
      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [10, 1, false, 2]);
    });

    it('returns null when update is blocked', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      };

      const result = await Post.decrementQuantity(10, 1, false, 2, mockClient);

      expect(result).toBeNull();
    });
  });
});
