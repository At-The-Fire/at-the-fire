require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getSigningKey } = require('../utils/jwks');
const { getCognitoUserBySub } = require('../models/AWSUser.js');

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies['accessToken'];
    const idToken = req.cookies['idToken'];
    const refreshToken = req.cookies['refreshToken'];

    if (!accessToken || !idToken || !refreshToken) {
      return next();
    }

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

    let verifiedIdPayload;
    try {
      const [, idPayload] = await Promise.all([
        verifyToken(accessToken, true),
        verifyToken(idToken, false),
      ]);
      verifiedIdPayload = idPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return next();
    }

    if (!verifiedIdPayload || !verifiedIdPayload.sub) {
      return next();
    }

    req.userAWSSub = verifiedIdPayload.sub;

    try {
      const sub = req.userAWSSub;
      const userExists = await getCognitoUserBySub({ sub });
      if (!userExists) {
        return next();
      }
    } catch (e) {
      console.error('User verification failed:', e);
      return next();
    }

    next();
  } catch (err) {
    console.error('Unexpected Optional Auth Middleware Error:', err);
    next();
  }
};

module.exports = optionalAuth;
