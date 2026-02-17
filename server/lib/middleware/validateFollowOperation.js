//
//
//* This middleware validates follower operations
//
//
//

const User = require('../models/AWSUser.js');

const validateFollowOperation = async (req, res, next) => {
  try {
    if (!req.userAWSSub) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const followerId = req.userAWSSub;
    // Get followedId from either body (POST) or params (DELETE)
    const followedId = req.body.followedId || req.params.followedId;

    // Check if followedId exists
    if (!followedId) {
      return res.status(400).json({
        message: 'Missing followedId',
      });
    }

    // Validate field types
    if (typeof followedId !== 'string' && typeof followedId !== 'number') {
      return res.status(400).json({
        message: 'Invalid followedId format',
      });
    }

    // Can't follow yourself
    if (followerId === followedId) {
      return res.status(400).json({
        message: 'Cannot follow yourself',
      });
    }

    // Check if followed user exists
    const followedUser = await User.getCognitoUserBySub(followedId);
    if (!followedUser) {
      return res.status(404).json({
        message: 'User to follow does not exist',
      });
    }

    // If validation passes, add sanitized data to request
    req.followData = {
      followerId: followerId.toString(),
      followedId: followedId.toString(),
    };

    next();
  } catch (e) {
    console.error('Follow validation error:', e);
    return res.status(400).json({
      message: 'Invalid follow operation format',
    });
  }
};

module.exports = validateFollowOperation;
