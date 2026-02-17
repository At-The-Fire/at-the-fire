const validateProfile = (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Invalid profile data format' });
    }

    const { displayName, logoImageUrl, logoPublicId, websiteUrl } = req.body;

    const stringFields = {
      displayName,
      logoImageUrl,
      logoPublicId,
      websiteUrl,
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

    next();
  } catch (e) {
    console.error('Validation error:', e);
    return res.status(400).json({ message: 'Invalid profile data format' });
  }
};

module.exports = validateProfile;
