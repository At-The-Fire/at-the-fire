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

jest.mock('../../../lib/models/Likes.js', () => ({
  toggleLike: jest.fn(),
  getLikeCount: jest.fn(),
  getPostLikeStatus: jest.fn(),
}));

describe('Likes Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    return setup(pool);
  });
  afterAll(() => pool.end());

  describe('POST /toggle/:postId', () => {
    it('toggles like and returns liked true when toggleLike returns a value', async () => {
      Likes.toggleLike.mockResolvedValue({ some: 'value' });
      Likes.getLikeCount.mockResolvedValue(5);
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const res = await request(app)
        .post('/api/v1/likes/toggle/1')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ liked: true, count: 5 });
      expect(Likes.toggleLike).toHaveBeenCalledWith({
        sub: 'sub_withProfile',
        post_id: 1,
      });
    });

    it('toggles like and returns liked false when toggleLike returns null', async () => {
      Likes.toggleLike.mockResolvedValue(null);
      Likes.getLikeCount.mockResolvedValue(10);
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const res = await request(app)
        .post('/api/v1/likes/toggle/2')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ liked: false, count: 10 });
      expect(Likes.toggleLike).toHaveBeenCalledWith({
        sub: 'sub_withProfile',
        post_id: 2,
      });
    });
  });

  describe('POST /batch', () => {
    it('returns 400 when postIds is not an array', async () => {
      const res = await request(app)
        .post('/api/v1/likes/batch')
        .send({ postIds: 'notAnArray' });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'postIds must be an array' });
    });

    it('returns likes status and counts for unauthenticated user', async () => {
      Likes.getLikeCount.mockImplementation((postId) =>
        Promise.resolve(postId * 2)
      );
      const res = await request(app)
        .post('/api/v1/likes/batch')
        .send({ postIds: [1, 2] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        1: { liked: false, count: 2 },
        2: { liked: false, count: 4 },
      });
      expect(Likes.getPostLikeStatus).not.toHaveBeenCalled();
    });

    it('returns likes status and counts for authenticated user', async () => {
      Likes.getLikeCount.mockImplementation((postId) =>
        Promise.resolve(postId * 3)
      );
      Likes.getPostLikeStatus.mockImplementation(({ post_id }) =>
        Promise.resolve(post_id === 1)
      );
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
      expect(res.body).toEqual({
        1: { liked: true, count: 3 },
        2: { liked: false, count: 6 },
      });
      expect(Likes.getPostLikeStatus).toHaveBeenCalledWith({
        sub: 'sub_withProfile',
        post_id: 1,
      });
      expect(Likes.getPostLikeStatus).toHaveBeenCalledWith({
        sub: 'sub_withProfile',
        post_id: 2,
      });
    });
  });

  describe('GET /count/:postId', () => {
    it('returns like count for a given postId', async () => {
      Likes.getLikeCount.mockResolvedValue(12);
      const res = await request(app).get('/api/v1/likes/count/1').send();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ count: 12 });
      expect(Likes.getLikeCount).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /status/:postId', () => {
    it('returns isLiked false for unauthenticated user', async () => {
      const res = await request(app).get('/api/v1/likes/status/1').send();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isLiked: false });
      expect(Likes.getPostLikeStatus).not.toHaveBeenCalled();
    });

    it('returns isLiked status for authenticated user', async () => {
      Likes.getPostLikeStatus.mockResolvedValue(true);
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
        ])
        .send();

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isLiked: true });
      expect(Likes.getPostLikeStatus).toHaveBeenCalledWith({
        sub: 'sub_withProfile',
        post_id: 1,
      });
    });
  });
});
