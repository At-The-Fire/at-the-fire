const { Router } = require('express');
const Gallery = require('../models/Gallery.js');
const Post = require('../models/Post.js');
const getRedisClient = require('../../redisClient.js');

module.exports = Router()
  .get('/', async (req, res, next) => {
    const cacheKey = 'gallery:main'; // Unique key for the gallery data

    try {
      const redisClient = await getRedisClient();

      // Step 1: Check Redis first
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.info('Serving Gallery from Redis cache');
        return res.json(JSON.parse(cachedData)); // Return cached gallery data
      }
      // Step 2: If not cached, fetch from Postgres
      console.info('Fetching Gallery from Postgres');
      const posts = await Gallery.getGalleryPosts();

      // Step 3: Store in Redis with a 5-minute expiration
      await redisClient.set(cacheKey, JSON.stringify(posts), { EX: 300 });

      res.json(posts);
    } catch (e) {
      next(e);
    }
  })

  .get('/:id', async (req, res, next) => {
    try {
      const data = await Gallery.getGalleryPostById(req.params.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .get('/urls/:id', async (req, res, next) => {
    try {
      const data = await Gallery.getGalleryImagesByPostId(req.params.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  .get('/feed/:id', async (req, res, next) => {
    try {
      let data = await Post.getFeedPosts(req.params.id);

      data = data.map((post) => {
        return {
          ...post,
          image_url: post.image_url,
        };
      });

      res.json(data);
    } catch (e) {
      next(e);
    }
  });
