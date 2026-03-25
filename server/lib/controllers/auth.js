const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');
const validator = require('validator');
const authenticateAWS = require('../middleware/authenticateAWS.js');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const jwt = require('jsonwebtoken');
const { getSigningKey } = require('../utils/jwks');

const { getStripeByAWSSub, insertBetaPlaceholder } = require('../models/StripeCustomer.js');
const { getSubscriptionByCustomerId } = require('../models/Subscriptions');

const poolData = {
  UserPoolId: process.env.COGNITO_USER_POOL_ID,
  ClientId: process.env.APP_CLIENT_ID,
};

// const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);  // this WORKS testing below to pass CI 9.30.23
let userPool;

if (process.env.NODE_ENV !== 'test') {
  userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
}

module.exports = Router()
  .post('/new-user', async (req, res, next) => {
    try {
      const { email, sub, tosVersion } = req.body;

      // Check for missing data
      if (!email) throw new Error('Missing email error.');
      if (!sub) throw new Error('Missing sub error.');

      // Validate data type
      if (typeof email !== 'string' || typeof sub !== 'string') {
        res.status(400).json({ error: 'Invalid data format.' });
        return;
      }

      // Validate sub looks like a UUID (8-4-4-4-12 hex).
      // AWS Cognito generates non-standard variant bits so validator.isUUID() rejects them.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub)) {
        return res.status(400).json({ error: 'Invalid sub format.' });
      }

      // Validate email format
      // there is an optional "options" object that can be passed to the validator
      // to specify a list of allowed formats... not sure if we need it
      if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
      }

      if (!tosVersion || typeof tosVersion !== 'string') {
        return res.status(400).json({ error: 'tosVersion is required.' });
      }

      await AWSUser.insertAWS({ email, sub, tosVersion });

      res.json({
        message: 'Account created successfully, check email for verification!',
      });
    } catch (e) {
      if (
        e.message.includes('duplicate key value violates unique constraint "cognito_users_sub_key"')
      ) {
        res.status(409).json('Sub already exists.');
      } else if (
        e.message.includes(
          'duplicate key value violates unique constraint "cognito_users_email_key"',
        )
      ) {
        res.status(409).json('Email already exists.');
      } else if (e.message.includes('Missing sub error.')) {
        res.status(400).json('Sub is required.');
      } else if (e.message.includes('Missing email error.')) {
        res.status(400).json('Email is required.');
      } else {
        res.status(500).json('Something went wrong.');
        console.error(e);
        next(e);
      }
    }
  })

  .post('/create-cookies', async (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Session data is missing.' });
      }

      // create a session for the user from the token data in the request body
      const session = req.body;

      // get the tokens from the session and store to a variable for use in baking cookies
      const idToken = session.idToken.jwtToken;
      const accessToken = session.accessToken.jwtToken;
      const refreshToken = session.refreshToken.token;

      // Verify both tokens before setting cookies (H6)
      const verifyToken = (token, isAccessToken = false) => {
        return new Promise((resolve, reject) => {
          const options = {
            algorithms: ['RS256'],
            issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
          };
          if (!isAccessToken) options.audience = process.env.APP_CLIENT_ID;
          jwt.verify(token, getSigningKey, options, (err) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
      };

      try {
        await Promise.all([verifyToken(accessToken, true), verifyToken(idToken, false)]);
      } catch {
        return res.status(401).json({ error: 'Invalid tokens' });
      }

      const isSecure = process.env.SECURE_COOKIES === 'true';
      const cookieOpts = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'None' : 'Lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      };

      // bake the cookies with the tokens received from the session
      res.cookie('accessToken', accessToken, cookieOpts);
      res.cookie('idToken', idToken, cookieOpts);
      res.cookie('refreshToken', refreshToken, cookieOpts);

      res.json({ message: 'Cookies created successfully!' });
    } catch (e) {
      if (e.message.includes('Cannot read properties')) {
        res.status(400).json({ error: 'One or more tokens are missing.' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
        console.error(e);
        next(e);
      }
    }
  })

  .delete('/clear-cookies', async (req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    try {
      const isSecure = process.env.SECURE_COOKIES === 'true';
      const cookieOptions = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'None' : 'Lax',
      };

      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('idToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: 'Internal server error' });
      console.error(e);
    }
  })

  // Assuming authenticateAWS is still needed to authenticate the user
  .get('/check-customer', [authenticateAWS], async (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    try {
      // Fetch the customerId based on the user's AWS Sub
      const sub = req.userAWSSub;
      const stripeCustomer = await getStripeByAWSSub(sub);
      let subscription = null;
      if (!stripeCustomer) {
        if (process.env.BETA_MODE === 'true') {
          const placeholder = await insertBetaPlaceholder(sub);
          return res.status(200).json({
            hasSubscription: false,
            betaAccess: true,
            customerId: placeholder.customerId,
            confirmed: true,
            subscription: null,
          });
        }
        return res.status(200).json({
          hasSubscription: false,
          message: 'User is not subscribed',
        });
      }

      const { customerId, email, name, confirmed } = stripeCustomer;

      const betaModeActive = process.env.BETA_MODE === 'true';

      if (stripeCustomer.customerId) {
        subscription = await getSubscriptionByCustomerId({ customerId });
      }

      const cognitoUser = await AWSUser.getCognitoUserBySub({ sub });

      res.json({
        hasSubscription: true,
        customerId,
        subscription,
        email,
        name,
        admin: cognitoUser?.isAdmin || false,
        confirmed,
        betaAccess: betaModeActive,
      });
    } catch (e) {
      if (e.message.includes('User not found')) {
        res.status(404).json({ error: e.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
        console.error(e);
        next(e);
      }
    }
  })

  .post('/refresh-tokens', async (req, res) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    try {
      const refreshTokenFromCookie = req.cookies['refreshToken'];
      const idToken = req.cookies['idToken'];

      if (!refreshTokenFromCookie) {
        return res.status(400).send('No refresh token provided');
      }

      if (!idToken) {
        return res.status(400).send('No ID token provided');
      }

      let sub;
      try {
        const verifiedToken = await new Promise((resolve, reject) => {
          jwt.verify(
            idToken,
            getSigningKey,
            {
              algorithms: ['RS256'],
              issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
              audience: process.env.APP_CLIENT_ID,
              ignoreExpiration: true, // token may be expired — that's why we're refreshing
            },
            (err, decoded) => {
              if (err) reject(err);
              else resolve(decoded);
            },
          );
        });
        if (!verifiedToken || !verifiedToken.sub) {
          return res.status(400).send('Invalid ID token');
        }
        sub = verifiedToken.sub;
      } catch {
        return res.status(400).send('Error verifying ID token');
      }

      const awsSub = sub;

      if (!refreshTokenFromCookie) {
        return res.status(400).send('No ID token provided');
      }

      const username = await AWSUser.getEmailBySub({ sub: awsSub });

      const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: username,
        Pool: userPool,
      });

      const refreshToken = new AmazonCognitoIdentity.CognitoRefreshToken({
        RefreshToken: refreshTokenFromCookie,
      });

      cognitoUser.refreshSession(refreshToken, (err, session) => {
        if (err) {
          console.error('Refresh token error:', err);

          // Error handling for expired tokens
          if (err.code === 'TokenExpiredException') {
            // Replace with the actual error code
            return res.status(401).send('Refresh token expired');
          }
          // Error handling for invalid tokens
          else if (err.code === 'InvalidTokenException') {
            // Replace with the actual error code
            return res.status(400).send('Invalid refresh token');
          }
          // Error handling for malformed tokens
          else if (
            err.code === 'MalformedTokenException' ||
            err.message.includes('Malformed token') ||
            err.code === 'NotAuthorizedException'
          ) {
            // Replace with actual error indication
            return res.status(400).send('Malformed refresh token');
          } else {
            // Generic error handling for other types of errors
            return res.status(401).send('Failed to refresh tokens due to an unknown error');
          }
        }
        // Set the new tokens in HTTP-only cookies
        const newAccessToken = session.accessToken.jwtToken;
        const newIdToken = session.idToken.jwtToken;

        // You might not get a new refreshToken every time. But if you do:
        const newRefreshToken = session.refreshToken ? session.refreshToken.token : null;

        const isSecure = process.env.SECURE_COOKIES === 'true';
        const refreshCookieOpts = {
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'None' : 'Lax',
          maxAge: 30 * 24 * 60 * 60 * 1000,
        };
        res.cookie('accessToken', newAccessToken, refreshCookieOpts);
        res.cookie('idToken', newIdToken, refreshCookieOpts);
        if (newRefreshToken) {
          // Only set this if you've received a new one.
          res.cookie('refreshToken', newRefreshToken, refreshCookieOpts);
        }

        // Example: Adding expiration time to the response
        res.status(200).send({
          message: 'Tokens refreshed and cookies updated successfully',
          accessTokenExpiry: session.accessToken.getExpiration(), // or however you can obtain the expiry
        });
      });
    } catch (e) {
      console.error('Refresh token error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
