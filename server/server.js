// server.js (or index.js)
const app = require('./lib/app');
const pool = require('./lib/utils/pool');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { getSigningKey } = require('./lib/utils/jwks');
const { initAuctionTimers } = require('./lib/jobs/auctionTimers');

const API_URL = process.env.API_URL || 'http://localhost';
const PORT = process.env.PORT || 7890;

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://www.atthefire.com',
      'https://at-the-fire.herokuapp.com',
      'https://at-the-fire-dev-68560297982b.herokuapp.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to the app so routes can access it
app.set('io', io);

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    if (!cookieHeader) {
      return next(new Error('Not authenticated'));
    }

    // Parse cookies manually
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });

    const idToken = cookies.idToken;
    if (!idToken) {
      return next(new Error('Not authenticated'));
    }

    // Verify token signature before trusting its claims
    const verifyOptions = {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      audience: process.env.APP_CLIENT_ID,
    };

    jwt.verify(idToken, getSigningKey, verifyOptions, (err, decoded) => {
      if (err || !decoded || !decoded.sub) {
        return next(new Error('Not authenticated'));
      }
      socket.userSub = decoded.sub;
      next();
    });
  } catch (e) {
    next(new Error('Not authenticated'));
  }
});

io.on('connection', (socket) => {
  console.info(`Socket connected: ${socket.id}`);

  // Join user-specific room for targeted notifications
  if (socket.userSub) {
    socket.join(`user_${socket.userSub}`);
    console.info(`Socket ${socket.id} joined room: user_${socket.userSub}`);
  }

  socket.on('disconnect', () => {
    console.info(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.info(`🚀 Server started on ${API_URL}:${PORT}`);

  // Initialize auction timers after server starts
  initAuctionTimers(io);
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(4242, () => console.info(`🦓 Stripe port running at ${API_URL}:4242`));
}

process.on('exit', () => {
  console.info('👋 Goodbye!');
  pool.end();
});
