const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

// Mock user data
const mockUser = {
  email: process.env.TEST_EMAIL,
  sub: process.env.TEST_SUB,
  customer_id: process.env.TEST_CUSTOMER_ID,
};

// Mock customer data
const mockCustomer = {
  customerId: process.env.TEST_CUSTOMER_ID,
  isActive: true,
  subscriptionEndDate: 1630435200,
};

// Mock authenticate middleware to attach mock user to req.user object before each test case runs (req.user is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock(
  '../../../lib/middleware/authenticateAWS.js',
  () => (req, res, next) => {
    req.user = mockUser;
    next();
  }
);

// Mock authorizeSubscription middleware to attach mock subscription to req.subscription object before each test case runs (req.subscription is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock(
  '../../../lib/middleware/authorizeSubscription.js',
  () => (req, res, next) => {
    // if (mockUser.sub !== null) {
    req.customerId = mockCustomer.customerId;
    // }

    next();
  }
);

describe('orders routes', () => {
  beforeEach(() => {
    // jest.resetAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  it('GET /orders should retrieve all orders ', async () => {
    const resp = await request(app).get('/api/v1/orders');

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual([
      {
        client_name: 'Robert (collector)',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '4',
        is_fulfilled: false,
        items: [
          {
            category: 'Slides',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '24',
        shipping: '0',
      },
      {
        client_name: 'Pipes Galore',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '3',
        is_fulfilled: false,
        items: [
          {
            category: 'Recyclers',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 1000,
          },
          {
            category: 'Dry pieces',
            description: 'fume + dichro',
            name: 'glass stuff',
            qty: 20,
            rate: 20,
          },
        ],
        order_number: '23',
        shipping: '50',
      },
      {
        client_name: 'Puff Puff Pass',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '2',
        is_fulfilled: true,
        items: [
          {
            category: 'Slides',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'all fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '22',
        shipping: '40',
      },
      {
        client_name: 'Up In Smoke',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '1',
        is_fulfilled: true,
        items: [
          {
            category: 'Recyclers',
            description:
              'all fume with opals and it has a lot of other stuff I would love to talk about for a while',
            name: 'glass stuff',
            qty: 5,
            rate: 1000,
          },
          {
            category: 'Dry pieces',
            description: 'fume + dichro',
            name: 'glass stuff',
            qty: 20,
            rate: 20,
          },
        ],
        order_number: '21',
        shipping: '100',
      },
    ]);
  });

  it('GET /orders should handle empty orders list', async () => {
    // First delete all orders (or use a separate test database that's empty)
    const allOrders = await request(app).get('/api/v1/orders');
    for (const order of allOrders.body) {
      await request(app).delete(`/api/v1/orders/${order.id}`);
    }

    // Now try to get orders
    const response = await request(app).get('/api/v1/orders');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('POST /orders should create new order', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut hammer',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 25, // manually corresponding to db, GET done on front end to find this
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      client_name: 'John Collectorson',
      created_at: expect.any(String),
      customerId: 'cus_OVLKmXa6lrzktm',
      date: expect.any(String),
      id: '5',
      is_fulfilled: false,
      items: [
        {
          category: 'Dry pieces',
          description: 'Super heady triple donut hammer',
          name: 'Dry Hammer',
          qty: 2,
          rate: 200,
        },
      ],
      order_number: '25',
      shipping: '0',
    });
  });

  it('POST /orders missing data should result in 400 Bad Request Error', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: undefined, // mocking missing data
      description: 'Super heady triple donut hammer',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 25, // manually corresponding to db, GET done on front end to find this
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });

  it('POST /orders should reject invalid data types', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: 'not a number', // Invalid type
      rate: 'also not a number',
      category: 'Dry pieces',
      description: 'Super heady triple donut hammer',
    };

    const orderData = {
      date: 'invalid-date-format',
      client_name: 123, // Should be string
      items: JSON.stringify([formattedItem]),
      shipping: 'not a number',
      order_number: '25', // Should be number
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({
      error: 'Missing or invalid required order fields',
    });
  });

  it('POST /orders should handle duplicate order numbers', async () => {
    // First order
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut hammer',
    };

    let orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 25, // manually corresponding to db, GET done on front end to find this
    };

    const response = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(response.status).toBe(200);

    // Second order with same number
    const formattedItem2 = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut hammer',
    };

    orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([formattedItem2]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 25, // manually corresponding to db, GET done on front end to find this
    };

    const response2 = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(response2.status).toBe(500);
    expect(response2.body).toEqual({
      message:
        'duplicate key value violates unique constraint "unique_user_order"',
      status: 500,
    });
  });

  it('POST /orders should reject empty items array', async () => {
    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([]), // Empty array
      shipping: parseFloat(0),
      order_number: 25,
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({
      error: 'Missing or invalid required order fields',
    });
  });

  it('POST /orders should handle malformed JSON in items', async () => {
    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: '{malformed json]', // Intentionally malformed
      shipping: parseFloat(0),
      order_number: 25,
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({ error: 'Invalid items JSON format' });
  });

  it('POST /orders should reject empty strings in required fields', async () => {
    const formattedItem = {
      name: '   ', // Just spaces
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: '', // Empty string
      description: 'Super heady triple donut hammer',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: '', // Empty string
      items: JSON.stringify([formattedItem]),
      shipping: parseFloat(0),
      order_number: 25,
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({
      error: 'Missing or invalid required order fields',
    });
  });

  it('POST /orders should reject negative quantities or rates', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(-2, 10), // Negative quantity
      rate: parseFloat(-200), // Negative rate
      category: 'Dry pieces',
      description: 'Super heady triple donut hammer',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson',
      items: JSON.stringify([formattedItem]),
      shipping: parseFloat(0),
      order_number: 25,
    };

    const resp = await request(app).post('/api/v1/orders').send({
      orderData,
    });

    expect(resp.status).toBe(400);
    expect(resp.body).toEqual({
      error: 'Invalid item data or string length exceeds 255 characters',
    });
  });
  it('POST /should return 400 if any input string exceeds 255 characters', async () => {
    const longString = 'a'.repeat(256);
    const baseOrderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'Valid Client',
      items: JSON.stringify([
        {
          name: 'Dry Hammer',
          qty: 1,
          rate: 133,
          category: 'Dry pieces',
          description: 'Super heady triple donut hammer',
        },
      ]),
      shipping: parseFloat(0),
      order_number: 25,
    };

    // List of text fields to validate, including nested fields in `items`
    const textFields = ['client_name', 'name', 'category', 'description'];

    for (const field of textFields) {
      const testOrderData = JSON.parse(JSON.stringify(baseOrderData)); // Deep copy

      if (field === 'client_name') {
        testOrderData.client_name = longString;
      } else {
        // Modify fields within `items` array
        const modifiedItems = JSON.parse(testOrderData.items);
        modifiedItems[0][field] = longString;
        testOrderData.items = JSON.stringify(modifiedItems);
      }

      const resp = await request(app).post('/api/v1/orders').send({
        orderData: testOrderData,
      });

      expect(resp.status).toBe(400);
      expect(resp.body).toEqual({
        error: 'Invalid item data or string length exceeds 255 characters',
      });
    }
  });

  it('PUT /orders/:orderId should an edit order', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut sherlock',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson Johnson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 21, // manually corresponding to db, GET done on front end to find this
    };

    const response = await request(app)
      .put('/api/v1/orders/1')
      .send({ orderData });

    expect(response.body).toEqual({
      client_name: 'John Collectorson Johnson',
      created_at: expect.any(String),
      customerId: 'cus_OVLKmXa6lrzktm',
      date: expect.any(String),
      id: '1',
      is_fulfilled: true,
      items: [
        {
          category: 'Dry pieces',
          description: 'Super heady triple donut sherlock',
          name: 'Dry Hammer',
          qty: 2,
          rate: 200,
        },
      ],
      order_number: '21',
      shipping: '0',
    });
  });

  it('PUT /orders/:orderId?fulfillment  should update fulfillment of order', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut sherlock',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson Johnson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 21, // manually corresponding to db, GET done on front end to find this
    };

    const response = await request(app)
      .put('/api/v1/orders/1')
      .send({ orderData });

    expect(response.body).toEqual({
      client_name: 'John Collectorson Johnson',
      created_at: expect.any(String),
      customerId: 'cus_OVLKmXa6lrzktm',
      date: expect.any(String),
      id: '1',
      is_fulfilled: true,
      items: [
        {
          category: 'Dry pieces',
          description: 'Super heady triple donut sherlock',
          name: 'Dry Hammer',
          qty: 2,
          rate: 200,
        },
      ],
      order_number: '21',
      shipping: '0',
    });

    const isFulfilled = true;
    const response2 = await request(app)
      .put('/api/v1/orders/1/fulfillment')
      .send({ isFulfilled });

    expect(response2.status).toBe(200);
    expect(response2.body).toEqual({
      id: '1',
      customerId: 'cus_OVLKmXa6lrzktm',
      created_at: expect.any(String),
      order_number: '21',
      date: expect.any(String),
      is_fulfilled: true,
      client_name: 'John Collectorson Johnson',
      items: [
        {
          qty: 2,
          name: 'Dry Hammer',
          rate: 200,
          category: 'Dry pieces',
          description: 'Super heady triple donut sherlock',
        },
      ],
      shipping: '0',
    });
  });
  it('PUT /orders/:orderId?fulfillment missing isFulfilled data should result in a 400 Bad Request Error', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut sherlock',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson Johnson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 21, // manually corresponding to db, GET done on front end to find this
    };

    const response = await request(app)
      .put('/api/v1/orders/1')
      .send({ orderData });

    expect(response.body).toEqual({
      client_name: 'John Collectorson Johnson',
      created_at: expect.any(String),
      customerId: 'cus_OVLKmXa6lrzktm',
      date: expect.any(String),
      id: '1',
      is_fulfilled: true,
      items: [
        {
          category: 'Dry pieces',
          description: 'Super heady triple donut sherlock',
          name: 'Dry Hammer',
          qty: 2,
          rate: 200,
        },
      ],
      order_number: '21',
      shipping: '0',
    });

    const isFulfilled = undefined;
    const response2 = await request(app)
      .put('/api/v1/orders/1/fulfillment')
      .send({ isFulfilled });

    expect(response2.status).toBe(400);
  });

  it('PUT /orders/:orderId should handle non-existent order ID', async () => {
    const formattedItem = {
      name: 'Dry Hammer',
      qty: parseInt(2, 10),
      rate: parseFloat(200),
      category: 'Dry pieces',
      description: 'Super heady triple donut sherlock',
    };

    const orderData = {
      date: '2023-10-04T07:00:00.000Z',
      client_name: 'John Collectorson Johnson',
      items: JSON.stringify([formattedItem]), // Convert array to JSON string
      shipping: parseFloat(0),
      order_number: 21, // manually corresponding to db, GET done on front end to find this
    };

    const response = await request(app)
      .put('/api/v1/orders/999') // Non-existent ID
      .send({ orderData });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Order not found' });
  });

  it('PUT /orders/:orderId should reject invalid fulfillment values', async () => {
    const isFulfilled = 'not a boolean';
    const body = { isFulfilled };
    const response = await request(app)
      .put('/api/v1/orders/1/fulfillment')
      .send({ body });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Missing data' });
  });

  it('DELETE /orders/:orderId should delete order', async () => {
    //  GET to  show all orders
    const response = await request(app).get('/api/v1/orders');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        client_name: 'Robert (collector)',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '4',
        is_fulfilled: false,
        items: [
          {
            category: 'Slides',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '24',
        shipping: '0',
      },
      {
        client_name: 'Pipes Galore',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '3',
        is_fulfilled: false,
        items: [
          {
            category: 'Recyclers',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 1000,
          },
          {
            category: 'Dry pieces',
            description: 'fume + dichro',
            name: 'glass stuff',
            qty: 20,
            rate: 20,
          },
        ],
        order_number: '23',
        shipping: '50',
      },
      {
        client_name: 'Puff Puff Pass',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '2',
        is_fulfilled: true,
        items: [
          {
            category: 'Slides',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'all fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '22',
        shipping: '40',
      },
      {
        client_name: 'Up In Smoke',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '1',
        is_fulfilled: true,
        items: [
          {
            category: 'Recyclers',
            description:
              'all fume with opals and it has a lot of other stuff I would love to talk about for a while',
            name: 'glass stuff',
            qty: 5,
            rate: 1000,
          },
          {
            category: 'Dry pieces',
            description: 'fume + dichro',
            name: 'glass stuff',
            qty: 20,
            rate: 20,
          },
        ],
        order_number: '21',
        shipping: '100',
      },
    ]);

    // DELETE order
    const response2 = await request(app).delete('/api/v1/orders/1');
    expect(response2.status).toBe(204);

    //  GET to confirm deletion of order # 1
    const response3 = await request(app).get('/api/v1/orders');
    expect(response3.status).toBe(200);
    expect(response3.body).toEqual([
      {
        client_name: 'Robert (collector)',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '4',
        is_fulfilled: false,
        items: [
          {
            category: 'Slides',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '24',
        shipping: '0',
      },
      {
        client_name: 'Pipes Galore',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '3',
        is_fulfilled: false,
        items: [
          {
            category: 'Recyclers',
            description: 'all fume with opals',
            name: 'glass stuff',
            qty: 5,
            rate: 1000,
          },
          {
            category: 'Dry pieces',
            description: 'fume + dichro',
            name: 'glass stuff',
            qty: 20,
            rate: 20,
          },
        ],
        order_number: '23',
        shipping: '50',
      },
      {
        client_name: 'Puff Puff Pass',
        created_at: expect.any(String),
        customerId: 'cus_OVLKmXa6lrzktm',
        date: expect.any(String),
        id: '2',
        is_fulfilled: true,
        items: [
          {
            category: 'Slides',
            description: 'dichro and fume',
            name: 'glass stuff',
            qty: 5,
            rate: 250,
          },
          {
            category: 'Dry Pipes',
            description: 'all fume',
            name: 'glass stuff',
            qty: 5,
            rate: 640,
          },
        ],
        order_number: '22',
        shipping: '40',
      },
    ]);
  });

  it('DELETE /orders/:orderId should handle non-existent order', async () => {
    const response = await request(app).delete('/api/v1/orders/999');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Order not found' });
  });
});
