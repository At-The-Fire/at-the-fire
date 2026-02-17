const authDelUp = require('../../../lib/middleware/authDelUp.js');
const Post = require('../../../lib/models/Post.js');
const QuotaProduct = require('../../../lib/models/QuotaProduct.js');

// Mock both models
jest.mock('../../../lib/models/Post.js', () => ({
  getById: jest.fn(),
}));

jest.mock('../../../lib/models/QuotaProduct.js', () => ({
  getQuotaProductById: jest.fn(),
}));

describe('authDelUp Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request
    req = {
      params: { id: '123' },
      customerId: 'customer123',
      originalUrl: '/dashboard/123', // Default to posts route
    };

    // Setup mock response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Setup next function
    next = jest.fn();
  });

  describe('Posts Routes', () => {
    it('should call next() when user owns the post', async () => {
      Post.getById.mockResolvedValue({
        id: '123',
        customer_id: 'customer123',
        title: 'Test Post',
      });

      await authDelUp(req, res, next);

      expect(Post.getById).toHaveBeenCalledWith('123');
      expect(QuotaProduct.getQuotaProductById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(req.resourceItem).toBeDefined();
    });

    it('should return 404 when post is not found', async () => {
      Post.getById.mockResolvedValue(null);

      await authDelUp(req, res, next);

      expect(Post.getById).toHaveBeenCalledWith('123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post not found',
        code: 404,
      });
    });

    it('should return 403 when user is not the post creator', async () => {
      Post.getById.mockResolvedValue({
        id: '123',
        customer_id: 'different_customer',
        title: 'Test Post',
      });

      await authDelUp(req, res, next);

      expect(Post.getById).toHaveBeenCalledWith('123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You do not have permission to do this: access denied',
        code: 403,
      });
    });
  });

  describe('Products Routes', () => {
    beforeEach(() => {
      req.originalUrl = '/quota-tracking/123';
    });

    it('should call next() when user owns the product', async () => {
      QuotaProduct.getQuotaProductById.mockResolvedValue({
        id: '123',
        customer_id: 'customer123',
        name: 'Test Product',
      });

      await authDelUp(req, res, next);

      expect(QuotaProduct.getQuotaProductById).toHaveBeenCalledWith('123');
      expect(Post.getById).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(req.resourceItem).toBeDefined();
    });

    it('should return 404 when product is not found', async () => {
      QuotaProduct.getQuotaProductById.mockResolvedValue(null);

      await authDelUp(req, res, next);

      expect(QuotaProduct.getQuotaProductById).toHaveBeenCalledWith('123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Product not found',
        code: 404,
      });
    });

    it('should return 403 when user is not the product owner', async () => {
      QuotaProduct.getQuotaProductById.mockResolvedValue({
        id: '123',
        customer_id: 'different_customer',
        name: 'Test Product',
      });

      await authDelUp(req, res, next);

      expect(QuotaProduct.getQuotaProductById).toHaveBeenCalledWith('123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You do not have permission to do this: access denied',
        code: 403,
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when an unexpected error occurs', async () => {
      Post.getById.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authDelUp(req, res, next);

      expect(Post.getById).toHaveBeenCalledWith('123');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal Server Error',
        code: 500,
      });

      consoleSpy.mockRestore();
    });

    it('should return 400 for invalid routes', async () => {
      req.originalUrl = '/invalid/123';

      await authDelUp(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid route',
        code: 400,
      });
    });
  });
});
