const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');
const AWSUser = require('../../../lib/models/AWSUser.js');
const { parse } = require('json2csv');

// # S3 setup
jest.mock('@aws-sdk/client-s3', () => {
  const mockS3Send = jest.fn().mockImplementation((command) => {
    if (command.constructor.name === 'PutObjectCommand') {
      return Promise.resolve({
        $metadata: { httpStatusCode: 200 },
      });
    }
    if (command.constructor.name === 'DeleteObjectCommand') {
      return Promise.resolve({
        $metadata: { httpStatusCode: 204 },
      });
    }
  });

  return {
    S3Client: jest.fn(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    // Export the mock function so we can access it in tests
    __mockS3Send: mockS3Send,
  };
});

// Mock user data
const mockUser = {
  email: process.env.TEST_EMAIL,
  sub: process.env.TEST_SUB,
  customer_id: process.env.TEST_CUSTOMER_ID,
};

// Mock customer data
const mockCustomer = {
  customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
  isActive: true,
  subscriptionEndDate: 1630435200,
};

// Mocking the `AWSUser` module
jest.mock('../../../lib/models/AWSUser', () => {
  return {
    getGalleryPosts: jest.fn(),
    checkAndRecordImageUploads: jest.fn(),
    // prototype: {
    //   checkAndRecordImageUploads: jest.fn(),
    // },
  };
});

// Mock authenticate middleware to attach mock user to req.user object before each test case runs (req.user is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock('../../../lib/middleware/authenticateAWS.js', () => (req, res, next) => {
  req.user = mockUser;
  next();
});

// Mock authorizeSubscription middleware to attach mock subscription to req.subscription object before each test case runs (req.subscription is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock('../../../lib/middleware/authorizeSubscription.js', () => (req, res, next) => {
  req.customerId = mockCustomer.customerId;
  next();
});

// Mock Redis connection
jest.mock('../../../redisClient', () => {
  const RedisMock = require('redis-mock');
  const mockRedis = RedisMock.createClient(); // ❌ No `new` needed

  // Mock Redis behavior
  mockRedis.get = jest.fn().mockImplementation((key, callback) => callback(null, null)); // Always return null
  mockRedis.set = jest.fn().mockResolvedValue('OK');
  mockRedis.del = jest.fn().mockResolvedValue(1);
  mockRedis.auth = jest.fn().mockResolvedValue('OK');
  mockRedis.connect = jest.fn().mockResolvedValue(mockRedis);
  mockRedis.quit = jest.fn().mockResolvedValue();

  return async () => mockRedis; // Return the mock Redis client
});

describe('posts/ post details/ S3 routes', () => {
  beforeEach(() => {
    process.env.AWS_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-west-2';
    return setup(pool);
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  it('successfully updates the main image of a post', async () => {
    try {
      const response = await request(app).put('/api/v1/dashboard/posts/1/main-image').send({
        image_url: 'https://example.com/image.jpg',
        public_id: 'posts/image123',
      });

      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Test error:', error);
      throw error;
    }
  });

  it('returns 404 when post does not exist', async () => {
    await request(app)
      .put('/api/v1/dashboard/posts/9999/main-image')
      .send({
        image_url: 'https://example.com/image.jpg',
        public_id: 'posts/image123',
      })
      .expect(404);
  });

  it('returns 400 when image_url is missing', async () => {
    await request(app)
      .put('/api/v1/dashboard/posts/1/main-image')
      .send({
        public_id: 'posts/image123',
      })
      .expect(400);
  });
  it('returns 400 when public_id is missing', async () => {
    await request(app)
      .put('/api/v1/dashboard/posts/1/main-image')
      .send({
        image_url: 'https://example.com/image.jpg',
      })
      .expect(400);
  });
  it('returns 400 when image_url is invalid', async () => {
    await request(app)
      .put('/api/v1/dashboard/posts/1/main-image')
      .send({
        image_url: 'not-a-url',
        public_id: 'posts/image123',
      })
      .expect(400);
  });

  // download csv file of inventory
  it('should return a CSV file with correct headers and content', async () => {
    // Set up mock data for this test only
    const mockGalleryData = [
      {
        created_at: '2024-12-15T00:00:00.000Z',
        title: 'Test Item',
        description: 'Test Description',
        image_url: 'http://test.com/image.jpg',
        category: 'Test Category',
        price: '99.99',
      },
    ];

    // Mock just for this test call
    AWSUser.getGalleryPosts.mockImplementationOnce(() => Promise.resolve(mockGalleryData));

    // Format the data the same way as the route does
    const formattedData = mockGalleryData.map((item) => ({
      ...item,
      created_at: new Date(item.created_at).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }),
    }));

    const expectedFields = ['created_at', 'title', 'description', 'image_url', 'category', 'price'];

    const expectedCsv = parse(formattedData, { fields: expectedFields });

    const response = await request(app).get('/api/v1/dashboard/download-inventory-csv');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.text).toBe(expectedCsv);
  });

  it('should handle errors appropriately', async () => {
    // Mock an error
    const error = new Error('Failed to fetch gallery posts');
    AWSUser.getGalleryPosts.mockImplementation(error);

    const response = await request(app).get('/api/v1/dashboard/download-inventory-csv');

    // Test error handling
    expect(response.status).toBe(500);
    jest.resetAllMocks();
  });

  // get all posts for customer
  it('GET/dashboard  should get all subscriber posts', async () => {
    const resp = await request(app).get('/api/v1/dashboard');
    expect(resp.status).toBe(200);
  });

  it('GET/dashboard/:id should get post detail for subscriber post', async () => {
    const resp = await request(app).get('/api/v1/dashboard/1');
    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      image_url: expect.any(String),
      category: expect.any(String),
      price: expect.any(String),
      customer_id: expect.any(String),
      num_imgs: expect.any(String),
      public_id: expect.any(String),
      sold: expect.any(Boolean),
      date_sold: null,
    });
  });

  it('POST/dashboard creates new post ', async () => {
    const resp = await request(app).post('/api/v1/dashboard').send({
      title: 'test title',
      description: 'test description',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/IMG_1770.jpg',
      category: 'test category',
      price: 40,
      num_imgs: 1,
      public_id: 'test public id',
      sold: true,
      date_sold: '1720594800000',
    });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      title: 'test title',
      description: 'test description',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/IMG_1770.jpg',
      category: 'test category',
      price: '40',
      customer_id: 'stripe-customer-id_noProfile',
      num_imgs: expect.any(String),
      public_id: expect.any(String),
      sold: true,
      date_sold: '1720594800000',
    });
  });

  it('PUT/dashboard/:id updates a post and checks for the updated values', async () => {
    const resp = await request(app)
      .put('/api/v1/dashboard/1')
      .send({ id: 1 })
      .send({
        post: {
          title: 'Test title is updated',
          description: 'test description is updated',
          image_url:
            'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/UPDATED_IMAGE.jpg',
          category: 'test category is updated',
          price: 'test price is updated',
          num_imgs: 1,
          public_id: 'test public id',
          sold: true,
          date_sold: '1720594800000',
        },
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toEqual({
      id: expect.any(String),
      created_at: expect.any(String),
      title: 'Test title is updated',
      description: 'test description is updated',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/UPDATED_IMAGE.jpg',
      category: 'test category is updated',
      price: 'test price is updated',
      customer_id: expect.any(String),
      num_imgs: expect.any(String),
      public_id: expect.any(String),
      sold: true,
      date_sold: '1720594800000',
    });
  });

  it('DELETE/dashboard/:id should delete a post', async () => {
    const resp2 = await request(app).get('/api/v1/dashboard/2');
    expect(resp2.status).toBe(200);
    // First, create a new post using Post.postNewPost() method
    const resp = await request(app).post('/api/v1/dashboard').send({
      title: 'test title',
      description: 'test description',
      image_url:
        'https://res.cloudinary.com/dzodr2cdk/image/upload/v1731739453/at-the-fire/IMG_1770.jpg',
      category: 'test category',
      price: 'test price',
      num_imgs: '1',
      public_id: 'at-the-fire/IMG_1770.jpg',
    });

    expect(resp.status).toBe(200);

    // Get the ID of the newly created post
    const postId = resp.body.id;

    // Delete the post
    const deleteResp = await request(app).delete(`/api/v1/dashboard/${postId}`);

    expect(deleteResp.status).toBe(204);

    // Try to get the deleted post
    // const getResp = await request(app).get(`/api/v1/posts/${postId}`);
    const getResp = await request(app).get(`/api/v1/dashboard/${postId}`);
    expect(getResp.status).toBe(404);
    expect(getResp.body.message).toBe('Post not found');
  });

  // Test setup
  const mockMulter = {
    array: jest.fn(),
  };

  jest.mock('multer', () => {
    return jest.fn().mockImplementation(() => mockMulter);
  });

  it('POST /dashboard/upload should upload a file/files and return a 200 status code', async () => {
    // Create fake buffers to simulate image files
    const fakeImageBuffer1 = Buffer.from('fake-image-content-1', 'base64');
    const fakeImageBuffer2 = Buffer.from('fake-image-content-2', 'base64');
    // Get the mock function
    const { __mockS3Send } = require('@aws-sdk/client-s3');

    // Mock a successful upload response
    __mockS3Send.mockImplementation(() => {
      return Promise.resolve({
        $metadata: { httpStatusCode: 200 },
      });
    });
    const response = await request(app)
      .post('/api/v1/dashboard/upload')
      .attach('imageFiles', fakeImageBuffer1, 'test-image-1.jpg')
      .attach('imageFiles', fakeImageBuffer2, 'test-image-2.jpg');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Files uploaded successfully');
    expect(response.body.files).toBeDefined();
    expect(Array.isArray(response.body.files)).toBe(true);
    expect(response.body.files.length).toBe(2);
    expect(response.body.files[0].secure_url).toContain('d5fmwpj8iaraa.cloudfront.net');
  });

  it('POST /dashboard/images should store public_id and url in the database', async () => {
    const id = '1';
    const image_public_ids = '["test-public-id", "test-public-id-2"]';
    const image_urls = '["test-url", "test-url-2"]';
    const resource_types = '["image", "image"]';

    const response = await request(app)
      .post('/api/v1/dashboard/images')
      .send({ id, image_urls, image_public_ids, resource_types });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([
      {
        id: expect.any(Number),
        image_url: expect.any(String),
        public_id: expect.any(String),
        resource_type: expect.any(String),
      },
      {
        id: expect.any(Number),
        image_url: expect.any(String),
        public_id: expect.any(String),
        resource_type: expect.any(String),
      },
    ]);
  });

  it('DELETE/dashboard/image/:id should delete an image from database', async () => {
    const id = 1;
    const image_public_ids = '["test-public-id", "test-public-id-2"]';
    const image_urls = '["test-url", "test-url-2"]';
    const resource_types = '["image", "image"]';
    const response = await request(app)
      .post('/api/v1/dashboard/images')
      .send({ id, image_urls, image_public_ids, resource_types });
    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "image_url": "test-url",
          "public_id": "test-public-id",
          "resource_type": "image",
        },
        {
          "id": 2,
          "image_url": "test-url-2",
          "public_id": "test-public-id-2",
          "resource_type": "image",
        },
      ]
    `);

    const publicimgToDelete = response.body[0].public_id;
    const deleteResp = await request(app).delete(`/api/v1/dashboard/image/${id}`).send({
      public_id: publicimgToDelete,
    });
    expect(deleteResp.body).toMatchInlineSnapshot(`
      {
        "id": 1,
        "image_url": "test-url",
        "public_id": "test-public-id",
        "resource_type": "image",
      }
    `);

    expect(deleteResp.status).toBe(200);
    const remainingImage = await request(app).get(`/api/v1/dashboard/urls/${id}`);
    expect(remainingImage.body).toMatchInlineSnapshot(`
      [
        {
          "id": 2,
          "image_url": "test-url-2",
          "post_id": 1,
          "public_id": "test-public-id-2",
          "resource_type": "image",
        },
      ]
    `);
    expect(remainingImage.status).toBe(200);
  });

  it('POST/dashboard with incomplete payload returns 400 status', async () => {
    const resp = await request(app).post('/api/v1/dashboard').send({
      // let's just send the title and miss out on other required fields such as in edit post
      title: 'test title',
    });
    expect(resp.status).toBe(400);
  });

  it('PUT/dashboard/:id with non-existing ID returns error', async () => {
    const resp = await request(app).put('/api/v1/dashboard/9999').send({
      title: 'test title',
    });

    expect(resp.status).toBe(404);
  });

  it('DELETE/dashboard/:id with non-existing ID returns error', async () => {
    const resp = await request(app).delete('/api/v1/dashboard/9999');
    expect(resp.status).toBe(404);
  });

  //! Can't get the checkAndRecordImageUploads function to actual fire, the mock is overriding it- route works, test fails
  it.skip('POST/upload with 51 images should return 400 status', async () => {
    // Use the real AWSUser class
    const RealAWSUser = jest.requireActual('../../../lib/models/AWSUser');

    // Spy on the real static method
    const checkAndRecordSpy = jest
      .spyOn(RealAWSUser, 'checkAndRecordImageUploads')
      .mockImplementation(async (customerId, imageCount) => {
        console.log('Real method called with:', customerId, imageCount);
        if (imageCount > 50) {
          throw new Error('Daily upload limit of 50 images exceeded');
        }
        return true;
      });

    // Prepare a test request with 51 images
    const imageBuffer = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x0a, 0x00, 0x0a, 0x00, 0x91, 0x00, 0x00, 0xff, 0xff,
      0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0xff, 0x21, 0xf9, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x2c, 0x00, 0x00, 0x00, 0x00, 0x0a, 0x00, 0x0a, 0x00, 0x00, 0x02, 0x16, 0x8c, 0x2d, 0x99,
      0x87, 0x2a, 0x1c, 0xdc, 0x33, 0xa0, 0x02, 0x75, 0xec, 0x95, 0xfa, 0xa8, 0xde, 0x60, 0x8c,
      0x04, 0x91, 0x4c, 0x01, 0x00, 0x3b,
    ]);

    const req = request(app)
      .post('/api/v1/dashboard/upload')
      .set('customerId', 'stripe-customer-id_noProfile');

    [...Array(51)].forEach((_, i) => {
      req.attach('imageFiles', imageBuffer, `test${i}.jpg`);
    });

    const resp = await req;

    // Verify the static method was called
    expect(checkAndRecordSpy).toHaveBeenCalledWith('stripe-customer-id_noProfile', 51);

    // Verify the response
    expect(resp.status).toBe(400);

    // Restore the static method after the test
    checkAndRecordSpy.mockRestore();
  });

  // it.todo('upload invalid file types');
  // it.todo('upload invalid file size');
  // it.todo('send malformed data');
  // it.todo('inauthenticated/ unauthorized user');
  // it.todo(`Rate Limits or External API Failures: If your service relies on any
  //     external APIs (e.g., a call to Cloudinary), consider what happens if
  //     that external service fails or if you exceed any rate limits`);
});
