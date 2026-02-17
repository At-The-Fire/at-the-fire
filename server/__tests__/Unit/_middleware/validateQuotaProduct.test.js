const validateQuotaProduct = require('../../../lib/middleware/validateQuotaProduct.js');

describe('validateQuotaProduct middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        category: 'Bubblers',
        date: '1731744000000',
        description: 'This is a product description',
        image_url:
          'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731810583/at-the-fire/IMG_0749.jpg',
        num_days: '1',
        price: '250',
        public_id: 'at-the-fire/IMG_0749',
        sold: false,
        title: 'test title for a product',
        type: 'auction',
        qty: 1,
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should pass validation for valid product data', () => {
    validateQuotaProduct(mockReq, mockRes, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.sanitizedProduct).toBeDefined();
  });

  it('should reject missing required fields', () => {
    delete mockReq.body.category;
    delete mockReq.body.qty;
    validateQuotaProduct(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing required product fields',
    });
  });

  it('should reject invalid date format', () => {
    mockReq.body.date = 'invalid-date';
    validateQuotaProduct(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid date format',
    });
  });

  it('should reject invalid product type', () => {
    mockReq.body.type = 'invalid-type';
    validateQuotaProduct(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid product type',
    });
  });

  it('should trim whitespace from string fields', () => {
    mockReq.body.title = '  test title  ';
    validateQuotaProduct(mockReq, mockRes, nextFunction);
    expect(mockReq.sanitizedProduct.title).toBe('test title');
  });
});
