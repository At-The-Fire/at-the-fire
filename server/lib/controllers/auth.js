const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');
const validator = require('validator');
const authenticateAWS = require('../middleware/authenticateAWS.js');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const jwt = require('jsonwebtoken');

const { getStripeByAWSSub } = require('../models/StripeCustomer.js');
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
      const { email, sub } = req.body;

      // Check for missing data
      if (!email) throw new Error('Missing email error.');
      if (!sub) throw new Error('Missing sub error.');

      // Validate data type
      if (typeof email !== 'string' || typeof sub !== 'string') {
        res.status(400).json({ error: 'Invalid data format.' });
        return;
      }

      // Validate email format
      // there is an optional "options" object that can be passed to the validator
      // to specify a list of allowed formats... not sure if we need it
      if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
      }

      await AWSUser.insertAWS({ email, sub });

      res.json({
        message: 'Account created successfully, check email for verification!',
      });
    } catch (e) {
      if (
        e.message.includes('duplicate key value violates unique constraint "cognito_users_sub_key"')
      ) {
        res.status(409).json('Sub already exists.');
        next(e);
      } else if (
        e.message.includes(
          'duplicate key value violates unique constraint "cognito_users_email_key"'
        )
      ) {
        res.status(409).json('Email already exists.');
        next(e);
      } else if (e.message.includes('Missing sub error.')) {
        res.status(400).json('Sub is required.');
        next(e);
      } else if (e.message.includes('Missing email error.')) {
        res.status(400).json('Email is required.');
        next(e);
      } else {
        // Handle other errors or default case
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
      // Check if session data is provided
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: 'Session data is missing.' });
      }

      // create a session for the user from the token data in the request body
      const session = req.body;

      // get the tokens from the session and store to a variable for use in baking cookies
      const idToken = session.idToken.jwtToken;
      const accessToken = session.accessToken.jwtToken;
      const refreshToken = session.refreshToken.token;

      // bake the cookies with the tokens received from the session
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
        sameSite: 'None',
      });

      res.cookie('idToken', idToken, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
        sameSite: 'None',
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
        sameSite: 'None',
      });

      res.json({ message: 'Cookies created successfully!' });
    } catch (e) {
      if (e.message.includes('Cannot read properties')) {
        res.status(400).json({ error: 'One or more tokens are missing.' });
      } else {
        res.status(500).json({ error: e.message });
      }
      next(e);
    }
  })

  .delete('/clear-cookies', async (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    try {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false', // String values to match exactly
        sameSite: 'None',
      };

      res.clearCookie('accessToken', cookieOptions);
      res.clearCookie('idToken', cookieOptions);
      res.clearCookie('refreshToken', cookieOptions);

      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: e.message });
      next(e);
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
        return res.status(200).json({
          hasSubscription: false,
          message: 'User is not subscribed',
        });
      }

      const { customerId, email, name, confirmed } = stripeCustomer;
      if (stripeCustomer.customerId) {
        subscription = await getSubscriptionByCustomerId({ customerId });
      }

      res.json({
        hasSubscription: true,
        customerId,
        subscription,
        email,
        name,
        admin: customerId === process.env.ADMIN_ID,
        confirmed,
      });
    } catch (e) {
      if (e.message.includes('User not found')) {
        res.status(404).json({ error: e.message });
      } else {
        res.status(500).json({ error: e.message });
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
        // eslint-disable-next-line no-console
        console.log('No refresh token provided apparently???  ', refreshTokenFromCookie);

        return res.status(400).send('No refresh token provided');
      }

      if (!idToken) {
        // eslint-disable-next-line no-console
        console.log('No ID token provided apparently???  ', idToken);

        return res.status(400).send('No ID token provided');
      }

      let sub;
      try {
        const decodedToken = jwt.decode(idToken);
        if (!decodedToken || !decodedToken.sub) {
          // eslint-disable-next-line no-console
          console.log('Invalid ID token  =======================');

          // If the decoded token is null or doesn't have a 'sub' field, it's invalid
          return res.status(400).send('Invalid ID token');
        }
        sub = decodedToken.sub;
      } catch (error) {
        // Handle decoding errors (malformed tokens, etc.)
        // eslint-disable-next-line no-console
        console.log('Error decoding ID token  =======================', error);

        return res.status(400).send('Error decoding ID token: ' + error.message);
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
          //TODO need to make sure all error codes match real AWS errors so leaving logs in for now
          console.error('Refresh token error:', err);
          // eslint-disable-next-line no-console
          console.log('err.code', err.code);
          // eslint-disable-next-line no-console
          console.log('err.message', err.message);

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

        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
          sameSite: 'None',
        });
        res.cookie('idToken', newIdToken, {
          httpOnly: true,
          secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
          sameSite: 'None',
        });
        if (newRefreshToken) {
          // Only set this if you've received a new one.
          res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.SECURE_COOKIES === 'true' ? 'true' : 'false',
            sameSite: 'None',
          });
        }

        // Example: Adding expiration time to the response
        res.status(200).send({
          message: 'Tokens refreshed and cookies updated successfully',
          accessTokenExpiry: session.accessToken.getExpiration(), // or however you can obtain the expiry
        });
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
      console.error('error message:', e.message);
    }
  });
