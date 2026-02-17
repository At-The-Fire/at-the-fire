const { Router } = require('express');
const AWSUser = require('../models/AWSUser.js');
const StripeCustomer = require('../models/StripeCustomer.js');
const authenticateAWS = require('../middleware/authenticateAWS.js');
const authorizeSubscription = require('../middleware/authorizeSubscription.js');
const profileOwnership = require('../middleware/profileOwnership.js');
const validateUserUpdate = require('../middleware/validateUserUpdate.js');
const validateCustomerUpdate = require('../middleware/validateCustomerUpdate.js');
const multer = require('multer');
const Gallery = require('../models/Gallery.js');
const getRedisClient = require('../../redisClient.js');

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

const s3UploadHelper = async (file, folder) => {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2);
  const random2 = Math.random().toString(36).substring(2);
  const fileName = file.originalname;
  const uniqueId = `${timestamp}_${random1}${random2}_${fileName}`;

  // Add '-dev' to folder in development
  const bucketSuffix = process.env.APP_ENV === 'development' ? '-dev' : '';
  const key = `${folder}${bucketSuffix}/${uniqueId}`;

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
    const secureUrl =
      process.env.APP_ENV === 'development'
        ? `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
        : `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;
    return {
      publicId: key,
      secureUrl,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

module.exports = Router()
  // Get all user profile and customer profile data
  .get('/:sub', async (req, res) => {
    try {
      const { sub } = req.params;
      const cacheKey = `profile:${sub}`;
      const cacheKey2 = `bizProfile:${sub}`;
      const cacheKey3 = `profilePosts:${sub}`;
      const redisClient = await getRedisClient();

      // Fetch cached data
      let profile = null;
      let bizProfile = null;
      let posts = [];

      const [cachedProfile, cachedBizProfile, cachedPosts] = await Promise.all([
        redisClient.get(cacheKey),
        redisClient.get(cacheKey2),
        redisClient.get(cacheKey3),
      ]);

      if (cachedProfile) profile = JSON.parse(cachedProfile);
      if (cachedBizProfile) bizProfile = JSON.parse(cachedBizProfile);
      if (cachedPosts) posts = JSON.parse(cachedPosts);

      // Fetch missing profile
      if (!profile) {
        console.info('Fetching profile from Postgres');
        try {
          const profileData = await AWSUser.getCognitoUserBySub({ sub });

          if (profileData) {
            profile = {
              sub: profileData.sub,
              createdAt: profileData.createdAt,
              imageUrl: profileData.imageUrl,
              publicId: profileData.publicId,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              bio: profileData.bio,
              socialMediaLinks: profileData.socialMediaLinks,
            };
            await redisClient.set(cacheKey, JSON.stringify(profile), {
              EX: 86400,
            });
          }
        } catch (e) {
          if (e.message !== 'User not found') throw e;
        }
      }

      // Fetch missing bizProfile
      if (!bizProfile) {
        console.info('Fetching business profile from Postgres');
        try {
          const bizProfileData = await StripeCustomer.getStripeByAWSSub(sub);
          if (bizProfileData) {
            bizProfile = {
              awsSub: bizProfileData?.awsSub,
              customerId: bizProfileData?.customerId,
              name: bizProfileData?.name,
              displayName: bizProfileData?.displayName,
              logoImageUrl: bizProfileData?.logoImageUrl,
              logoPublicId: bizProfileData?.logoPublicId,
              websiteUrl: bizProfileData?.websiteUrl,
            };
            await redisClient.set(cacheKey2, JSON.stringify(bizProfile), {
              EX: 86400,
            });
          }
        } catch (e) {
          if (e.message !== 'User not found') throw e;
        }
      }

      // Fetch missing posts
      if (!posts.length && bizProfile?.customerId) {
        console.info('Fetching posts from Postgres');
        posts = await Gallery.getGalleryPostsByStripeId(bizProfile.customerId);
        await redisClient.set(cacheKey3, JSON.stringify(posts), { EX: 300 });
      }

      if (!profile && !bizProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      return res.json({ profile, bizProfile, posts });
    } catch (err) {
      console.error(err);
      return res.status(500).json(err.message);
    }
  })

  // Update user profile data
  .put('/user-update', [authenticateAWS, validateUserUpdate], async (req, res, next) => {
    try {
      const sub = req.userAWSSub;

      const { firstName, lastName, bio, socialMediaLinks, imageUrl, publicId } = req.body;

      const profile = await AWSUser.updateCognitoUserBySub(
        { sub },
        {
          firstName,
          lastName,
          bio,
          socialMediaLinks,
          imageUrl,
          publicId,
        }
      );

      const redisClient = await getRedisClient();
      await redisClient.del(`profile:${sub}`);

      res.json(profile);
    } catch (err) {
      // Check for our specific "User not found" error
      if (err.message === 'User not found') {
        return res.status(404).send({ error: 'User not found' });
      }
      next(err);
    }
  })
  //
  // Update customer profile data
  .put(
    '/customer-update',
    [authenticateAWS, authorizeSubscription, profileOwnership, validateCustomerUpdate],
    async (req, res, next) => {
      const sub = req.userAWSSub;

      try {
        const customerId = req.customerId;
        const { displayName, websiteUrl, logoImageUrl, logoPublicId } = req.body;

        const bizProfile = await StripeCustomer.updateByCustomerId(customerId, {
          displayName,
          websiteUrl,
          logoImageUrl,
          logoPublicId,
        });
        if (!bizProfile) {
          return res.status(404).send({ error: 'User not found' });
        }

        const redisClient = await getRedisClient();
        await redisClient.del(`bizProfile:${sub}`);

        res.json(bizProfile);
      } catch (err) {
        next(err);
      }
    }
  )

  //* Upload user avatar image to S3 ---------------------------------
  .post('/avatar-upload', authenticateAWS, upload.single('avatar'), async (req, res) => {
    let uploadedKey = null;
    try {
      const file = req.file;
      const s3Folder = 'user-avatars';
      const { publicId, secureUrl } = await s3UploadHelper(file, s3Folder);
      uploadedKey = publicId;
      // If you add DB or other logic here, keep uploadedKey for cleanup
      res.json({ publicId, secureUrl });
    } catch (e) {
      if (uploadedKey) {
        try {
          const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: uploadedKey,
          });
          await s3Client.send(command);
        } catch (cleanupErr) {
          console.error('Failed to clean up orphaned S3 image:', cleanupErr);
        }
      }
      console.error(e);
      if (e.message === 'Only image files are allowed') {
        return res.status(400).send(e.message);
      }
      res.status(500).json({ message: 'An error occurred while uploading the image' });
    }
  })

  // DELETE user avatar image from S3 /////////////////////////////////
  .post('/avatar-delete', authenticateAWS, upload.none(), async (req, res) => {
    const public_id = req.body.public_id;
    const sub = req.userAWSSub;

    if (!public_id) {
      res.status(400).json({ error: 'Public ID is required' });
      return;
    }

    try {
      const key = public_id;

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
      const redisClient = await getRedisClient();
      await redisClient.del(`profile:${sub}`);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })

  // Upload customer logo image to S3 ---------------------------------
  .post(
    '/logo-upload',
    [authenticateAWS, authorizeSubscription],
    upload.single('logo'),
    async (req, res) => {
      let uploadedKey = null;
      try {
        const file = req.file;
        const s3Folder = 'subscriber-logos';
        const { publicId, secureUrl } = await s3UploadHelper(file, s3Folder);
        uploadedKey = publicId;
        // If you add DB or other logic here, keep uploadedKey for cleanup
        res.json({ publicId, secureUrl });
      } catch (e) {
        if (uploadedKey) {
          try {
            const command = new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: uploadedKey,
            });
            await s3Client.send(command);
          } catch (cleanupErr) {
            console.error('Failed to clean up orphaned S3 image:', cleanupErr);
          }
        }
        console.error(e);
        if (e.message === 'Only image files are allowed') {
          return res.status(400).send(e.message);
        }
        res.status(500).json('An error occurred while uploading the images');
      }
    }
  )

  // DELETE user logo image from S3 /////////////////////////////////
  .post(
    '/logo-delete',
    [authenticateAWS, authorizeSubscription],
    upload.none(),
    async (req, res) => {
      const public_id = req.body.public_id;
      const sub = req.userAWSSub;

      if (!public_id) {
        res.status(400).json({ error: 'Public ID is required' });
        return;
      }

      try {
        const key = public_id;

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
        const redisClient = await getRedisClient();
        await redisClient.del(`profile:${sub}`);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );
