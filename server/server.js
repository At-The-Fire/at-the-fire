// server.js (or index.js)
const app = require('./lib/app');
const pool = require('./lib/utils/pool');
const http = require('http');
const socketIo = require('socket.io');

const API_URL = process.env.API_URL || 'http://localhost';
const PORT = process.env.PORT || 7890;

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://atthefire.com',
      'https://www.atthefire.com',
      'https://at-the-fire-dev-68560297982b.herokuapp.com',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to the app so routes can access it
app.set('io', io);

io.on('connection', (socket) => {
  console.info(`Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.info(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.info(`🚀 Server started on ${API_URL}:${PORT}`);
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(4242, () => console.info(`🦓 Stripe port running at ${API_URL}:4242`));
}

process.on('exit', () => {
  console.info('👋 Goodbye!');
  pool.end();
});
