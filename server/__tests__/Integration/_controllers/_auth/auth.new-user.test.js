const pool = require('../../../../lib/utils/pool.js');
const setup = require('../../../../data/setup.js');
const request = require('supertest');
const app = require('../../../../lib/app.js');

const yourAuthMiddleware = require('../../../../lib/middleware/authenticateAWS.js');
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn((token, secretOrPublicKey, options, callback) => {
    if (token === 'validToken') {
      // Simulate a successful verification by calling the callback with no error
      callback(null, { sub: 'sampleSub' }); // The `sub` here is mock data representing the decoded payload
    } else {
      // Simulate a failed verification by calling the callback with an error
      callback(new Error('Token verification failed!'));
    }
  }),

  decode: jest.fn((token) => {
    if (token === 'validToken' || token === 'validIdToken') {
      return { sub: 'sampleSub' }; // Simulating a decoded payload with a `sub` field
    } else {
      return null;
    }
  }),
}));

describe('AWS Cognito User tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    pool.end();
  });

  // User creation tests
  it('should create a new user successfully', async () => {
    const mockUserData = { email: 'test2@example.com', sub: 'sub_2' };
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send(mockUserData);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      'Account created successfully, check email for verification!'
    );
  });

  it('should throw error if cookies are not present', async () => {
    const response = await request(app).post('/api/v1/create-checkout-session');
    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      'You must be signed in to continue: missing or invalid token'
    );
  });

  it('should return error for an existing email', async () => {
    const mockUserData = {
      email: 'noProfile@example.com',
      sub: 'new-sub',
      // sub: 'sub_noProfile',
    };
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send(mockUserData);

    // expect(response.body).toBe(409);
    expect(response.body).toBe('Email already exists.');
  });

  it('should not overwrite existing user data with same sub', async () => {
    const initialUserData = {
      email: 'initial@example.com',
      sub: 'duplicate-sub',
    };
    const overwriteAttemptData = {
      email: 'overwrite@example.com',
      sub: 'duplicate-sub',
    };
    await request(app).post('/api/v1/auth/new-user').send(initialUserData);

    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send(overwriteAttemptData);

    expect(response.status).toBe(409);
    expect(response.body).toBe('Sub already exists.');
  });

  it('should return error for missing data', async () => {
    const mockUserData = { email: 'test@example.com' }; // Missing 'sub' intentionally
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send(mockUserData);

    expect(response.status).toBe(400);
    expect(response.body).toBe('Sub is required.');

    const mockUserData2 = { sub: 'sub_3' }; // Missing 'email' intentionally
    const response2 = await request(app)
      .post('/api/v1/auth/new-user')
      .send(mockUserData2);

    expect(response2.status).toBe(400);
    expect(response2.body).toBe('Email is required.');
  });
  it('should handle incorrect email format', async () => {
    const mockUserData = { email: 'testexample', sub: 'test-sub' }; // Invalid email format
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send(mockUserData);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid email format.');
  });

  // Data type validation tests
  it('should return a 400 error when email is sent as an object', async () => {
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send({ email: { bad: 'data@example.com' }, sub: 'validSub' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid data format.');
  });
  it('should return a 400 error when email is sent as an array', async () => {
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send({
        email: ['data@example.com', 'another@example.com'],
        sub: 'validSub',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid data format.');
  });
  it('should return a 400 error when sub is sent as an object', async () => {
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send({ email: 'data@example.com', sub: { bad: 'validSub' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid data format.');
  });
  it('should return a 400 error when sub is sent as an array', async () => {
    const response = await request(app)
      .post('/api/v1/auth/new-user')
      .send({ email: 'data@example.com', sub: ['validSub1', 'validSub2'] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid data format.');
  });

  // Cookie creation tests
  it('should set cookies correctly when provided with a valid session', async () => {
    const mockSession = {
      idToken: { jwtToken: 'mockIdToken' },
      accessToken: { jwtToken: 'mockAccessToken' },
      refreshToken: { token: 'mockRefreshToken' },
    };

    const response = await request(app)
      .post('/api/v1/auth/create-cookies')
      .send(mockSession);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Cookies created successfully!');

    // check to see if there are 3 cookies
    expect(response.headers['set-cookie'].length).toBe(3);

    // check for the access token cookie
    expect(response.headers['set-cookie'][0]).toContain(
      'accessToken=mockAccessToken'
    );
    // check for the id token cookie
    expect(response.headers['set-cookie'][1]).toContain('idToken=mockIdToken');
    // check for the refresh token cookie
    expect(response.headers['set-cookie'][2]).toContain(
      'refreshToken=mockRefreshToken'
    );
  });

  it('should handle missing tokens gracefully', async () => {
    const mockSession = {
      idToken: { jwtToken: 'mockIdToken' },
      accessToken: { jwtToken: 'mockAccessToken' },
      // refreshToken intentionally left out
    };

    const response = await request(app)
      .post('/api/v1/auth/create-cookies')
      .send(mockSession);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatchInlineSnapshot(
      // eslint-disable-next-line quotes
      `"One or more tokens are missing."`
    );
  });

  it('should reject malformed tokens', async () => {
    // Use an invalid token to simulate verification failure
    const invalidToken = 'invalidToken';

    const mockReq = {
      cookies: {
        accessToken: invalidToken,
        idToken: invalidToken,
        refreshToken: invalidToken,
      },
    };

    const mockRes = {
      statusCode: null,
      status(s) {
        this.statusCode = s;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
      send(payload) {
        this.payload = payload;
        return this;
      },
    };

    const mockNext = jest.fn();

    try {
      await yourAuthMiddleware(mockReq, mockRes, mockNext);
      throw new Error('Expected middleware to throw an error, but it did not.');
    } catch (error) {
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.payload.message).toContain(
        'Invalid token structure: sub is missing'
      );
    }
  });

  it('should set cookie configuration based on environment variable', async () => {
    process.env.SECURE_COOKIES = 'true'; // Mocking the environment variable

    const mockSession = {
      idToken: { jwtToken: 'mockIdToken' },
      accessToken: { jwtToken: 'mockAccessToken' },
      refreshToken: { token: 'mockRefreshToken' },
    };

    const response = await request(app)
      .post('/api/v1/auth/create-cookies')
      .send(mockSession);

    expect(response.headers['set-cookie'][0]).toContain('SameSite=None'); // Or other configurations you expect
  });
  it('should handle an empty session object gracefully', async () => {
    const mockSession = {}; // Sending an empty session object

    const response = await request(app)
      .post('/api/v1/auth/create-cookies')
      .send(mockSession);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('Session data is missing.');
  });

  // Cookie clearing tests
  it('should clear cookies successfully', async () => {
    const response = await request(app).delete('/api/v1/auth/clear-cookies');
    expect(response.statusCode).toBe(204);
    expect(response.body).toEqual({});
    expect(response.headers['set-cookie']).toEqual([
      'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None',
      'idToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None',
      'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None',
    ]);
  });
  it('should handle attempts to clear cookies that do not exist gracefully', async () => {
    const response = await request(app)
      .delete('/api/v1/auth/clear-cookies')
      .send();
    expect(response.status).toBe(204); // It should still return a 204 No Content
  });
});
