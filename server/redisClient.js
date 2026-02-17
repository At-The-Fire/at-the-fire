const redis = require('redis');
let clientPromise;
const noopRedisClient = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  ttl: async () => -2,
};

function isRedisEnabled() {
  const raw = process.env.REDIS_ENABLED;
  if (raw === undefined || raw === null || raw === '') return true;
  return !['0', 'false', 'off', 'no'].includes(String(raw).toLowerCase());
}

function getRedisClient() {
  if (!clientPromise) {
    if (!isRedisEnabled()) {
      console.info('Redis disabled via REDIS_ENABLED; using noop client.');
      clientPromise = Promise.resolve(noopRedisClient);
      return clientPromise;
    }

    const client = redis.createClient({
      username: process.env.REDIS_USERNAME || 'default',
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
      },
    });
    client.on('error', (err) => console.error('Redis Client Error:', err));

    clientPromise = client
      .connect()
      .then(() => {
        console.info('Connected to Redis, man.');
        return client;
      })
      .catch((err) => {
        // eslint-disable-next-line
        console.warn('Redis connect failed; using noop client instead.', err);
        return noopRedisClient;
      });
  }
  return clientPromise;
}

module.exports = getRedisClient;
