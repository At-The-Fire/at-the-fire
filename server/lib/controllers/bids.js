const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const Bid = require('../models/Bid.js');
const Auction = require('../models/Auction.js');
const AuctionNotification = require('../models/AuctionNotification.js');
const auctionTimers = require('../jobs/auctionTimers');
const pool = require('../utils/pool');

module.exports = Router()
  // GET bids for auction with user profiles
  .get('/:id', async (req, res, next) => {
    try {
      const auctionId = req.params.id;

      // Query bids with user profile data joined
      const { rows } = await pool.query(
        `
        SELECT
          b.id,
          b.auction_id,
          b.bidder_sub,
          b.bid_amount,
          b.created_at,
          b.updated_at,
          cu.first_name,
          cu.image_url
        FROM bids b
        JOIN cognito_users cu ON b.bidder_sub = cu.sub
        WHERE b.auction_id = $1
        ORDER BY b.bid_amount DESC, b.created_at ASC
        `,
        [auctionId],
      );

      const bidsWithProfiles = rows.map((row) => ({
        id: row.id,
        auctionId: row.auction_id,
        bidderSub: row.bidder_sub,
        bidAmount: row.bid_amount,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: {
          firstName: row.first_name,
          imageUrl: row.image_url,
        },
      }));

      res.json(bidsWithProfiles);
    } catch (e) {
      next(e);
    }
  })

  // POST new bid
  .post('/', authenticateAWS, async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { auctionId, bidderSub, bidAmount } = req.body;

      if (!auctionId || !bidderSub || !bidAmount) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(400).json({ error: 'auctionId, bidderSub, and bidAmount are required' });
      }

      // get current highest bid
      const currentHighest = await Bid.getHighestBid(auctionId);

      // enforce strictly higher bid
      if (currentHighest && Number(bidAmount) <= Number(currentHighest.bidAmount)) {
        await client.query('ROLLBACK');
        client.release();
        return res.status(409).json({
          message: 'Bid must be higher than current highest bid',
          currentHighest: currentHighest.bidAmount,
        });
      }

      // insert new bid (in transaction)
      const newBid = await Bid.insert({ auctionId, bidderSub, bidAmount }, client);

      // update auction's current_bid (in transaction)
      await client.query(
        `
        UPDATE auctions
        SET current_bid = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [auctionId, bidAmount],
      );

      await client.query('COMMIT');
      client.release();

      // After inserting the bid, implement the "5-minute rule":
      // If the bid was placed within EXTENSION_WINDOW_MS of the auction's end_time,
      // extend the auction by EXTENSION_MS and reschedule the in-memory timer.
      try {
        const { EXTENSION_MS, EXTENSION_WINDOW_MS } = auctionTimers;

        const auction = await Auction.getById(auctionId);
        if (auction && auction.isActive && auction.endTime) {
          const now = new Date();
          const endTime = new Date(auction.endTime);
          const timeUntilEnd = endTime - now;

          if (timeUntilEnd > 0 && timeUntilEnd <= EXTENSION_WINDOW_MS) {
            const newEnd = new Date(endTime.getTime() + EXTENSION_MS);
            // persist new end time
            await pool.query(
              `
              UPDATE auctions
              SET end_time = $2, updated_at = CURRENT_TIMESTAMP
              WHERE id = $1
              `,
              [auctionId, newEnd],
            );

            // reschedule the node timer so the new end will be honored
            if (auctionTimers && typeof auctionTimers.scheduleAuctionEnd === 'function') {
              auctionTimers.scheduleAuctionEnd(auctionId, newEnd);
            }

            // notify clients that auction end time was extended
            const io = req.app.get('io');
            if (io) {
              io.emit('auction-extended', { auctionId, newEndTime: newEnd.toISOString() });
            }
          }
        }
      } catch (err) {
        // Non-fatal: log but continue — bid already recorded
        console.error('Failed to apply auction extension logic', err);
      }

      // now that successful insert happened, emit events
      const io = req.app.get('io');
      if (io) {
        io.emit('bid-placed', { auctionId });
      }

      // notify previous highest bidder if they exist and are different
      if (currentHighest && currentHighest.bidderSub !== bidderSub) {
        if (io) {
          io.to(`user_${currentHighest.bidderSub}`).emit('user-outbid', {
            auctionId,
            newBidAmount: bidAmount,
          });
        }

        await AuctionNotification.insert({
          userSub: currentHighest.bidderSub,
          auctionId,
          type: 'outbid',
        });
      }

      return res.status(201).json({ message: 'Bid placed successfully', bid: newBid });
    } catch (e) {
      await client.query('ROLLBACK');
      client.release();
      next(e);
    }
  })

  // POST buy-it-now
  .post('/buy-it-now', authenticateAWS, async (req, res, next) => {
    try {
      const { auctionId, buyerSub } = req.body;

      // fetch the auction to confirm it's active
      const auction = await Auction.getById(auctionId);
      if (!auction || !auction.isActive) {
        return res.status(400).json({ error: 'Auction already closed' });
      }

      // We need the bid insert and auction close to be atomic. Start a client transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // insert a bid record for the buy-it-now amount
        const newBid = await Bid.insert(
          {
            auctionId,
            bidderSub: buyerSub,
            bidAmount: auction.buyNowPrice,
          },
          client,
        );

        // mark it as closed and record result using the same client/transaction
        const result = await Auction.closeAuction(
          {
            auctionId,
            winnerSub: buyerSub,
            finalBid: auction.buyNowPrice,
            closedReason: 'buy_now',
          },
          client,
        );

        // TODO: System message to winner once conversation method identified
        // await Conversations.insertSystemMessage(buyerSub, `Congrats on the win!...`);

        await client.query('COMMIT');

        // Emit WebSocket event for real-time updates after a successful commit
        const io = req.app.get('io');
        if (io) {
          io.emit('auction-BIN', auctionId); // bare auctionId, no wrapper
          io.emit('bid-placed', { auctionId });
        }

        res.status(200).json({ message: 'Auction purchased successfully', result, bid: newBid });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (e) {
      next(e);
    }
  });
