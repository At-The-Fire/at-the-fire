const validateOrder = require('../../../lib/middleware/validateOrder.js');

describe('validateOrder middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    // Reset mocks before each test
    mockReq = {
      body: {
        orderData: {
          date: '2023-10-04T07:00:00.000Z',
          client_name: 'Test Client',
          items: JSON.stringify([
            {
              name: 'Test Item',
              qty: 1,
              rate: 100,
              category: 'Test Category',
              description: 'Test Description',
            },
          ]),
          shipping: 0,
          order_number: 1,
        },
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should pass validation with valid data', () => {
    validateOrder(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should handle missing required fields', () => {
    mockReq.body.orderData.client_name = '';

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing or invalid required order fields',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should validate item quantity is positive', () => {
    mockReq.body.orderData.items = JSON.stringify([
      {
        name: 'Test Item',
        qty: -1,
        rate: 100,
        category: 'Test Category',
        description: 'Test Description',
      },
    ]);

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });

  it('should validate item rate is non-negative', () => {
    mockReq.body.orderData.items = JSON.stringify([
      {
        name: 'Test Item',
        qty: 1,
        rate: -100,
        category: 'Test Category',
        description: 'Test Description',
      },
    ]);

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });

  it('should validate string length limits', () => {
    const longString = 'a'.repeat(256);
    mockReq.body.orderData.items = JSON.stringify([
      {
        name: longString,
        qty: 1,
        rate: 100,
        category: 'Test Category',
        description: 'Test Description',
      },
    ]);

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });

  it('should validate client_name length', () => {
    mockReq.body.orderData.client_name = 'a'.repeat(256);

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });

  it('should handle malformed JSON', () => {
    mockReq.body.orderData.items = 'invalid json';

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Invalid items JSON format',
    });
  });

  it('should handle empty items array', () => {
    mockReq.body.orderData.items = JSON.stringify([]);

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing or invalid required order fields',
    });
  });

  it('should handle non-numeric shipping', () => {
    mockReq.body.orderData.shipping = '0'; // string instead of number

    validateOrder(mockReq, mockRes, nextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Missing or invalid required order fields',
    });
  });

  it('should handle single item object (non-array)', () => {
    mockReq.body.orderData.items = JSON.stringify({
      name: 'Test Item',
      qty: 1,
      rate: 100,
      category: 'Test Category',
      description: 'Test Description',
    });

    validateOrder(mockReq, mockRes, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
