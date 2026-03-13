//
//
//*  this middleware is for the delete and update routes
// * and checks if the user is === to the creator of the post
//
//

const QuotaProduct = require('../models/QuotaProduct.js');
const Post = require('../models/Post.js');

module.exports = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userSub = req.userAWSSub;
    const customerId = req.customerId;
    const path = req.originalUrl;

    let item;

    // Determine if it's a post or product route
    if (path.includes('/dashboard')) {
      item = await Post.getById(id);
    } else if (path.includes('/quota-tracking')) {
      item = await QuotaProduct.getQuotaProductById(id);
    } else {
      return res.status(400).json({
        message: 'Invalid route',
        code: 400,
      });
    }

    if (!item) {
      return res.status(404).json({
        message: `${path.includes('/dashboard') ? 'Post' : 'Product'} not found`,
        code: 404,
      });
    }

    const ownerId = path.includes('/dashboard') ? item.seller_sub : item.customer_id;
    const currentUserId = path.includes('/dashboard') ? userSub : customerId;

    if (ownerId !== currentUserId) {
      return res.status(403).json({
        message: 'You do not have permission to do this: access denied',
        code: 403,
      });
    }

    // Attach the item to the request object so the route handler can use it if needed
    req.resourceItem = item;

    next();
  } catch (e) {
    console.error('Unexpected Middleware Error:', e);

    return res.status(500).json({
      message: 'Internal Server Error',
      code: 500,
    });
  }
};
