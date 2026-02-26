const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const Auction = require('../models/Auction.js');
const Bid = require('../models/Bid.js');
const { scheduleAuctionEnd } = require('../jobs/auctionTimers.js');

const multer = require('multer');

//# Configure S3 client
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = Router()
  // GET all auctions (public) ///////////////////////////////////////////
  .get('/', async (req, res, next) => {
    try {
      const auctions = await Auction.getAllActive();
      res.json(auctions);
    } catch (e) {
      next(e);
    }
  })

  // GET seller's own auctions (authenticated) ///////////////////////////////////////////
  .get('/seller/:sub', [authenticateAWS], async (req, res, next) => {
    try {
      const auctions = await Auction.getBySeller(req.params.sub);
      res.json(auctions);
    } catch (e) {
      next(e);
    }
  })

  // GET auction by id (authenticated) ///////////////////////////////////////////
  .get('/:id', [authenticateAWS], async (req, res, next) => {
    try {
      const data = await Auction.getById(req.params.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // GET auction results by id (public) ///////////////////////////////////////////
  .get('/results/:auctionId', async (req, res, next) => {
    try {
      const data = await Auction.getAuctionResults(req.params.auctionId);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // GET all USER auctions (authenticated) ///////////////////////////////////////////
  .get('/user-auctions/:sub', [authenticateAWS], async (req, res, next) => {
    try {
      const sub = req.params.sub;
      const activeAuctionBids = await Bid.getByUserSub(sub);
      const wonAuctions = await Auction.getUserAuctionWins(sub);
      res.json({ activeAuctionBids, wonAuctions });
    } catch (e) {
      next(e);
    }
  })

  //? image route ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // POST upload image files to S3 (authenticated) /////////////////////////////////
  .post('/upload', [authenticateAWS, upload.array('imageFiles')], async (req, res) => {
    try {
      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const timestamp = Date.now();
          const random1 = Math.random().toString(36).substring(2);
          const random2 = Math.random().toString(36).substring(2);
          const fileName = file.originalname;
          const uniqueId = `${timestamp}_${random1}${random2}_${fileName}`;

          // check which server prod or dev
          const bucketSuffix = process.env.APP_ENV === 'development' ? '-dev' : '';
          // Define the file path in your S3 bucket
          const key = `at-the-fire${bucketSuffix}/auction-images/${uniqueId}`;

          // Wrap async operations in IIFE
          (async () => {
            try {
              const command = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                CacheControl: 'public, max-age=31536000, immutable',
              });

              await s3Client.send(command);

              // Use S3 URL in dev, CloudFront in prod
              const secure_url =
                process.env.APP_ENV === 'development'
                  ? `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
                  : `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

              const result = {
                public_id: uniqueId,
                secure_url,
                format: file.mimetype.split('/')[1],
                original_filename: file.originalname,
              };

              resolve(result);
            } catch (error) {
              reject(error);
            }
          })();
        });
      });

      // Wait for all uploads to complete concurrently
      const results = await Promise.all(uploadPromises);

      res.status(200).json(results);
    } catch (e) {
      console.error(e);
      res.status(500).send('An error occurred while uploading the images');
    }
  })

  // POST new auction (authenticated seller) /////////////////////////////////
  .post('/', [authenticateAWS], async (req, res, next) => {
    try {
      const { auctionDetails } = req.body;

      if (!auctionDetails) {
        return res.status(400).json({ error: 'Auction details are required' });
      }

      // Set sellerSub from authenticated user
      auctionDetails.sellerSub = req.userAWSSub;

      const auction = await Auction.insert(auctionDetails);

      scheduleAuctionEnd(auction.id, auction.endTime);

      // Emit WebSocket event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('auction-created', { auction });
      }

      res.json(auction);
    } catch (e) {
      next(e);
    }
  })

  // PUT cancel auction (seller only, no bids) /////////////////////////////////
  .put('/:id/cancel', [authenticateAWS], async (req, res, next) => {
    try {
      const auction = await Auction.getById(req.params.id);
      if (!auction) return res.status(404).json({ message: 'Auction not found' });

      const isAdmin = req.userAWSSub === process.env.ADMIN_SUB;
      const isOwner = req.userAWSSub === auction.sellerSub;
      if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Forbidden' });

      if (Number(auction.currentBid) > 0) {
        return res.status(409).json({ error: 'Cannot cancel an auction that has bids' });
      }

      const updated = await Auction.updateById(req.params.id, { isActive: false });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  })

  // PUT update auction (seller or admin) /////////////////////////////////
  .put('/:id', [authenticateAWS], async (req, res, next) => {
    try {
      const id = req.body.id;
      const updatedAuction = req.body.auction;

      // 1. Fetch the existing auction from DB
      const existingAuction = await Auction.getById(id);
      if (!existingAuction) {
        return res.status(404).json({ message: 'Auction not found' });
      }

      // 2. Check ownership (seller or admin)
      const isAdmin = req.userAWSSub === process.env.ADMIN_SUB;
      const isOwner = req.userAWSSub === existingAuction.sellerSub;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!existingAuction.isActive) {
        return res.status(409).json({ error: 'Cannot edit a closed auction' });
      }

      // 3. Determine which URLs need to be deleted
      const oldUrls = existingAuction.imageUrls || [];
      const newUrls = updatedAuction.imageUrls || [];
      const toDelete = oldUrls.filter((url) => !newUrls.includes(url));

      // 4. Loop over each URL to delete from S3
      for (const url of toDelete) {
        try {
          const parsed = new URL(url);
          const keyFromUrl = parsed.pathname.startsWith('/')
            ? parsed.pathname.slice(1)
            : parsed.pathname;

          if (keyFromUrl) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: keyFromUrl,
            });

            try {
              await s3Client.send(deleteCommand);
            } catch (error) {
              if (error.name !== 'NoSuchKey') throw error;
              console.error(`S3 delete skipped (NoSuchKey): ${keyFromUrl}`);
            }
          }
        } catch (err) {
          console.error('Error parsing URL for deletion:', url, err);
        }
      }

      // 5. Prepare update fields
      const fields = {
        title: updatedAuction.title,
        description: updatedAuction.description,
        imageUrls: newUrls,
        startPrice: updatedAuction.startPrice,
        buyNowPrice: updatedAuction.buyNowPrice,
        currentBid: updatedAuction.currentBid,
        startTime: updatedAuction.startTime,
        endTime: updatedAuction.endTime,
        isActive: updatedAuction.isActive,
      };

      // 6. Update auction record in DB
      const data = await Auction.updateById(id, fields);

      // 7. Respond
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // PUT update paid/unpaid (seller only) /////////////////////////////////
  .put('/:id/paid', [authenticateAWS], async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isPaid } = req.body;

      if (typeof isPaid !== 'boolean') {
        return res.status(400).json({ error: 'isPaid must be boolean' });
      }

      const auction = await Auction.getById(id);
      if (!auction) return res.status(404).json({ message: 'Auction not found' });
      if (req.userAWSSub !== auction.sellerSub) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await Auction.markPaid(id, isPaid);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${result.winner_sub}`).emit('auction-paid', {
          auctionId: result.auction_id,
          isPaid,
        });
      }

      res.json(result);
    } catch (e) {
      next(e);
    }
  })

  // PUT update tracking # (seller only) /////////////////////////////////
  .put('/:id/tracking', [authenticateAWS], async (req, res, next) => {
    try {
      const { id } = req.params;
      const { trackingNumber } = req.body;

      if (!trackingNumber || typeof trackingNumber !== 'string') {
        return res.status(400).json({ error: 'trackingNumber must be a string' });
      }

      const auction = await Auction.getById(id);
      if (!auction) return res.status(404).json({ message: 'Auction not found' });
      if (req.userAWSSub !== auction.sellerSub) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await Auction.updateTrackingNumber(id, trackingNumber);

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${result.winner_sub}`).emit('tracking-info', {
          auctionId: result.auction_id,
          trackingNumber: result.tracking_number,
        });
      }

      res.json(result);
    } catch (e) {
      next(e);
    }
  });
