jest.mock('../../../lib/utils/pool');
jest.mock('../../../lib/services/encryption', () => ({
  encrypt: jest.fn((val) => `encrypted:${val}`),
  decrypt: jest.fn((val) => val.replace('encrypted:', '')),
  isEncrypted: jest.fn(() => true),
}));

const Conversations = require('../../../lib/models/Conversations.js');
const pool = require('../../../lib/utils/pool.js');

describe('Conversations Model', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  describe('createMessage', () => {
    it('updates conversations.updated_at when a message is sent', async () => {
      const mockMessageRow = {
        id: 1,
        conversation_id: 42,
        sender_sub: 'sub_abc',
        content: 'encrypted:hello',
        created_at: new Date().toISOString(),
        is_read: false,
      };

      // Responses for: BEGIN, INSERT messages, UPDATE conversation_visibility (first_message_sent),
      // UPDATE conversation_visibility (is_visible), UPDATE conversations updated_at, COMMIT
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMessageRow] }) // INSERT messages
        .mockResolvedValueOnce({}) // UPDATE conversation_visibility first_message_sent
        .mockResolvedValueOnce({}) // UPDATE conversation_visibility is_visible
        .mockResolvedValueOnce({}) // UPDATE conversations SET updated_at  <-- this is the one that doesn't exist yet
        .mockResolvedValueOnce({}); // COMMIT

      await Conversations.createMessage({
        conversation_id: 42,
        sender_sub: 'sub_abc',
        content: 'hello',
      });

      const allQueries = mockClient.query.mock.calls.map((call) => call[0]);
      const updatesConversationTimestamp = allQueries.some(
        (q) => typeof q === 'string' && q.toLowerCase().includes('update conversations') && q.toLowerCase().includes('updated_at')
      );

      expect(updatesConversationTimestamp).toBe(true);
    });
  });
});
