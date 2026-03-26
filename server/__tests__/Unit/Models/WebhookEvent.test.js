jest.mock('../../../lib/utils/pool');

const WebhookEvent = require('../../../lib/models/WebhookEvent.js');
const pool = require('../../../lib/utils/pool.js');

describe('WebhookEvent Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('maps row columns to instance properties', () => {
      const row = { id: 1, event_id: 'evt_abc123', event_type: 'invoice.paid', created_at: '2026-01-01T00:00:00Z' };
      const event = new WebhookEvent(row);
      expect(event.id).toBe(1);
      expect(event.event_id).toBe('evt_abc123');
      expect(event.event_type).toBe('invoice.paid');
      expect(event.created_at).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('insert()', () => {
    it('returns a WebhookEvent instance on success', async () => {
      const row = { id: 1, event_id: 'evt_abc123', event_type: 'invoice.paid', created_at: '2026-01-01T00:00:00Z' };
      pool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await WebhookEvent.insert({ event_id: 'evt_abc123', event_type: 'invoice.paid' });

      expect(result).toBeInstanceOf(WebhookEvent);
      expect(result.event_id).toBe('evt_abc123');
      expect(result.event_type).toBe('invoice.paid');
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO webhook_events'),
        ['evt_abc123', 'invoice.paid']
      );
    });

    it('returns null on duplicate event (PostgreSQL error code 23505)', async () => {
      const duplicateError = Object.assign(new Error('duplicate key value'), { code: '23505' });
      pool.query.mockRejectedValueOnce(duplicateError);

      const result = await WebhookEvent.insert({ event_id: 'evt_abc123', event_type: 'invoice.paid' });

      expect(result).toBeNull();
    });

    it('re-throws non-duplicate errors', async () => {
      const connectionError = new Error('connection refused');
      pool.query.mockRejectedValueOnce(connectionError);

      await expect(
        WebhookEvent.insert({ event_id: 'evt_abc123', event_type: 'invoice.paid' })
      ).rejects.toThrow('connection refused');
    });
  });
});
