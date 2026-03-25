require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getSigningKey } = require('../utils/jwks');
const { getCognitoUserBySub } = require('../models/AWSUser.js');

// Promise-based token verification
const verifyToken = (token, isAccessToken = false) => {
  return new Promise((resolve, reject) => {
    const options = {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    };

    if (!isAccessToken) {
      options.audience = process.env.APP_CLIENT_ID;
    }

    jwt.verify(token, getSigningKey, options, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

// Middleware function
module.exports = async (req, res, next) => {
  try {
    const accessToken = req.cookies['accessToken'];
    const idToken = req.cookies['idToken'];
    const refreshToken = req.cookies['refreshToken'];

    if (!accessToken || !idToken || !refreshToken) {
      return res.status(401).json({
        message: 'You must be signed in to continue: missing or invalid token',
        code: 401,
      });
    }

    // Verify tokens first (signature + claims), then use verified payload
    let verifiedIdPayload;
    try {
      const [, idPayload] = await Promise.all([
        verifyToken(accessToken, true),
        verifyToken(idToken, false),
      ]);
      verifiedIdPayload = idPayload;
    } catch (error) {
      console.error('Token verification failed:', error);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired!',
          code: 401,
        });
      } else if (error.message.includes('Missing Key ID')) {
        return res.status(401).json({
          message: 'Missing Key ID in token header!',
          code: 401,
        });
      } else {
        return res.status(401).json({
          message: 'Token verification failed!',
          code: 401,
        });
      }
    }

    if (!verifiedIdPayload || !verifiedIdPayload.sub) {
      return res.status(401).json({
        message: 'Invalid token structure: sub is missing',
        code: 401,
      });
    }

    req.userAWSSub = verifiedIdPayload.sub;

    // DB lookup after successful verification
    try {
      const sub = req.userAWSSub;
      const user = await getCognitoUserBySub({ sub });

      if (!user) {
        return res.status(401).json({
          message: 'User does not exist',
          code: 401,
        });
      }

      req.isAdmin = user.isAdmin;
    } catch (e) {
      console.error('User verification failed:', e);
      return res.status(401).json({
        message: 'User verification failed',
        code: 401,
      });
    }

    next();
  } catch (err) {
    console.error('Unexpected Middleware Error:', err);
    return res.status(500).json({
      message: 'Internal Server Error',
      code: 500,
    });
  }
};
