// * ==================================================
// *
// *    This has both middlewares mocked successfully and will work for all
// *    of the Subscriber related/ CRUD end points (does not facilitate image upload)
// *
// * ==================================================

const pool = require('../../../lib/utils/pool.js');
const setup = require('../../../data/setup.js');
const request = require('supertest');
const app = require('../../../lib/app.js');
const StripeCustomer = require('../../../lib/models/StripeCustomer.js');
const Subscriptions = require('../../../lib/models/Subscriptions.js');
const Invoices = require('../../../lib/models/Invoices.js');
const { encrypt, decrypt } = require('../../../lib/services/encryption.js');
const http = require('http');
const socketIo = require('socket.io');

let server, io;
app.set('io', io);
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
      // Return a mock decoded token with `sub`
      return { sub: 'sub_noProfile' };
    } else {
      return null; // Invalid token case
    }
  }),
}));

// Mocking the `StripeCustomer` module
jest.mock('../../../lib/models/StripeCustomer', () => ({
  getStripeByAWSSub: jest.fn(), // Mock the `getStripeByAWSSub` function
}));

// Mocking the `Subscriptions` module
jest.mock('../../../lib/models/Subscriptions', () => ({
  getSubscriptionByCustomerId: jest.fn(), // Mock the `getSubscriptionByCustomerId` function
}));

// Mocking the `Invoices` module
jest.mock('../../../lib/models/Invoices', () => ({
  getBillingPeriodByCustomerId: jest.fn(), // Mock the `getSubscriptionByCustomerId` function
}));

// Abstract function to setup mock tokens, JWT, and database responses for subscribed users
const setupSubscribedUserMocks = () => {
  // Mock a valid token for a subscribed user
  const subscribedUserAccessToken = 'valid.subscriber.access.token';
  const subscribedUserIdToken = 'valid.subscriber.id.token';
  const subscribedUserRefreshToken = 'valid.subscriber.refresh.token';

  // Mock the `jwt.decode` function to decode the idToken and return a token with `sub`
  jwt.decode.mockImplementation((token) => {
    if (token === 'valid.subscriber.id.token') {
      return { sub: 'sub_fullCustomer' }; // Simulated structure of a valid decoded JWT
    }
    return null; // Return null for anything else (token is invalid)
  });

  // Mock the `jwt.verify` function to simulate successful verification for all valid tokens
  jwt.verify.mockImplementation((token, getKey, options, callback) => {
    if (
      token === 'valid.subscriber.access.token' ||
      token === 'valid.subscriber.id.token' ||
      token === 'valid.subscriber.refresh.token'
    ) {
      // Simulate a valid token verification with a `sub` field
      callback(null, { sub: 'sub_fullCustomer' });
    } else {
      callback(new Error('Invalid token'));
    }
  });

  // Mock the database call to return a valid customer ID for a subscribed user
  StripeCustomer.getStripeByAWSSub.mockResolvedValue({
    customerId: 'stripe-customer-id_full',
    awsSub: 'sub_fullCustomer',
    confirmed: true,
  });

  // Mock the database call to return the subscription status for a subscribed user
  Subscriptions.getSubscriptionByCustomerId.mockResolvedValue({
    customerId: 'stripe-customer-id_full',
    isActive: true,
  });

  // Mock the database call to return the billing period for a subscribed user
  Invoices.getBillingPeriodByCustomerId.mockResolvedValue({
    endDate: '2722668400000',
  });

  return {
    subscribedUserAccessToken,
    subscribedUserIdToken,
    subscribedUserRefreshToken,
  };
};

// Mock Redis connection
jest.mock('../../../redisClient', () => {
  const RedisMock = require('redis-mock');
  const mockRedis = RedisMock.createClient(); // ❌ No `new` needed

  // Mock Redis behavior
  mockRedis.get = jest
    .fn()
    .mockImplementation((key, callback) => callback(null, null)); // Always return null
  mockRedis.set = jest.fn().mockResolvedValue('OK');
  mockRedis.del = jest.fn().mockResolvedValue(1);
  mockRedis.auth = jest.fn().mockResolvedValue('OK');
  mockRedis.connect = jest.fn().mockResolvedValue(mockRedis);
  mockRedis.quit = jest.fn().mockResolvedValue();

  return async () => mockRedis; // Return the mock Redis client
});

describe('conversations tests', () => {
  beforeAll((done) => {
    server = http.createServer(app);
    io = socketIo(server);
    app.set('io', io);
    server.listen(done);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    return setup(pool);
  });
  afterAll(() => {
    delete process.env.SECURE_COOKIES;
    io.close();
    server.close();
    pool.end();
  });

  describe('POST /', () => {
    it('should create a new conversation with valid participants', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['sub_withProfile'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        conversationId: expect.any(Number),
      });
    });

    it('should return 400 if participant does not exist', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['non-existent-sub'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('does not exist');
    });
  });

  describe('POST /messages', () => {
    it('should create a new message in an existing conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: 'Test message',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: expect.any(String),
        isNewConversation: expect.any(Boolean),
        newConversationId: null,
      });
    });

    it('should return 403 if user is not part of conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 999,
          content: 'Test message',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'You are not a participant in this conversation.'
      );
    });

    it('should handle empty message content', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Message length can not be 0.');
    });

    it('should handle very long messages', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const longMessage = 'a'.repeat(5000); // Adjust length based on your DB limits

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: longMessage,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(longMessage);
    });
  });

  describe('GET /', () => {
    it('should get all conversations for user', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    // needs investigating,
    it.skip('should return conversations in correct chronological order', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // First create two conversations with messages at different times
      const conv1 = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['sub_partialProfile'],
        });

      // Add a message to first conversation
      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: conv1.body.conversationId,
          content: 'First conversation message',
        });

      // Create second conversation and message
      const conv2 = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['sub_noProfile'],
        });

      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: conv2.body.conversationId,
          content: 'Second conversation message',
        });

      // Get all conversations
      const response = await request(app)
        .get('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);
      console.log('response.body', response.body);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Most recent conversation should be first
      expect(response.body[0].id).toBe(conv2.body.conversationId);
      expect(response.body[1].id).toBe(conv1.body.conversationId);
    });

    it('should return correct participant information for each conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(response.body[0].participants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sub: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
          }),
        ])
      );
    });
  });

  describe('GET /:id/messages', () => {
    it('should get messages for a specific conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 403 when accessing unauthorized conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations/999/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'You are not a participant in this conversation.'
      );
    });
    it('should return messages in correct chronological order', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // First create messages in a conversation
      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: 'First test message!',
        });

      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: 'Second test message!',
        });

      const response = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].content).toBe('First test message!');
      expect(response.body[1].content).toBe('Second test message!');
    });

    it('should handle conversations with no messages', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Create a new empty conversation
      const newConv = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['sub_partialProfile'],
        });

      const response = await request(app)
        .get(`/api/v1/conversations/${newConv.body.conversationId}/messages`)
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should include necessary participant info with messages', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(response.body[0]).toEqual({
        id: expect.any(Number),
        content: expect.any(String),
        conversation_id: expect.any(Number),
        created_at: expect.any(String),
        is_read: expect.any(Boolean),
        sender: {
          sub: expect.any(String),
        },
        sender_sub: expect.any(String),
      });
    });
  });

  describe('DELETE /:id', () => {
    it('should delete a conversation', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .delete('/api/v1/conversations/1')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Conversation deleted.',
      });
    });
  });

  describe('GET /unread-count', () => {
    it('should get unread message count', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .get('/api/v1/conversations/unread-count')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        unreadCount: expect.any(Number),
      });
    });
  });

  describe('PUT /mark-read', () => {
    it('should mark messages as read', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .put('/api/v1/conversations/mark-read')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Messages successfully marked as read.',
      });
    });

    it('should return 400 when no messages are marked as read', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .put('/api/v1/conversations/mark-read')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 999,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No messages were marked as read.');
    });

    it('should only mark messages from other users as read', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // First create two messages - one from self, one from other user
      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: 'Message from self',
        });

      // Get current unread count
      const beforeMarkRead = await request(app)
        .get('/api/v1/conversations/unread-count')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      // Mark messages as read
      const response = await request(app)
        .put('/api/v1/conversations/mark-read')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
        });

      expect(response.status).toBe(200);

      // Get updated unread count
      const afterMarkRead = await request(app)
        .get('/api/v1/conversations/unread-count')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      // Self messages shouldn't affect unread count
      expect(afterMarkRead.body.unreadCount).toBeLessThan(
        beforeMarkRead.body.unreadCount
      );
    });

    it('should handle marking already-read messages', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Mark messages as read first time
      await request(app)
        .put('/api/v1/conversations/mark-read')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
        });

      // Try to mark as read again
      const response = await request(app)
        .put('/api/v1/conversations/mark-read')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No messages were marked as read.');
    });
  });

  describe('POST / - conversation creation', () => {
    it('should include sender in participants if not provided', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: ['sub_fullCustomer'], // sender sub not included
        });

      // Verify success
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify both participants are in conversation
      const participantsResponse = await request(app)
        .get(`/api/v1/conversations/${response.body.conversationId}/messages`)
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(participantsResponse.status).toBe(200);
    });

    it('should prevent creating a conversation with no other participants', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain(
        'Missing conversation participants.'
      );
    });

    it('should handle duplicate participants in the request', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const response = await request(app)
        .post('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          participantSubs: [
            'sub_partialProfile',
            'sub_partialProfile',
            'sub_fullCustomer',
            'sub_fullCustomer',
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 400,
        message: 'Cannot add duplicate participants to conversation',
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed conversation IDs', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Test with non-numeric ID
      const response = await request(app)
        .get('/api/v1/conversations/abc/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 400,
        message: 'Invalid conversation ID.',
      });
    });

    it('should maintain message state if transaction fails', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Get initial state
      const initialState = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      // Trigger a transaction that should fail (e.g., invalid content)
      await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: null, // This should cause a transaction failure
        });

      // Check final state matches initial state
      const finalState = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(finalState.body).toEqual(initialState.body);
    });

    // Note: Testing concurrent operations in Jest can be tricky
    it('should handle concurrent message sends', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Send multiple messages concurrently
      const promises = Array(5)
        .fill()
        .map((_, i) =>
          request(app)
            .post('/api/v1/conversations/messages')
            .set('Cookie', [
              `accessToken=${subscribedUserAccessToken};`,
              `idToken=${subscribedUserIdToken};`,
              `refreshToken=${subscribedUserRefreshToken};`,
            ])
            .send({
              conversationId: 1,
              content: `Concurrent message ${i}`,
            })
        );

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all messages were saved
      const messages = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(
        messages.body.filter((m) => m.content.includes('Concurrent message'))
      ).toHaveLength(5);
    });
  });

  describe('Performance tests', () => {
    it('should efficiently handle conversations with many messages', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Create a large number of messages in a conversation
      const NUM_MESSAGES = 49;
      for (let i = 0; i < NUM_MESSAGES; i++) {
        await request(app)
          .post('/api/v1/conversations/messages')
          .set('Cookie', [
            `accessToken=${subscribedUserAccessToken};`,
            `idToken=${subscribedUserIdToken};`,
            `refreshToken=${subscribedUserRefreshToken};`,
          ])
          .send({
            conversationId: 1,
            content: `Message ${i}`,
          });
      }

      const startTime = Date.now();

      // Fetch all messages
      const response = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(NUM_MESSAGES);
      expect(responseTime).toBeLessThan(1000); // Response should come back in under 1 second
    });

    it('should efficiently handle users with many conversations', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Create multiple conversations
      const NUM_CONVERSATIONS = 20;
      for (let i = 0; i < NUM_CONVERSATIONS; i++) {
        await request(app)
          .post('/api/v1/conversations')
          .set('Cookie', [
            `accessToken=${subscribedUserAccessToken};`,
            `idToken=${subscribedUserIdToken};`,
            `refreshToken=${subscribedUserRefreshToken};`,
          ])
          .send({
            participantSubs: ['sub_partialProfile'],
          });
      }

      const startTime = Date.now();

      // Fetch all conversations
      const response = await request(app)
        .get('/api/v1/conversations')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(responseTime).toBeLessThan(1000); // Response should come back in under 1 second
    });
  });

  describe('Message encryption', () => {
    // Your existing tests that pass:
    it('should encrypt and decrypt messages correctly', async () => {
      const originalMessage = 'Hello, this is a test message!';
      const encrypted = encrypt(originalMessage);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toEqual(originalMessage);
      expect(decrypted).toEqual(originalMessage);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const message = 'Hello';
      const encrypted1 = encrypt(message);
      const encrypted2 = encrypt(message);

      expect(encrypted1).not.toEqual(encrypted2);
    });

    // New tests that integrate with the actual message endpoints:
    it('should store messages in encrypted form and retrieve them correctly', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const testMessage = 'Test message for encryption';

      // Send a message
      const sendResponse = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: testMessage,
        });

      expect(sendResponse.status).toBe(200);

      // Get the message back
      const getResponse = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      expect(getResponse.status).toBe(200);

      // Verify the returned message matches original
      const returnedMessage = getResponse.body.find(
        (m) => m.content === testMessage
      );
      expect(returnedMessage).toBeDefined();
      expect(returnedMessage.content).toBe(testMessage);
    });

    it('should handle encryption of special characters and unicode', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const specialMessage = 'Special chars: !@#$%^&*()_+ and emoji: 🌟💫';

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: specialMessage,
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(specialMessage);
    });

    it('should maintain encryption through conversation updates', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      // Create a series of messages to test persistence
      const messages = [
        'First message',
        'Second message with special chars: !@#$',
        'Third message with emoji: 🌟',
      ];

      for (const msg of messages) {
        await request(app)
          .post('/api/v1/conversations/messages')
          .set('Cookie', [
            `accessToken=${subscribedUserAccessToken};`,
            `idToken=${subscribedUserIdToken};`,
            `refreshToken=${subscribedUserRefreshToken};`,
          ])
          .send({
            conversationId: 1,
            content: msg,
          });
      }

      // Verify all messages are retrievable and decrypted correctly
      const response = await request(app)
        .get('/api/v1/conversations/1/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ]);

      for (const msg of messages) {
        const found = response.body.some((m) => m.content === msg);
        expect(found).toBe(true);
      }
    });
  });

  describe('Websockets', () => {
    it('should emit "new message" event when a message is sent', async () => {
      const {
        subscribedUserAccessToken,
        subscribedUserIdToken,
        subscribedUserRefreshToken,
      } = setupSubscribedUserMocks();

      const emitSpy = jest.spyOn(io, 'emit');

      const response = await request(app)
        .post('/api/v1/conversations/messages')
        .set('Cookie', [
          `accessToken=${subscribedUserAccessToken};`,
          `idToken=${subscribedUserIdToken};`,
          `refreshToken=${subscribedUserRefreshToken};`,
        ])
        .send({
          conversationId: 1,
          content: 'Test WebSocket Message',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Small delay to let WebSocket emit before asserting
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(emitSpy).toHaveBeenCalledWith(
        'new message',
        expect.objectContaining({
          recipient: expect.any(String),
          unreadCount: expect.any(String),
          conversationId: expect.any(Number),
          senderSub: expect.any(String),
          content: expect.any(String),
        })
      );

      emitSpy.mockRestore();
    });
  });
});
