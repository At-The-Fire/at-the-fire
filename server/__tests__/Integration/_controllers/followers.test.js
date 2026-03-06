const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');

// Importing jsonwebtoken to mock its verify function
const jwt = require('jsonwebtoken');

// Mocking the jsonwebtoken module to mock `verify` and `decode`
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'), // Preserves actual implementations of other jwt functions
  verify: jest.fn((token, getKey, options, callback) => {
    if (
      token === 'valid.free.user.access.token' ||
      token === 'valid.free.user.id.token' ||
      token === 'valid.free.user.refresh.token'
    ) {
      // Simulate a successful token verification
      callback(null, { sub: process.env.TEST_SUB_NO_PROFILE });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      return { sub: process.env.TEST_SUB_NO_PROFILE }; // Simulated structure of a valid decoded JWT
    }
    return null; // Invalid token case
  }),
}));

// Abstract function to setup mock tokens, JWT, and database responses for subscribed users
const setupSubscribedUserMocks = () => {
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: process.env.TEST_SUB_WITH_PROFILE };
    }
    return null;
  });

  jwt.verify.mockImplementation((token, getKey, options, callback) => {
    if (
      token === 'valid.subscriber.access.token' ||
      token === 'valid.subscriber.id.token' ||
      token === 'valid.subscriber.refresh.token'
    ) {
      callback(null, { sub: process.env.TEST_SUB_WITH_PROFILE });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  return {
    subscribedUserAccessToken,
    subscribedUserIdToken,
    subscribedUserRefreshToken,
  };
};

describe('Follower Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    pool.end();
  });

  it('should create a new follower relationship when authenticated', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ followedId: process.env.TEST_SUB_CUSTOMER_NO_PROFILE });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      followerId: process.env.TEST_SUB_WITH_PROFILE,
      followedId: process.env.TEST_SUB_CUSTOMER_NO_PROFILE,
    });
  });

  it('should delete a follower relationship when authenticated', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .delete(`/api/v1/followers/${process.env.TEST_SUB_FULL_CUSTOMER}`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it('should get follower and following counts for a user', async () => {
    const response = await request(app).get(
      `/api/v1/followers/count/${process.env.TEST_SUB_FULL_CUSTOMER}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      followerCount: 1,
      followingCount: 0,
    });
  });

  it('should return 401 when trying to create follower relationship without auth', async () => {
    const response = await request(app)
      .post('/api/v1/followers')
      .send({ followedId: process.env.TEST_SUB_FULL_CUSTOMER });

    expect(response.status).toBe(401);
  });

  it('should return 401 when using invalid token', async () => {
    const response = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', ['accessToken=invalid.token;', 'idToken=invalid.token;'])
      .send({ followedId: process.env.TEST_SUB_FULL_CUSTOMER });

    expect(response.status).toBe(401);
  });

  it('should return an empty list if user has no followers', async () => {
    const response = await request(app).get(
      `/api/v1/followers/followers/${process.env.TEST_SUB_WITH_PROFILE}`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ followers: [] });
  });

  it('should not allow a user to follow themselves', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ followedId: process.env.TEST_SUB_WITH_PROFILE });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('You cannot follow yourself.');
  });

  it('should return 404 when checking follower status for a non-existent user', async () => {
    const response = await request(app).get(
      '/api/v1/followers/followers/non-existent-user'
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "User doesn't exist." });
  });

  it('should return true if user is following another user', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();
    const response = await request(app)
      .get(`/api/v1/followers/${process.env.TEST_SUB_FULL_CUSTOMER}/status`)
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ isFollowing: true });
  });

  it('should return 500 if an unexpected error occurs', async () => {
    await pool.query('DROP TABLE followers CASCADE'); // Force error

    const response = await request(app).get(
      '/api/v1/followers/count/test-user-id'
    );

    expect(response.status).toBe(500);
  });

  it('should not allow duplicate follower relationships', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    // First follow request
    const firstResponse = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ followedId: process.env.TEST_SUB_CUSTOMER_NO_PROFILE });

    expect(firstResponse.status).toBe(200);

    // Second follow request should fail
    const response = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ followedId: process.env.TEST_SUB_CUSTOMER_NO_PROFILE });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Already following this user.');
  });

  it('should return 404 when unfollowing a non-existent relationship', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .delete('/api/v1/followers/non-existent-user')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ]);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Follower relationship not found.');
  });

  it('should return 400 when trying to follow a non-existent user', async () => {
    const {
      subscribedUserAccessToken,
      subscribedUserIdToken,
      subscribedUserRefreshToken,
    } = setupSubscribedUserMocks();

    const response = await request(app)
      .post('/api/v1/followers')
      .set('Cookie', [
        `accessToken=${subscribedUserAccessToken};`,
        `idToken=${subscribedUserIdToken};`,
        `refreshToken=${subscribedUserRefreshToken};`,
      ])
      .send({ followedId: 'non-existent-user' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('User does not exist.');
  });
});
