const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS');
const AuctionNotification = require('../models/AuctionNotification.js');

module.exports = Router()
  // Get unread auction notifications for the current user
  .get('/', authenticateAWS, async (req, res, next) => {
    try {
      const userSub = req.user.sub;
      const notifications = await AuctionNotification.getUnreadByUserSub(userSub);
      res.json(notifications);
    } catch (e) {
      next(e);
    }
  })

  // Mark all auction notifications as read for the current user
  .patch('/mark-read', authenticateAWS, async (req, res, next) => {
    try {
      const userSub = req.user.sub;
      await AuctionNotification.markAsRead(userSub);
      res.json({ message: 'All auction notifications marked as read' });
    } catch (e) {
      next(e);
    }
  });
