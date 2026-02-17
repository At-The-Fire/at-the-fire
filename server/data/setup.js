const fs = require('fs').promises;
const { encrypt } = require('../lib/services/encryption.js');
const crypto = require('crypto');

function hashEmail(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}
// this runs on setup and  is for encrypting the user test data
async function encryptCognitoUsers(pool) {
  const allUsers = await pool.query(
    'SELECT id, first_name, last_name, email FROM cognito_users'
  );

  for (const user of allUsers.rows) {
    const encryptedEmail = encrypt(user.email);
    const emailHash = hashEmail(user.email);
    const { id } = user;

    await pool.query(
      'UPDATE cognito_users SET email = $1,email_hash = $2 WHERE id = $3',
      [encryptedEmail, emailHash, id]
    );
  }
}
// this runs on setup and is for encrypting the customer test data
async function encryptStripeCustomers(pool) {
  const allCustomers = await pool.query(
    'SELECT customer_id, name, email, phone FROM stripe_customers'
  );

  for (const customer of allCustomers.rows) {
    const encryptedEmail = encrypt(customer.email);
    const encryptedPhone = encrypt(customer.phone);
    const emailHash = hashEmail(customer.email);

    await pool.query(
      'UPDATE stripe_customers SET email = $1, phone = $2,email_hash = $3 WHERE customer_id = $4',
      [encryptedEmail, encryptedPhone, emailHash, customer.customer_id]
    );
  }
}
// this runs on setup and is for encrypting the customer product test data
async function encryptQuotaTracking(pool) {
  const allProducts = await pool.query(
    'SELECT type, title, description, category, price, image_url, public_id,customer_id FROM quota_tracking'
  );

  for (const product of allProducts.rows) {
    const encryptedType = encrypt(product.type);
    const encryptedTitle = encrypt(product.title);
    const encryptedDescription = encrypt(product.description);
    const encryptedCategory = encrypt(product.category);
    const encryptedPrice = encrypt(product.price);
    const encryptedImageUrl = encrypt(product.image_url);
    const encryptedPublicId = encrypt(product.public_id);

    await pool.query(
      'UPDATE quota_tracking SET type = $1, title = $2, description = $3,category = $4,price = $5,image_url = $6, public_id = $7 WHERE customer_id = $8',
      [
        encryptedType,
        encryptedTitle,
        encryptedDescription,
        encryptedCategory,
        encryptedPrice,
        encryptedImageUrl,
        encryptedPublicId,
        product.customer_id,
      ]
    );
  }
}

// this runs on setup and is for encrypting the customer test data
async function encryptMessages(pool) {
  const allMessages = await pool.query(
    'SELECT content, sender_sub FROM messages'
  );

  for (const message of allMessages.rows) {
    const encryptedContent = encrypt(message.content);

    await pool.query('UPDATE messages SET content = $1 WHERE sender_sub = $2', [
      encryptedContent,
      message.sender_sub,
    ]);
  }
}
module.exports = (pool) => {
  return fs
    .readFile(`${__dirname}/../sql/setup.sql`, { encoding: 'utf-8' })
    .then((sql) => pool.query(sql))
    .then(async () => {
      await encryptCognitoUsers(pool);
      await encryptStripeCustomers(pool);
      await encryptQuotaTracking(pool);
      await encryptMessages(pool);
    })

    .then(() => {
      if (process.env.NODE_ENV !== 'test') {
        console.info('✅ Database setup complete!');
      }
    })
    .catch((error) => {
      const dbNotFound = error.message.match(/database "(.+)" does not exist/i);

      if (dbNotFound) {
        const [err, db] = dbNotFound;
        console.error('❌ Error: ' + err);
        console.info(
          `Try running \`createdb -U postgres ${db}\` in your terminal`
        );
      } else {
        console.error(error);
        console.error('❌ Error: ' + error.message);
      }
    });
};
