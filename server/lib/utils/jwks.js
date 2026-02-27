require('dotenv').config();
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: `https://cognito-idp.us-west-2.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
});

const getSigningKey = (() => {
  const keyCache = {};
  const KEY_TTL = 12 * 60 * 60 * 1000;

  return (header, callback) => {
    if (!header.kid) {
      const err = new Error('Missing Key ID (`kid`) in token header');
      console.error('Error retrieving signing key:', err);
      callback(err);
      return;
    }

    if (keyCache[header.kid] && Date.now() - keyCache[header.kid].timestamp < KEY_TTL) {
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
      keyCache[header.kid] = { key: signingKey, timestamp: Date.now() };
      callback(null, signingKey);
    });
  };
})();

module.exports = { getSigningKey };
