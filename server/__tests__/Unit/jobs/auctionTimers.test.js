const pool = require('../../../lib/utils/pool.js');
const nodeCron = require('node-cron');

jest.mock('../../../lib/utils/pool');
jest.mock('node-cron');

const {
  completeAuction,
  sweepExpiredAuctions,
  scheduleAuctionEnd,
  cancelAuctionEnd,
  initAuctionTimers,
  EXTENSION_MS,
  EXTENSION_WINDOW_MS,
} = require('../../../lib/jobs/auctionTimers.js');

describe('auctionTimers', () => {
  let mockIo;

  beforeAll(async () => {
    // Set _io once for the suite by calling initAuctionTimers with a mock Socket.IO instance.
    // Use beforeAll so the module-level _io is set before any completeAuction tests run.
    mockIo = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };
    nodeCron.schedule.mockReturnValue({ stop: jest.fn() });
    pool.query.mockResolvedValueOnce({ rows: [] }); // no active auctions on startup
    await initAuctionTimers(mockIo);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore mockIo chain after clearAllMocks resets return values
    mockIo.to.mockReturnThis();
    nodeCron.schedule.mockReturnValue({ stop: jest.fn() });
  });

  // ─── Constants ─────────────────────────────────────────────────────────────

  describe('constants', () => {
    it('EXTENSION_MS is 5 minutes in milliseconds', () => {
      expect(EXTENSION_MS).toBe(5 * 60 * 1000);
    });

    it('EXTENSION_WINDOW_MS is 1 minute in milliseconds', () => {
      expect(EXTENSION_WINDOW_MS).toBe(60 * 1000);
    });
  });

  // ─── completeAuction ────────────────────────────────────────────────────────

  describe('completeAuction', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);
    });

    it('records winner, inserts notification, and emits socket events when auction has a top bid', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE auctions SET is_active = FALSE
        .mockResolvedValueOnce({ rows: [{ bidder_sub: 'sub_winner', bid_amount: '250' }] }) // SELECT top bid
        .mockResolvedValueOnce({}) // INSERT auction_results
        .mockResolvedValueOnce({}) // INSERT auction_notifications
        .mockResolvedValueOnce({}); // COMMIT

      await completeAuction(1);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Socket events
      expect(mockIo.emit).toHaveBeenCalledWith('auction-ended', { auctionId: 1 });
      expect(mockIo.to).toHaveBeenCalledWith('user_sub_winner');
      expect(mockIo.emit).toHaveBeenCalledWith('user-won', { auctionId: 1 });

      // Notification insert
      const calls = mockClient.query.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('auction_notifications'))).toBe(true);
    });

    it('records no-winner result and emits auction-ended when auction has no bids', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE auctions
        .mockResolvedValueOnce({ rows: [] }) // SELECT top bid — no bids
        .mockResolvedValueOnce({}) // INSERT auction_results (no winner)
        .mockResolvedValueOnce({}); // COMMIT

      await completeAuction(2);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // General ended event fires; user-won should NOT fire
      expect(mockIo.emit).toHaveBeenCalledWith('auction-ended', { auctionId: 2 });
      expect(mockIo.to).not.toHaveBeenCalled();

      // No notification inserted
      const calls = mockClient.query.mock.calls.map((c) => c[0]);
      expect(calls.some((sql) => sql.includes('auction_notifications'))).toBe(false);
    });

    it('is idempotent — skips processing when auction is already inactive (rowCount = 0)', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE — already inactive, nothing updated
        .mockResolvedValueOnce({}); // COMMIT

      await completeAuction(3);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(mockIo.emit).not.toHaveBeenCalled();
    });

    it('rolls back transaction and releases client on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('DB failure')); // UPDATE throws

      await completeAuction(4);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  // ─── sweepExpiredAuctions ───────────────────────────────────────────────────

  describe('sweepExpiredAuctions', () => {
    let mockClient;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient);
    });

    it('calls completeAuction for each expired auction found', async () => {
      // pool.query for the sweep SELECT
      pool.query.mockResolvedValueOnce({ rows: [{ id: 10 }, { id: 11 }] });

      // Each completeAuction call uses pool.connect; set up two idempotent client sequences
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN (auction 10)
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE — already closed
        .mockResolvedValueOnce({}) // COMMIT
        .mockResolvedValueOnce({}) // BEGIN (auction 11)
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE — already closed
        .mockResolvedValueOnce({}); // COMMIT

      await sweepExpiredAuctions();

      // pool.connect called once per expired auction
      expect(pool.connect).toHaveBeenCalledTimes(2);
    });

    it('does nothing when there are no expired auctions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await sweepExpiredAuctions();

      expect(pool.connect).not.toHaveBeenCalled();
    });
  });

  // ─── scheduleAuctionEnd / cancelAuctionEnd ──────────────────────────────────

  describe('scheduleAuctionEnd', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules a setTimeout for a future end time', () => {
      const futureTime = new Date(Date.now() + 10_000); // 10 seconds from now
      scheduleAuctionEnd(100, futureTime);

      expect(jest.getTimerCount()).toBe(1);

      cancelAuctionEnd(100); // clean up
    });

    it('does not schedule a timer when end time is already past', () => {
      const pastTime = new Date(Date.now() - 5_000); // 5 seconds ago
      scheduleAuctionEnd(101, pastTime);

      expect(jest.getTimerCount()).toBe(0);
    });

    it('cancels an existing timer before scheduling a new one for the same auction', () => {
      const futureTime = new Date(Date.now() + 30_000);

      scheduleAuctionEnd(102, futureTime);
      expect(jest.getTimerCount()).toBe(1);

      // Schedule again for the same auction — should replace, not add
      scheduleAuctionEnd(102, new Date(Date.now() + 60_000));
      expect(jest.getTimerCount()).toBe(1);

      cancelAuctionEnd(102); // clean up
    });
  });

  describe('cancelAuctionEnd', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('clears the timer for a scheduled auction', () => {
      scheduleAuctionEnd(200, new Date(Date.now() + 10_000));
      expect(jest.getTimerCount()).toBe(1);

      cancelAuctionEnd(200);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('is a no-op when no timer exists for the auction', () => {
      expect(() => cancelAuctionEnd(99999)).not.toThrow();
    });
  });

  // ─── initAuctionTimers ──────────────────────────────────────────────────────

  describe('initAuctionTimers', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules one-time timers for all active auctions on startup', async () => {
      const futureEnd = new Date(Date.now() + 60_000).toISOString();
      pool.query.mockResolvedValueOnce({
        rows: [
          { id: 300, end_time: futureEnd },
          { id: 301, end_time: futureEnd },
        ],
      });

      const io = { emit: jest.fn(), to: jest.fn().mockReturnThis() };
      await initAuctionTimers(io);

      // One timer per active auction
      expect(jest.getTimerCount()).toBe(2);

      cancelAuctionEnd(300);
      cancelAuctionEnd(301);
    });

    it('registers a cron sweep job and returns it', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const mockSweepTask = { stop: jest.fn() };
      nodeCron.schedule.mockReturnValueOnce(mockSweepTask);

      const io = { emit: jest.fn(), to: jest.fn().mockReturnThis() };
      const result = await initAuctionTimers(io);

      expect(nodeCron.schedule).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockSweepTask);
    });

    it('handles a DB error on startup without throwing', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB unavailable'));

      const io = { emit: jest.fn(), to: jest.fn().mockReturnThis() };
      await expect(initAuctionTimers(io)).resolves.not.toThrow();
    });
  });
});
