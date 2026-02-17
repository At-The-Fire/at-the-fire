require('dotenv').config();
const { Router } = require('express');
const authDelUp = require('../middleware/authDelUp');
const validatePost = require('../middleware/validatePost.js');
const AWSUser = require('../models/AWSUser.js');
const Post = require('../models/Post.js');
const { parse } = require('json2csv');
const getRedisClient = require('../../redisClient.js');
const multer = require('multer');
const Gallery = require('../models/Gallery.js');

//# Configure S3 client
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage }); // Memory storage to handle form-data

module.exports = {
  upload: multer({ storage }),
};
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
module.exports = Router()
  // inventory CSV download route
  .get('/download-inventory-csv', async (req, res, next) => {
    try {
      const data = await AWSUser.getGalleryPosts(req.customerId);

      // Format the created_at dates in the data
      const formattedData = data.map((item) => ({
        ...item,
        created_at: new Date(item.created_at).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
      }));

      const fields = ['created_at', 'title', 'description', 'image_url', 'category', 'price'];
      const opts = { fields };

      const csv = parse(formattedData, opts);

      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (e) {
      next(e);
    }
  })

  //# image routes begin ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // POST upload image files to S3
  .post('/upload', upload.array('imageFiles'), async (req, res) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot create new posts.',
      });
    }

    const uploadedKeys = [];
    try {
      try {
        await AWSUser.checkAndRecordImageUploads(req.customerId, req.files.length);
      } catch (e) {
        if (e.message.includes('upload limit')) {
          return res.status(400).json({ code: 400, message: e.message });
        }
      }

      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const timestamp = Date.now();
          const random1 = Math.random().toString(36).substring(2);
          const random2 = Math.random().toString(36).substring(2);
          const fileName = file.originalname;
          const uniqueId = `${timestamp}_${random1}${random2}_${fileName}`;

          // check which server prod or dev
          const bucketName = process.env.APP_ENV === 'development' ? '-dev' : '';
          // Define the file path in your S3 bucket
          const key = `at-the-fire${bucketName}/${uniqueId}`;
          uploadedKeys.push(key);

          // Wrap async operations in IIFE
          (async () => {
            try {
              const command = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                CacheControl: 'public, max-age=31536000, immutable',
              });

              await s3Client.send(command);

              // Use S3 URL in dev, CloudFront in prod
              const secure_url =
                process.env.APP_ENV === 'development'
                  ? `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
                  : `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

              const result = {
                public_id: uniqueId,
                secure_url,
                format: file.mimetype.split('/')[1],
                original_filename: file.originalname,
              };

              resolve(result);
            } catch (error) {
              reject(error);
            }
          })();
        });
      });

      // Wait for all uploads to complete concurrently
      const results = await Promise.all(uploadPromises);

      // Send response with S3 upload details
      res.status(200).json({
        message: 'Files uploaded successfully',
        files: results,
      });
    } catch (error) {
      // Cleanup any uploaded images if an error occurs
      if (uploadedKeys.length > 0) {
        await Promise.all(
          uploadedKeys.map(async (key) => {
            try {
              const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: key,
              });
              await s3Client.send(command);
            } catch (cleanupErr) {
              console.error('Failed to clean up orphaned S3 image:', cleanupErr);
            }
          })
        );
      }
      console.error('S3 upload error:', error);
      res.status(500).json({ message: error.message });
    }
  })

  // POST store image urls and public ids in db /////////////////////////////////
  .post('/images', upload.none(), async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot create new posts.',
      });
    }

    try {
      const post_id = req.body.id;
      const image_urls = JSON.parse(req.body.image_urls);
      const image_public_ids = JSON.parse(req.body.image_public_ids);
      const resource_types = JSON.parse(req.body.resource_types);
      const sub = req.body.sub;

      const post = await Post.addGalleryImages(
        post_id,
        image_urls,
        image_public_ids,
        resource_types,
        sub
      );
      res.json(post);
    } catch (e) {
      next(e);
    }
  })

  // POST transfer main image from gallery_posts to post_imgs for edit product => post creation
  .post('/transfer', async (req, res) => {
    try {
      // Extract postId from the request body
      const postId = req.body.postId;

      if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
      }

      // Call the static method to transfer images
      const result = await Post.transferImagesToPostImgs(postId);

      res.status(200).json(result);
    } catch (error) {
      console.error('Error transferring images:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  })

  // DELETE image from S3 /////////////////////////////////
  .post('/delete', upload.none(), async (req, res) => {
    const public_id = req.body.public_id;

    if (!public_id) {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    try {
      // Check which server: prod or dev
      const bucketName = process.env.APP_ENV === 'development' ? '-dev' : '';
      const key = `at-the-fire${bucketName}/${public_id}`;

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      });

      try {
        await s3Client.send(command);
        res.status(200).json({ message: 'Image deleted successfully' });
      } catch (error) {
        // Check if the error is because the object doesn't exist
        if (error.name === 'NoSuchKey') {
          res.status(200).json({
            message:
              'Image appears to already have been deleted from host. No other error reported- just this fancy message. Proceeding with deletion and then taking over the world.',
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('S3 error:', error);
      res.status(500).json({ error: error.message });
    }
  })
  //# image routes end  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  // GET all gallery posts for user
  .get('/', async (req, res, next) => {
    try {
      const posts = await AWSUser.getGalleryPosts(req.customerId);

      // Respond with the restricted flag and the posts data
      res.json({ restricted: req.restricted || false, posts });
    } catch (e) {
      next(e);
    }
  })

  //  POST new gallery post /////////////////////////////////
  .post('/', validatePost, async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot create new posts.',
      });
    }
    const sub = req.userAWSSub;

    try {
      const post = await Post.postNewPost(
        req.body.title,
        req.body.description,
        req.body.image_url,
        req.body.category,
        req.body.price,
        req.customerId,
        req.body.public_id,
        req.body.num_imgs,
        req.body.sold,
        req.body.date_sold
      );

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');
      await redisClient.del(`profilePosts:${sub}`);

      res.json(post);
    } catch (e) {
      next(e);
    }
  })

  // PUT update gallery post /////////////////////////////////
  .put('/:id', [authDelUp, validatePost], async (req, res, next) => {
    if (req.restricted) {
      return res.status(403).json({
        message: 'Your subscription is inactive. You cannot edit posts.',
      });
    }
    const sub = req.userAWSSub;
    const customerId = req.customerId;

    try {
      const post = await Gallery.getGalleryPostById(req.params.id);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const data = await Post.updateById(
        req.body.id,
        req.body.post.title,
        req.body.post.description,
        req.body.post.image_url,
        req.body.post.category,
        req.body.post.price,
        customerId,
        req.body.post.public_id,
        req.body.post.num_imgs,
        req.body.post.sold,
        req.body.post.date_sold
      );

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');
      await redisClient.del(`profilePosts:${sub}`);

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // update thumbnail in post/ product edit
  .put('/posts/:id/main-image', async (req, res, next) => {
    try {
      const { id } = req.params;
      const { image_url, public_id } = req.body;
      const sub = req.userAWSSub;

      if (!image_url || !public_id) {
        return res.status(400).json({
          error: 'Missing required image data',
        });
      }
      if (!isValidUrl(image_url)) {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      const updatedPost = await Post.updateMainImage(id, image_url, public_id);

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');
      await redisClient.del(`profilePosts:${sub}`);

      res.json(updatedPost);
    } catch (e) {
      next(e);
    }
  })

  // DELETE gallery post /////////////////////////////////
  .delete('/:id', [authDelUp], async (req, res, next) => {
    try {
      const sub = req.userAWSSub;
      const data = await Post.deleteById(req.params.id);

      if (!data) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');
      await redisClient.del(`profilePosts:${sub}`);

      res.status(204).end();
    } catch (e) {
      next(e);
    }
  })

  // DELETE one gallery image from database /////////////////////////////////
  .delete('/image/:id', [authDelUp], async (req, res, next) => {
    try {
      const sub = req.userAWSSub;
      const data = await Post.deleteImgDataById(req.params.id, req.body.public_id);

      const redisClient = await getRedisClient();
      await redisClient.del('gallery:main');
      await redisClient.del(`profilePosts:${sub}`);

      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // GET gallery post by id ///////////////////////////////////////////
  .get('/:id', [authDelUp], async (req, res, next) => {
    try {
      const data = await Post.getById(req.params.id);
      if (!data) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(data);
    } catch (e) {
      next(e);
    }
  })

  // GET urls for additional images /////////////////////////////////
  .get('/urls/:id', async (req, res, next) => {
    try {
      const data = await Post.getAdditionalImages(req.params.id);
      res.json(data);
    } catch (e) {
      next(e);
    }
  });
