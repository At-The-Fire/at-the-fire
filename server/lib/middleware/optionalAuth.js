require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { getCognitoUserBySub } = require('../models/AWSUser.js');

const client = jwksClient({
  jwksUri: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
});

const getSigningKey = (() => {
  const keyCache = {};
  return (header, callback) => {
    if (!header.kid) {
      const err = new Error('Missing Key ID (`kid`) in token header');
      console.error('Error retrieving signing key:', err);
      callback(err);
      return;
    }
    if (keyCache[header.kid]) {
      callback(null, keyCache[header.kid]);
      return;
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('Error retrieving signing key:', err);
        callback(err);
        return;
      }
      const signingKey = key.publicKey || key.rsaPublicKey;
      keyCache[header.kid] = signingKey;
      callback(null, signingKey);
    });
  };
})();

const optionalAuth = async (req, res, next) => {
  try {
    // Retrieve tokens from cookies
    const accessToken = req.cookies['accessToken'];
    const idToken = req.cookies['idToken'];
    const refreshToken = req.cookies['refreshToken'];

    // If tokens are missing, skip attaching user info
    if (!accessToken || !idToken || !refreshToken) {
      return next();
    }

    // Decode the idToken to extract AWS sub
    const decodedToken = jwt.decode(idToken);
    if (!decodedToken || !decodedToken.sub) {
      return next();
    }
    req.userAWSSub = decodedToken.sub;

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

    // Token verification (similar to your strict middleware)
    const verifyToken = (token, isAccessToken = false) => {
      return new Promise((resolve, reject) => {
        const options = {
          algorithms: ['RS256'],
          issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        };
        if (!isAccessToken) {
          options.audience = process.env.APP_CLIENT_ID;
        }
        jwt.verify(token, getSigningKey, options, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    };

    try {
      await Promise.all([
        verifyToken(accessToken, true),
        verifyToken(idToken, false),
      ]);
    } catch (error) {
      console.error('Token verification failed:', error);
      return next();
    }

    // All good—continue with user info attached
    next();
  } catch (err) {
    console.error('Unexpected Optional Auth Middleware Error:', err);
    next();
  }
};

module.exports = optionalAuth;
