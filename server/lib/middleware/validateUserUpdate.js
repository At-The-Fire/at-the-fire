const validateUserUpdate = (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Invalid profile data format' });
    }

    const { bio, firstName, imageUrl, lastName, publicId, socialMediaLinks } =
      req.body;

    const stringFields = {
      bio,
      firstName,
      imageUrl,
      lastName,
      publicId,
    };

    for (const [field, value] of Object.entries(stringFields)) {
      if (value !== null && value !== undefined) {
        if (typeof value !== 'string') {
          return res.status(400).json({ message: `${field} must be a string` });
        }
        if (value.length > 255) {
          return res
            .status(400)
            .json({ message: `${field} must be less than 255 characters` });
        }
      }
    }

    if (typeof socialMediaLinks !== 'object') {
      return res
        .status(400)
        .json({ message: 'socialMediaLinks must be an object' });
    }

    const { instagram, facebook, tiktok } = socialMediaLinks;
    const links = { instagram, facebook, tiktok };

    for (const [platform, link] of Object.entries(links)) {
      if (link && typeof link !== 'string') {
        return res
          .status(400)
          .json({ message: `${platform} link must be a string` });
      }
      if (link && link.length > 255) {
        return res.status(400).json({
          message: `${platform} link must be less than 255 characters`,
        });
      }
    }

    next();
  } catch (e) {
    console.error('Validation error:', e);
    return res.status(400).json({ message: 'Invalid profile data format' });
  }
};

module.exports = validateUserUpdate;
