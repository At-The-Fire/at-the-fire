//
//
//*  This middleware is for making sure the customerId matches the Admin customerId
// * for accessing the master dashboard
//
// if (process.env.NODE_ENV === 'test') {
//
module.exports = async (req, res, next) => {
  try {
    const customerId = req.customerId;
    let admin;
    if (process.env.NODE_ENV === 'test') {
      admin = process.env.TEST_STRIPE_CUSTOMER_ID_FULL_CUSTOMER;
    } else {
      admin = process.env.ADMIN_ID;
    }
    if (!customerId || customerId !== admin) {
      return res.status(403).json({
        message: 'You do not have permission: access denied',
        code: 403,
      });
    }

    next();
  } catch (e) {
    console.error('Unexpected Middleware Error:', e);

    return res.status(500).json({
      message: 'Internal Server Error',
      code: 500,
    });
  }
};
