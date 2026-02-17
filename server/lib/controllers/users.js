const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');

module.exports = Router().get('/', async (req, res, next) => {
  try {
    const searchTerm = req.query.search;

    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ error: 'Invalid search term' });
    }

    const testUsers = process.env.ALL_TEST_USERS
      ? process.env.ALL_TEST_USERS.split(',')
      : [];

    const searchResult = await AWSUser.searchUsers(searchTerm);
    const prodSearchResult = searchResult?.filter(
      (result) =>
        result.sub !== req.userAWSSub && !testUsers.includes(result.sub)
    );

    res.json(prodSearchResult);
  } catch (e) {
    next(e);
  }
});
