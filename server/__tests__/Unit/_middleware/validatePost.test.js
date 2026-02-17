const validatePost = require('../../../lib/middleware/validatePost.js');

describe('validatePost middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  const validPostData = {
    title: 'test title',
    description: 'test description',
    image_url:
      'https://res.cloudinary.com/dzodr2cdk/image/upload/v1234/test.jpg',
    category: 'Testing',
    price: '100',
    customer_id: '123',
    num_imgs: '5',
    public_id: 'test/image',
    sold: false,
  };

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('Direct body format', () => {
    beforeEach(() => {
      mockReq = {
        body: { ...validPostData },
      };
    });

    it('should pass validation for valid post data', () => {
      validatePost(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.sanitizedProduct).toBeDefined();
    });

    it('should properly sanitize the data', () => {
      mockReq.body.title = '  spaced title  ';
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockReq.sanitizedProduct.title).toBe('spaced title');
    });
  });

  describe('Nested post format', () => {
    beforeEach(() => {
      mockReq = {
        body: {
          post: { ...validPostData },
          id: '123', // Additional field for PUT requests
        },
      };
    });

    it('should pass validation for valid nested post data', () => {
      validatePost(mockReq, mockRes, nextFunction);
      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.sanitizedProduct).toBeDefined();
    });
  });

  describe('Field validation', () => {
    beforeEach(() => {
      mockReq = {
        body: { ...validPostData },
      };
    });

    it('should reject missing required fields', () => {
      delete mockReq.body.title;
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Missing required post fields',
      });
    });

    it('should reject invalid field types', () => {
      mockReq.body.title = 123; // Should be string
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid field types',
      });
    });

    it('should handle string boolean conversion for sold field', () => {
      mockReq.body.sold = 'true';
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockReq.sanitizedProduct.sold).toBe(true);
    });

    it('should reject invalid sold field values', () => {
      mockReq.body.sold = 'invalid';
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Sold status must be a boolean value',
      });
    });

    it('should reject exceeding maximum string lengths', () => {
      mockReq.body.title = 'a'.repeat(256);
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Field length exceeds maximum allowed characters',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle null body', () => {
      mockReq = { body: null };
      validatePost(mockReq, mockRes, nextFunction);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid post data format',
      });
    });
  });
});
