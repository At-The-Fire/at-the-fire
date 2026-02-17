require('dotenv').config();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { getCognitoUserBySub } = require('../models/AWSUser.js');

// Set up JWKS client to get signing keys from AWS Cognito
const client = jwksClient({
  jwksUri: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
});

// Function to get signing key (cached to avoid repeated network calls)
const getSigningKey = (() => {
  const keyCache = {};
  const KEY_TTL = 12 * 60 * 60 * 1000;

  return (header, callback) => {
    if (!header.kid) {
      // Handle case where `kid` is missing
      const err = new Error('Missing Key ID (`kid`) in token header');
      console.error('Error retrieving signing key:', err);
      callback(err);
      return;
    }

    // Check if key exists and isn't expired
    if (
      keyCache[header.kid] &&
      Date.now() - keyCache[header.kid].timestamp < KEY_TTL
    ) {
      callback(null, keyCache[header.kid].key);
      return;
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('Error retrieving signing key:', err);
        callback(err);
        return;
      }

      const signingKey = key.publicKey || key.rsaPublicKey;

      keyCache[header.kid] = signingKey; // Cache the signing key
      // Cache the signing key with timestamp
      keyCache[header.kid] = {
        key: signingKey,
        timestamp: Date.now(),
      };
      callback(null, signingKey);
    });
  };
})();

// Middleware function
module.exports = async (req, res, next) => {
  try {
    // Retrieve tokens from cookies
    const accessToken = req.cookies['accessToken'];
    const idToken = req.cookies['idToken'];
    const refreshToken = req.cookies['refreshToken'];

    // Validate if the tokens are present
    if (!accessToken || !idToken || !refreshToken) {
      return res.status(401).json({
        message: 'You must be signed in to continue: missing or invalid token',
        code: 401,
        type: 'MissingOrInvalidToken',
      });
    }

    // Decode the idToken to get the AWS sub
    const decodedToken = jwt.decode(idToken);

    // Check if the decoded token is null or if the `sub` field is missing
    if (!decodedToken || !decodedToken.sub) {
      return res.status(401).json({
        message: 'Invalid token structure: sub is missing',
        code: 401,
      });
    }

    req.userAWSSub = decodedToken.sub;

    try {
      const sub = req.userAWSSub;
      const userExists = await getCognitoUserBySub({ sub });

      if (!userExists) {
        return res.status(401).json({
          message: 'User does not exist',
          code: 401,
          type: 'UserNotFoundError', // Adding type to match your pattern
        });
      }
    } catch (e) {
      console.error('User verification failed:', e);
      return res.status(401).json({
        message: 'User verification failed',
        code: 401,
        type: 'UserVerificationError',
      });
    }

    // Promise-based token verification using `getSigningKey`
    const verifyToken = (token, isAccessToken = false) => {
      return new Promise((resolve, reject) => {
        const options = {
          algorithms: ['RS256'],
          issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        };

        // Only add audience verification for ID tokens
        if (!isAccessToken) {
          options.audience = process.env.APP_CLIENT_ID;
        }

        jwt.verify(token, getSigningKey, options, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
    };

    // Verify tokens in parallel
    try {
      await Promise.all([
        verifyToken(accessToken, true), // access token
        verifyToken(idToken, false), // id token
      ]);
    } catch (error) {
      console.error('Token verification failed:', error);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token has expired!',
          code: 401,
          type: 'TokenExpiredError',
        });
      } else if (error.message.includes('Missing Key ID')) {
        return res.status(401).json({
          message: 'Missing Key ID in token header!',
          code: 401,
          type: 'MissingKeyIDError',
        });
      } else {
        return res.status(401).json({
          message: 'Token verification failed!',
          code: 401,
          type: 'TokenVerificationError',
        });
      }
    }

    // Proceed to the next middleware if everything is verified successfully

    next();
  } catch (err) {
    console.error('Unexpected Middleware Error:', err);
    // err.status = 401; //! this was how we learned in school-  should I include this as well as a 403 in authorize/ authDelUp?  Research.

    // Handle unexpected errors
    return res.status(500).json({
      message: 'Internal Server Error',
      code: 500,
    });
  }
};
