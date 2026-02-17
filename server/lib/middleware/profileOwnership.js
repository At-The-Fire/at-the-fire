//
//
//*  this middleware is for the delete and update routes
// * and checks if the customer is === to the owner of the profile
//
//

const { getStripeByAWSSub } = require('../models/StripeCustomer.js');
module.exports = async (req, res, next) => {
  try {
    const sub = req.userAWSSub;
    const customer = await getStripeByAWSSub(sub);

    if (!customer || customer.customerId !== req.customerId) {
      return res
        .status(403)
        .json({ error: 'Not authorized to update this profile' });
    } else {
      next();
    }
  } catch (e) {
    res.status(403).json({ error: 'Something went wrong' });
  }
};
