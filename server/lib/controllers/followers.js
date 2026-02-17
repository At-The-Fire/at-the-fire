const { Router } = require('express');
const authenticateAWS = require('../middleware/authenticateAWS.js'); // Only for POST/DELETE
const validateCustomerUpdate = require('../middleware/validateCustomerUpdate.js'); // Only for POST/DELETE
const Follower = require('../models/Follower.js');
const AWSUser = require('../models/AWSUser.js');

module.exports = Router()
  .post(
    '/',
    authenticateAWS,
    validateCustomerUpdate,
    async (req, res, next) => {
      try {
        const followerId = req.userAWSSub;
        const { followedId } = req.body;

        if (followedId === followerId) {
          return res.status(400).json({
            message: 'You cannot follow yourself.',
          });
        }

        const userExists = await AWSUser.getCognitoUserBySub({
          sub: followedId,
        });

        if (!userExists) {
          return res.status(400).send({ message: 'User does not exist.' });
        }

        await Follower.createFollower(followerId, followedId);

        res.json({
          success: true,
          followerId,
          followedId,
        });
      } catch (e) {
        if (e.message.includes('Already')) {
          return res.status(400).json({ code: 400, message: e.message });
        }
        next(e);
      }
    }
  )

  .delete(
    '/:followedId',
    authenticateAWS,
    validateCustomerUpdate,
    async (req, res, next) => {
      try {
        const followerId = req.userAWSSub;
        const { followedId } = req.params;

        await Follower.deleteFollower(followerId, followedId);

        res.json({
          success: true,
        });
      } catch (e) {
        if (e.message.includes('Follower relationship')) {
          return res.status(404).json({ code: 404, message: e.message });
        }
        next(e);
      }
    }
  )

  .get('/count/:userId', async (req, res, next) => {
    try {
      const { userId } = req.params;
      const [followerCount, followingCount] = await Promise.all([
        Follower.getFollowerCount(userId),
        Follower.getFollowingCount(userId),
      ]);

      res.json({
        followerCount,
        followingCount,
      });
    } catch (error) {
      next(error);
    }
  })

  .get('/followers/:userId', async (req, res, next) => {
    try {
      const { userId } = req.params;

      const userExists = await AWSUser.getCognitoUserBySub({ sub: userId });

      if (!userExists) {
        return res.status(404).send({ message: "User doesn't exist." });
      }

      const followers = await Follower.getFollowers(userId);

      res.json({
        followers,
      });
    } catch (error) {
      next(error);
    }
  })

  .get('/following/:userId', async (req, res, next) => {
    try {
      const { userId } = req.params;
      const following = await Follower.getFollowing(userId);

      res.json({
        following,
      });
    } catch (error) {
      next(error);
    }
  })

  .get('/:userId/status', authenticateAWS, async (req, res, next) => {
    try {
      const followerId = req.userAWSSub;
      const { userId: followedId } = req.params;

      const isFollowing = await Follower.isFollowing(followerId, followedId);

      res.json({ isFollowing });
    } catch (error) {
      next(error);
    }
  });
