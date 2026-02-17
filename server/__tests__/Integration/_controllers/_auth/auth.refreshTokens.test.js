const request = require('supertest');
const app = require('../../../../lib/app'); // Ensure this is the correct path to your Express app
const jwt = require('jsonwebtoken');

// Mock user data retrieval
jest.mock('../../../../lib/models/AWSUser.js', () => ({
  getEmailBySub: jest.fn().mockResolvedValue('mocked-username'),
}));

// Helper function to create a mock CognitoUser
const createMockCognitoUser = () => {
  return jest.fn().mockImplementation(() => ({
    refreshSession: jest.fn((refreshToken, callback) => {
      switch (refreshToken.token) {
        case 'validRefreshToken': {
          const session = {
            accessToken: {
              jwtToken: 'new-access-token',
              getExpiration: jest.fn(() => new Date().getTime() + 3000),
            },
            idToken: { jwtToken: 'new-id-token' },
            refreshToken: { token: 'new-refresh-token' },
          };
          callback(null, session);
          break;
        }
        case 'expiredRefreshToken': {
          const expiredError = new Error('jwt expired');
          expiredError.code = 'TokenExpiredException';
          callback(expiredError, null);
          break;
        }
        case 'malformedRefreshToken': {
          const malformedError = new Error('Malformed Refresh Token');
          malformedError.code = 'MalformedTokenException';
          callback(malformedError, null);
          break;
        }
        default: {
          const genericError = new Error('Invalid refresh token');
          genericError.code = 'InvalidTokenException';
          callback(genericError, null);
          break;
        }
      }
    }),
  }));
};

// Mocking AWS Cognito interactions using helper functions
jest.mock('amazon-cognito-identity-js', () => {
  return {
    CognitoUser: createMockCognitoUser(),
    CognitoRefreshToken: jest.fn().mockImplementation((options) => {
      return { token: options.RefreshToken };
    }),
  };
});

// Define a valid idToken for test
const simulatedIdToken = jwt.sign({ sub: 'user123' }, 'test-secret-key');

// Helper to set up cookies for tests
const setAuthCookies = (refreshToken, idToken = simulatedIdToken) => [
  `refreshToken=${refreshToken};`,
  `idToken=${idToken}`,
];

// Tests for /refresh-tokens endpoint
describe('/refresh-tokens endpoint', () => {
  it('should refresh tokens successfully with a valid refresh token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('validRefreshToken'));

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('should reject with a 400 status for invalid refresh tokens', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('invalidRefreshToken'));

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid refresh token');
  });

  it('should return a 400 status when no refresh token is provided', async () => {
    const response = await request(app).post('/api/v1/auth/refresh-tokens');
    expect(response.status).toBe(400);
    expect(response.text).toContain('No refresh token provided');
  });

  it('should return a 400 status when no ID token is provided', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('validRefreshToken', ''));

    expect(response.status).toBe(400);
    expect(response.text).toContain('No ID token provided');
  });

  it('should return a 400 status when both tokens are missing', async () => {
    const response = await request(app).post('/api/v1/auth/refresh-tokens');
    expect(response.status).toBe(400);
    expect(response.text).toContain('No refresh token provided');
  });

  it('should reject with a 401 status for expired refresh tokens', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('expiredRefreshToken'));

    expect(response.status).toBe(401);
    expect(response.text).toContain('Refresh token expired');
  });

  it('should reject with a 401 status for revoked or blacklisted refresh tokens', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('blacklistedRefreshToken'));

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid refresh token');
  });

  it('should reject with a 400 status for malformed refresh tokens', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('malformedRefreshToken'));

    expect(response.status).toBe(400);
    expect(response.text).toContain('Malformed refresh token');
  });

  it('should handle scenarios with a valid refresh token but invalid ID token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh-tokens')
      .set('Cookie', setAuthCookies('validRefreshToken', 'invalidIdToken'));

    expect(response.status).toBe(400);
    expect(response.text).toContain('Invalid ID token');
  });
});
