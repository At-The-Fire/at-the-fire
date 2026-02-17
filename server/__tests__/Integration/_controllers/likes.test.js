const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const Likes = require('../../../lib/models/Likes.js');
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
      callback(null, { sub: 'sub_noProfile' });
    } else {
      // Simulate verification failure
      callback(new Error('Invalid token'));
    }
  }),
  decode: jest.fn((token) => {
    if (token === 'valid.free.user.id.token') {
      return { sub: 'sub_noProfile' }; // Simulated structure of a valid decoded JWT
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
      return { sub: 'sub_withProfile' };
    }
    return null;
  });

  jwt.verify.mockImplementation((token, getKey, options, callback) => {
    if (
      token === 'valid.subscriber.access.token' ||
      token === 'valid.subscriber.id.token' ||
      token === 'valid.subscriber.refresh.token'
    ) {
      callback(null, { sub: 'sub_withProfile' });
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

describe('Likes Routes Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });

  afterAll(() => {
    pool.end();
  });

  describe('POST /toggle/:postId', () => {
    it('toggles a like in the DB (integration test)', async () => {
      // Create a sample post in your DB, or ensure ID=1 is valid
      // For example, if your seeds set up a post with id=1, we can test that.

      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // First call - should add a like
      const res1 = await request(app)
        .post('/api/v1/likes/toggle/1')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send();

      expect(res1.status).toBe(200);
      expect(res1.body).toHaveProperty('liked', true);

      // Check DB to confirm the like was inserted
      const countAfterFirst = await Likes.getLikeCount(1);
      expect(countAfterFirst).toBe(1);

      // Second call - should remove the like
      const res2 = await request(app)
        .post('/api/v1/likes/toggle/1')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send();

      expect(res2.status).toBe(200);
      expect(res2.body).toHaveProperty('liked', false);

      // Check DB to confirm the like was removed
      const countAfterSecond = await Likes.getLikeCount(1);
      expect(countAfterSecond).toBe(0);
    });
  });

  describe('POST /batch', () => {
    it('returns count & liked status for multiple postIds with real DB calls', async () => {
      // Suppose seeds created posts with IDs [1,2].
      // Maybe user sub_withProfile liked post 1 in a seed, or we do it above.

      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const res = await request(app)
        .post('/api/v1/likes/batch')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({ postIds: [1, 2] });

      expect(res.status).toBe(200);
      // Confirm actual DB counts are correct, e.g. { '1': {liked: true, count: 1}, ... }
    });
  });

  describe('GET /count/:postId', () => {
    it('returns the like count from the DB', async () => {
      const res = await request(app).get('/api/v1/likes/count/1');
      expect(res.status).toBe(200);
      // Check the returned count matches what's actually stored in DB
    });
  });

  describe('GET /status/:postId', () => {
    it('returns isLiked if user has liked post in DB', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const res = await request(app)
        .get('/api/v1/likes/status/1')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(res.status).toBe(200);
      // Compare res.body.isLiked with what's actually in DB
    });
  });

  describe('Rate Limiting on POST /toggle/:postId', () => {
    it('returns 429 when too many requests are made in a short period', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      let lastResponse;
      for (let i = 0; i < 151; i++) {
        lastResponse = await request(app)
          .post('/api/v1/likes/toggle/1')
          .set('Cookie', [
            `accessToken=${subscribedUserAccessToken};`,
            `idToken=${subscribedUserIdToken};`,
            `refreshToken=${subscribedUserRefreshToken};`,
          ])
          .send();
        if (lastResponse.status === 429) break;
      }

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.message).toBe('Too many requests, slow down.');
    });
  });
});
