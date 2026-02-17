const express = require('express');
const cookieParser = require('cookie-parser');
const jsonParser = express.json();
const cors = require('cors');
const app = express();
const authenticateAWS = require('./middleware/authenticateAWS');
const authorizeSubscription = require('./middleware/authorizeSubscription.js');
const adminIdCheck = require('./middleware/adminIdCheck.js');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');

// Built in middleware
app.use(cookieParser());

app.set('trust proxy', 1);

// Rate limiting - helps prevent brute force attacks
// Testing
const testLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1-minute window for testing
  max: 150, // Lower limit for tests
  standardHeaders: true, // Include RateLimit headers
  legacyHeaders: false, // Disable X-RateLimit headers
  message: { code: 429, message: 'Too many requests, slow down.' }, // JSON response
});
// Production
const productionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 3000, // Higher limit for production
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 429, message: 'Too many requests, slow down.' },
});

// Apply the appropriate limiter based on environment
if (process.env.NODE_ENV === 'test') {
  app.use(testLimiter);
} else {
  app.use(productionLimiter);
}

app.use((_, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

//TODO still have cloudinary images displaying so leaving domains in for now- remove once fully migrated
// Helmet middleware for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (_, res) => `'nonce-${res.locals.nonce}'`,
          'js.stripe.com',
          'cognito-idp.us-west-2.amazonaws.com',
          'cdn.jsdelivr.net',
          'www.googletagmanager.com',
          'www.google-analytics.com',
        ],
        workerSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'res.cloudinary.com', //! still displaying cloudinary images at this time DO NOT REMOVE YET as mentioned above.  Should be removable by 2/1/25... scratch that date, images remain until deleted by user
          '*.cloudinary.com',
          'dzodr2cdk.cloudinary.com',
          'd5fmwpj8iaraa.cloudfront.net',
          '*.s3.us-west-2.amazonaws.com',
        ],
        mediaSrc: [
          "'self'",
          '*.cloudinary.com',
          'res.cloudinary.com',
          '*.s3.us-west-2.amazonaws.com',
          'd5fmwpj8iaraa.cloudfront.net',
        ],
        connectSrc: [
          "'self'",
          'api.stripe.com',
          '*.cloudinary.com',
          'cognito-idp.us-west-2.amazonaws.com',
          'cognito-identity.us-west-2.amazonaws.com',
          'www.google-analytics.com',
          'stats.g.doubleclick.net',
        ],
        frameSrc: ["'self'", 'js.stripe.com', 'docs.google.com', 'hooks.stripe.com'],
      },
    },
  })
);

// CORS configuration
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:7890',
      'https://www.atthefire.com',
      'https://at-the-fire.herokuapp.com', //! production server
      'https://at-the-fire-dev-68560297982b.herokuapp.com', //^ development server
    ],
    credentials: true,
  })
);

// App routes
app.use('/api/v1/gallery-posts', [jsonParser], require('./controllers/galleryPosts'));

app.use('/api/v1/profile', [jsonParser], require('./controllers/profile'));

app.use('/api/v1/auth', jsonParser, require('./controllers/auth'));

app.use('/api/v1/followers', jsonParser, require('./controllers/followers'));

app.use('/api/v1/likes', jsonParser, require('./controllers/likes'));

app.use(
  '/api/v1/conversations',
  jsonParser,
  authenticateAWS,
  require('./controllers/conversations')
);

app.use('/api/v1/users', [jsonParser, authenticateAWS], require('./controllers/users'));

app.use(
  '/api/v1/create-checkout-session',
  [jsonParser, authenticateAWS],
  require('./controllers/checkout')
);

app.use(
  '/api/v1/create-customer-portal-session',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/customerPortal')
);

app.use('/api/v1/stripe', [jsonParser, authenticateAWS], require('./controllers/stripe'));

app.use(
  '/api/v1/dashboard',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/dashboard')
);

app.use(
  '/api/v1/goals',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/goals')
);

app.use(
  '/api/v1/quota-tracking',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/quotaTracking')
);

app.use(
  '/api/v1/quota-tracking/:productId/sales',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/sales')
);

app.use(
  '/api/v1/inventory-snapshot',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/inventorySnapshot')
);

app.use(
  '/api/v1/orders',
  [jsonParser, authenticateAWS, authorizeSubscription],
  require('./controllers/orders')
);

app.use(
  '/api/v1/atf-operations',
  [jsonParser, authenticateAWS, authorizeSubscription, adminIdCheck],
  require('./controllers/atfOperations')
);

// Stripe webhook
app.use('/api/v1/webhook', require('./controllers/webhook'));

app.use((req, res, next) => {
  if (req.path.startsWith('/api/v1')) {
    next();
  } else if (req.accepts('html') && !req.path.includes('.')) {
    fs.readFile(path.join(__dirname, 'clientBuild/build', 'index.html'), 'utf8', (err, html) => {
      if (err) {
        return next(err);
      }

      // Add nonces to ALL script tags using regex
      html = html.replace(/<script([^>]*)>/g, `<script nonce="${res.locals.nonce}"$1>`);

      // Add environment indicator to title when DEV_SERVER is set
      if (process.env.DEV_SERVER === 'dev') {
        html = html.replace(/<title>At The Fire<\/title>/g, '<title>At The Fire: DEV</title>');
      }

      res.send(html);
    });
  } else {
    next();
  }
});

// Frontend routes
app.use(express.static(path.join(__dirname, 'clientBuild/build')));

// Error handling & 404 middleware for when
// a request doesn't match any app routes
app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));
module.exports = app;
