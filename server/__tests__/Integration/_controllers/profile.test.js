const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const AWSUser = require('../../../lib/models/AWSUser.js');
const getRedisClient = require('../../../redisClient.js');

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
let mockUser = {
  email: process.env.TEST_EMAIL,
  sub: process.env.TEST_SUB,
  customer_id: process.env.TEST_CUSTOMER_ID,
};

// Mock customer data
let mockCustomer = {
  customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
  isActive: true,
  subscriptionEndDate: 1630435200,
};

// Mock authenticate middleware to attach mock user to req.user object before each test case runs (req.user is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock(
  '../../../lib/middleware/authenticateAWS.js',
  () => (req, res, next) => {
    req.userAWSSub = mockUser.sub;
    next();
  }
);

// Mock authorizeSubscription middleware to attach mock subscription to req.subscription object before each test case runs (req.subscription is used in the route handler)
// this is assuming that the user is logged in and authenticated (tested elsewhere)
jest.mock(
  '../../../lib/middleware/authorizeSubscription.js',
  () => (req, res, next) => {
    req.customerId = mockCustomer.customerId;
    next();
  }
);

describe('Profile routes that use mocked middleware: /profile/user-update/:sub and /profile/customer-update/:sub profile routes', () => {
  beforeEach(() => {
    process.env.AWS_BUCKET_NAME = 'test-bucket';
    process.env.AWS_REGION = 'us-west-2';
    return setup(pool);
  });

  afterAll(() => {
    jest.resetAllMocks();
    pool.end();
  });

  // test all GET scenarios:
  // testing new user/ no profile data yet
  it('GET /profile/:sub, should retrieve a user with no profile data', async () => {
    const resp = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_NO_PROFILE}`
    );

    const profile = resp.body.profile;
    const bizProfile = resp.body.bizProfile;
    const posts = resp.body.posts;
    expect(resp.status).toBe(200);
    expect(profile).toEqual({
      sub: process.env.TEST_SUB_NO_PROFILE,
      createdAt: expect.any(String),
      imageUrl: null,
      publicId: null,
      firstName: null,
      lastName: null,
      bio: null,
      socialMediaLinks: null,
    });
    expect(bizProfile).toEqual(null);
    expect(bizProfile).toBe(null);
    expect(posts).toEqual([]);
    expect(posts.length).toBe(0);
  });

  // testing new user with profile data but no subscription
  it('GET /profile/:sub, should retrieve a user with profile data but no subscription', async () => {
    const resp = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_WITH_PROFILE}`
    );

    const profile = resp.body.profile;
    const bizProfile = resp.body.bizProfile;
    const posts = resp.body.posts;
    expect(resp.status).toBe(200);

    expect(profile).toEqual({
      sub: process.env.TEST_SUB_WITH_PROFILE,
      createdAt: expect.any(String),
      imageUrl: 'image_url_path',
      publicId: 'publicID_profile',
      firstName: 'First',
      lastName: 'Last',
      bio: 'Bio for profile user',
      socialMediaLinks: null,
    });
    expect(bizProfile).toEqual(null);
    expect(bizProfile).toBe(null);
    expect(posts).toEqual([]);
    expect(posts.length).toBe(0);
  });

  // testing new user with user profile data but no customer profile data
  // and are a paid customer and  have active subscription
  it('GET /profile/:sub, should retrieve a user with user profile data but no customer profile data', async () => {
    const resp = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_CUSTOMER_NO_PROFILE}`
    );

    const profile = resp.body.profile;
    const bizProfile = resp.body.bizProfile;
    const posts = resp.body.posts;
    expect(resp.status).toBe(200);
    expect(profile).toEqual({
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      createdAt: expect.any(String),
      imageUrl: null,
      publicId: null,
      firstName: null,
      lastName: null,
      bio: null,
      socialMediaLinks: null,
    });

    expect(bizProfile).toEqual({
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
      awsSub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      name: null,
      displayName: null,
      websiteUrl: null,
      logoImageUrl: null,
      logoPublicId: null,
    });

    expect(posts).toEqual(expect.any(Array));
    expect(posts).toEqual([
      {
        category: 'SampleCategory1',
        created_at: expect.any(String),
        customer_id: 'stripe-customer-id_noProfile',
        description: 'SampleDescription1',
        display_name: null,
        id: '1',
        image_url: 'sample_image_url_path_1',
        logo_image_url: null,
        num_imgs: '1',
        price: 'SamplePrice1',
        public_id: 'publicID_post_1',
        sub: 'sub_customerNoProfile',
        title: 'SampleTitle1',
      },
      {
        category: 'SampleCategory2',
        created_at: expect.any(String),
        customer_id: 'stripe-customer-id_noProfile',
        description: 'SampleDescription2',
        display_name: null,
        id: '2',
        image_url: 'sample_image_url_path_2',
        logo_image_url: null,
        num_imgs: '2',
        price: 'SamplePrice2',
        public_id: 'publicID_post_2',
        sub: 'sub_customerNoProfile',
        title: 'SampleTitle2',
      },
    ]);
  });

  // testing fully paid user with active subscription
  it('GET /profile/:sub should fetch the correct user/customer profile structure', async () => {
    const resp = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_FULL_CUSTOMER}`
    );

    const profile = resp.body.profile;
    const bizProfile = resp.body.bizProfile;
    const posts = resp.body.posts;

    // 1. Test fixed properties:
    expect(resp.status).toBe(200);
    expect(profile).toEqual({
      sub: process.env.TEST_SUB_FULL_CUSTOMER,
      createdAt: expect.any(String),
      imageUrl: expect.any(String),
      publicId: expect.any(String),
      firstName: expect.any(String),
      lastName: expect.any(String),
      bio: expect.any(String),
      socialMediaLinks: null,
    });
    expect(bizProfile).toEqual({
      awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      displayName: expect.any(String),
      logoImageUrl: expect.any(String),
      logoPublicId: expect.any(String),
      name: expect.any(String),
      websiteUrl: expect.any(String),
    });
    expect(posts).toEqual(expect.any(Array));
    expect(posts).toEqual([
      {
        category: 'SampleCategory3',
        created_at: expect.any(String),
        customer_id: 'stripe-customer-id_full',
        description: 'SampleDescription3',
        display_name: 'Display Name',
        id: '3',
        image_url: 'sample_image_url_path_3',
        logo_image_url: 'logo_image_url_path',
        num_imgs: '1',
        price: 'SamplePrice3',
        public_id: 'publicID_post_3',
        sub: 'sub_fullCustomer',
        title: 'SampleTitle3',
      },
      {
        category: 'SampleCategory4',
        created_at: expect.any(String),
        customer_id: 'stripe-customer-id_full',
        description: 'SampleDescription4',
        display_name: 'Display Name',
        id: '4',
        image_url: 'sample_image_url_path_4',
        logo_image_url: 'logo_image_url_path',
        num_imgs: '2',
        price: 'SamplePrice4',
        public_id: 'publicID_post_4',
        sub: 'sub_fullCustomer',
        title: 'SampleTitle4',
      },
    ]);
  });

  it('GET /profile/:wrongSub should return 404 if user not found', async () => {
    const resp = await request(app).get('/api/v1/profile/wrong-sub');
    expect(resp.status).toBe(404);
    expect(resp.body.error).toBe('User profile not found');
  });

  it('GET /profile/:sub should handle database connection failure', async () => {
    const redisClient = await getRedisClient();

    // Ensure Redis is cleared before testing
    await redisClient.del(`profile:${process.env.TEST_SUB_FULL_CUSTOMER}`);
    // Mock the database function to throw an error
    jest.spyOn(AWSUser, 'getCognitoUserBySub').mockImplementation(() => {
      throw new Error(
        'ERROR: this is thrown to represent connection failure for GET /profile/:sub test'
      );
    });

    // Send the request (should trigger the mocked failure)
    const response = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_FULL_CUSTOMER}`
    );

    // Expect a 500 error since the database function is mocked to fail
    expect(response.status).toBe(500);

    jest.restoreAllMocks();
    await redisClient.del(`profile:${process.env.TEST_SUB_FULL_CUSTOMER}`);
  });

  it('GET /profile/:sub should handle a profile with missing fields', async () => {
    const response = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_INCOMPLETE_PROFILE}`
    );

    // Assert the response status and the structure of the returned profile
    expect(response.status).toBe(200);
    expect(response.body.profile).toMatchObject({
      // Expected properties, possibly with some missing
      sub: process.env.TEST_SUB_INCOMPLETE_PROFILE,
      createdAt: expect.any(String),
      imageUrl: '',
      publicId: '',
      firstName: '',
      lastName: '',
      bio: null,
      socialMediaLinks: null,
    });
  });

  // testing new user/ no profile data yet, update with all fields
  it('PUT /profile/user-update, should update a user with no profile data', async () => {
    mockUser = {
      email: process.env.TEST_EMAIL_NO_PROFILE,
      sub: process.env.TEST_SUB_NO_PROFILE,
    };
    const resp = await request(app).put('/api/v1/profile/user-update').send({
      firstName: 'First',
      lastName: 'Last',
      bio: 'Bio for profile user',
      imageUrl: 'image_url_path',
      publicId: 'publicID_profile',
      socialMediaLinks: {},
    });

    const profile = resp.body;

    expect(resp.status).toBe(200);
    expect(profile).toEqual({
      id: '1',
      sub: process.env.TEST_SUB_NO_PROFILE,
      email: process.env.TEST_EMAIL_NO_PROFILE,
      customerId: null,
      createdAt: expect.any(String),
      imageUrl: 'image_url_path',
      publicId: 'publicID_profile',
      firstName: 'First',
      lastName: 'Last',
      bio: 'Bio for profile user',
      emailHash: expect.any(String),
      socialMediaLinks: {},
    });
  });

  // test customer profile update with all fields
  it('PUT /profile/customer-update, should update a customer profile', async () => {
    // Mock user data
    mockUser = {
      email: process.env.TEST_EMAIL_CUSTOMER_NO_PROFILE,
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        displayName: 'Display Name New',
        websiteUrl: 'Website URL New',
        logoImageUrl: 'Logo Image URL New',
        logoPublicId: 'Logo Public ID New',
      });

    const bizProfile = resp.body;

    expect(resp.status).toBe(200);
    expect(bizProfile).toEqual({
      awsSub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      confirmed: true,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
      displayName: 'Display Name New',
      email: expect.any(String),
      logoImageUrl: 'Logo Image URL New',
      logoPublicId: 'Logo Public ID New',
      name: null,
      phone: null,
      websiteUrl: 'Website URL New',
      emailHash: expect.any(String),
    });

    // reset mock data
    mockUser = {
      email: process.env.TEST_EMAIL_CUSTOMER_NO_PROFILE,
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };

    // reset Mock customer data
    mockCustomer = {
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };
  });

  // testing customer update partial data
  it('PUT /profile/customer-update, should update a customer profile with partial data', async () => {
    // Mock user data
    mockUser = {
      email: process.env.TEST_EMAIL_FULL_CUSTOMER,
      sub: process.env.TEST_SUB_FULL_CUSTOMER,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    };

    // Mock customer data
    mockCustomer = {
      sub: process.env.TEST_SUB_FULL_CUSTOMER,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
    };

    const resp = await request(app)
      .put('/api/v1/profile/customer-update')
      .send({
        displayName: 'Display Name New',
        websiteUrl: 'Website URL New',
      });

    const bizProfile = resp.body;

    expect(resp.status).toBe(200);
    expect(bizProfile).toEqual({
      awsSub: process.env.TEST_SUB_FULL_CUSTOMER,
      confirmed: true,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER,
      displayName: 'Display Name New',
      email: process.env.TEST_EMAIL_FULL_CUSTOMER,
      logoImageUrl: null,
      logoPublicId: null,
      name: 'FullName',
      phone: '555-1234',
      websiteUrl: 'Website URL New',
      emailHash: expect.any(String),
    });

    // reset mock data
    mockUser = {
      email: process.env.TEST_EMAIL_CUSTOMER_NO_PROFILE,
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };

    // reset Mock customer data
    mockCustomer = {
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };
  });

  // test upload user avatar image to S3
  it('POST /profile/avatar-upload should upload user avatar image to S3', async () => {
    // Create fake buffers to simulate image files
    const fakeImageBuffer1 = Buffer.from('fake-image-content-1', 'base64');

    const response = await request(app)
      .post('/api/v1/profile/avatar-upload')
      .attach('avatar', fakeImageBuffer1, 'test-image-1.jpg');

    expect(response.status).toBe(200);
    expect(response.text).toContain(process.env.CLOUDFRONT_DOMAIN);
  });

  // test delete user avatar image from S3

  // test upload customer logo image to S3
  it('POST /profile/logo-upload, should upload a customer logo image to S3', async () => {
    // Create fake buffers to simulate image files
    const fakeImageBuffer1 = Buffer.from('fake-image-content-1', 'base64');

    const response = await request(app)
      .post('/api/v1/profile/logo-upload')
      .attach('logo', fakeImageBuffer1, 'test-image-1.jpg');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      publicId: expect.any(String),
      secureUrl: expect.stringMatching(/https:\/\/.*\.cloudfront\.net\/.*/),
    });
    expect(response.text).toContain(process.env.CLOUDFRONT_DOMAIN);
  });

  it('POST /profile/avatar-delete should return a 400 error if public_id is not provided', async () => {
    const response = await request(app)
      .post('/api/v1/profile/avatar-delete')
      .send({}); // Empty body, no public_id

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Public ID is required');
  });

  it('POST /profile/avatar-delete should return a 400 error if public_id is invalid', async () => {
    const response = await request(app)
      .post('/api/v1/profile/avatar-delete')
      .send({ superduper: 'hi' }); // Empty body, no public_id

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Public ID is required');
  });

  it('GET /profile/:nonExistingSub should return 404 for non-existent user', async () => {
    const nonExistingSub = 'non-existent-sub';
    const response = await request(app).get(
      `/api/v1/profile/${nonExistingSub}`
    );

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('User profile not found');
  });

  it('GET /profile/:sub should handle database connection failure', async () => {
    // Spy on the method and mock its implementation temporarily
    const spy = jest.spyOn(AWSUser, 'getCognitoUserBySub');
    spy.mockImplementationOnce(() =>
      Promise.reject(new Error('Database connection failed'))
    );

    const sub = 'valid-sub';
    const response = await request(app).get(`/api/v1/profile/${sub}`);

    expect(response.status).toBe(500); // Assuming your route handles DB errors with a 500 status
    expect(response.body).toContain('Database connection failed');

    // Restore the original implementation
    spy.mockRestore();
  });

  it('POST /profile/avatar-upload should handle S3 upload failure', async () => {
    const { __mockS3Send } = require('@aws-sdk/client-s3');
    __mockS3Send.mockRejectedValueOnce(new Error('S3 upload failed'));

    const response = await request(app)
      .post('/api/v1/profile/avatar-upload')
      .attach('avatar', Buffer.from('test'), 'test-image.jpg');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      'An error occurred while uploading the image'
    );

    __mockS3Send.mockClear();
  });

  it('POST /profile/avatar-delete should handle S3 deletion failure', async () => {
    // Get our mock function
    const { __mockS3Send } = require('@aws-sdk/client-s3');

    // Set up the mock to reject for this test
    __mockS3Send.mockRejectedValueOnce(new Error('S3 deletion failed'));

    const response = await request(app)
      .post('/api/v1/profile/avatar-delete')
      .send({ public_id: 'test-public-id' });

    expect(response.status).toBe(500);
    // Update this expectation to match your actual error message
    expect(response.body.error).toContain('S3 deletion failed');

    // Clean up
    __mockS3Send.mockClear();
  });

  it('POST /profile/avatar-delete should successfully delete image from database', async () => {
    // Get reference to the mocked client
    const { S3Client } = require('@aws-sdk/client-s3');
    const mockSend = S3Client().send;

    const response = await request(app)
      .post('/api/v1/profile/avatar-delete')
      .send({ public_id: 'test-public-id' });

    // Verify the mock was called
    expect(mockSend).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Image deleted successfully');
  });

  it('GET /profile/:sub should cache the response in Redis', async () => {
    const redisClient = await getRedisClient();
    const cacheKey = `profile:${process.env.TEST_SUB_FULL_CUSTOMER}`;
    const cacheKey2 = `bizProfile:${process.env.TEST_SUB_FULL_CUSTOMER}`;
    const cacheKey3 = `profilePosts:${process.env.TEST_SUB_FULL_CUSTOMER}`;

    // Ensure Redis cache is empty before starting
    await Promise.all([
      redisClient.del(cacheKey),
      redisClient.del(cacheKey2),
      redisClient.del(cacheKey3),
    ]);

    // Spy on the database function to track calls
    const dbSpy = jest.spyOn(AWSUser, 'getCognitoUserBySub');

    // First request (should hit the database)
    const response1 = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_FULL_CUSTOMER}`
    );

    expect(response1.status).toBe(200);
    expect(dbSpy).toHaveBeenCalledTimes(1); // Database should be called

    // Now, fetch from Redis to check that the data was stored
    const cachedProfile = await redisClient.get(cacheKey);
    const cachedBizProfile = await redisClient.get(cacheKey2);
    const cachedPosts = await redisClient.get(cacheKey3);

    expect(cachedProfile).not.toBeNull();
    expect(cachedBizProfile).not.toBeNull();
    expect(cachedPosts).not.toBeNull();

    // Second request (should now hit Redis, NOT the database)
    const response2 = await request(app).get(
      `/api/v1/profile/${process.env.TEST_SUB_FULL_CUSTOMER}`
    );

    expect(response2.status).toBe(200);
    expect(dbSpy).toHaveBeenCalledTimes(1); // Database should NOT be called again
    expect(response2.body).toEqual(response1.body); // Ensure cached response matches

    // Cleanup Redis
    await Promise.all([
      redisClient.del(cacheKey),
      redisClient.del(cacheKey2),
      redisClient.del(cacheKey3),
    ]);

    // Restore mocks to prevent test interference
    jest.restoreAllMocks();
  });

  it('GET /profile/:sub should expire cache after TTL', async () => {
    const redisClient = await getRedisClient();
    const cacheKey = `profile:${process.env.TEST_SUB_FULL_CUSTOMER}`;

    // 🔹 Step 1: Ensure Redis is cleared from previous tests
    await redisClient.del(cacheKey);

    // 🔹 Step 2: Set fresh cache with short TTL
    await redisClient.set(
      cacheKey,
      JSON.stringify({ firstName: 'Temporary' }),
      { EX: 2 }
    );

    // Confirm it's set
    let cachedProfile = await redisClient.get(cacheKey);
    expect(cachedProfile).not.toBeNull(); // Cache should exist before TTL expires

    // Check TTL is actually counting down
    const ttlBefore = await redisClient.ttl(cacheKey);
    console.info(`TTL before waiting: ${ttlBefore} seconds`);
    expect(ttlBefore).toBeGreaterThan(0);

    // 🔹 Step 3: Wait 3 seconds (ensuring expiration passes)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 🔹 Step 4: Verify Redis has expired the cache
    cachedProfile = await redisClient.get(cacheKey);
    const ttlAfter = await redisClient.ttl(cacheKey);
    console.info(`TTL after waiting: ${ttlAfter} seconds`);

    expect(ttlAfter).toBe(-2); // Redis should confirm the key is gone
    expect(cachedProfile).toBeNull(); // Data should no longer exist

    // 🔹 Step 5: Final Cleanup (probably redundant but safe)
    await redisClient.del(cacheKey);
  });

  it('PUT /profile/user-update should invalidate cached profile', async () => {
    const redisClient = await getRedisClient();
    const cacheKey = `profile:${process.env.TEST_SUB_CUSTOMER_NO_PROFILE}`;
    mockUser = {
      email: process.env.TEST_EMAIL_CUSTOMER_NO_PROFILE,
      sub: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
      customerId: process.env.TEST_STRIPE_CUSTOMER_ID_NO_PROFILE,
    };
    // Pre-cache profile data
    await redisClient.set(cacheKey, JSON.stringify({ firstName: 'Old Name' }), {
      EX: 86400,
    });

    // Confirm cache exists
    let cachedProfile = await redisClient.get(cacheKey);
    expect(JSON.parse(cachedProfile)).toEqual({ firstName: 'Old Name' });

    // Send update request
    await request(app).put('/api/v1/profile/user-update').send({
      sub: process.env.TEST_SUB_FULL_CUSTOMER,
      firstName: 'New Name',
      lastName: 'New Last',
      bio: 'New bio',
      imageUrl: 'newImageUrl',
      publicId: 'newPublicId',
      socialMediaLinks: {},
    });

    // Verify cache is deleted after update
    cachedProfile = await redisClient.get(cacheKey);

    expect(cachedProfile).toBeNull(); // Cache should be gone

    // Cleanup
    await redisClient.del(cacheKey);
  });
});
