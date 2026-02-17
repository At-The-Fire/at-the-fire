const { Router } = require('express');
const Likes = require('../models/Likes.js');
const authenticateAWS = require('../middleware/authenticateAWS.js');
const optionalAuth = require('../middleware/optionalAuth.js');

module.exports = Router()
  .post('/toggle/:postId', authenticateAWS, async (req, res, next) => {
    try {
      const result = await Likes.toggleLike({
        sub: req.userAWSSub,
        post_id: parseInt(req.params.postId),
      });

      // Get updated count after toggle
      const count = await Likes.getLikeCount(req.params.postId);

      res.json({
        liked: result !== null,
        count,
      });
    } catch (e) {
      next(e);
    }
  })

  .post('/batch', optionalAuth, async (req, res) => {
    try {
      const { postIds } = req.body;
      if (!Array.isArray(postIds)) {
        return res.status(400).json({ error: 'postIds must be an array' });
      }
      const results = {};
      for (const postId of postIds) {
        const count = await Likes.getLikeCount(postId);
        let liked = false;

        if (req.userAWSSub) {
          liked = await Likes.getPostLikeStatus({
            sub: req.userAWSSub,
            post_id: postId,
          });
        }
        results[postId] = { liked, count };
      }

      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })

  .get('/count/:postId', async (req, res, next) => {
    try {
      const count = await Likes.getLikeCount(req.params.postId);
      res.json({ count });
    } catch (e) {
      next(e);
    }
  })

  .get('/status/:postId', optionalAuth, async (req, res, next) => {
    try {
      if (!req.userAWSSub) {
        return res.json({ isLiked: false });
      }
      const isLiked = await Likes.getPostLikeStatus({
        sub: req.userAWSSub,
        post_id: parseInt(req.params.postId),
      });
      res.json({ isLiked });
    } catch (e) {
      next(e);
    }
  });
