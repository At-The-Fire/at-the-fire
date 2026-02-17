//
//
//* This middleware checks that post data is valid
//
//
//

const validatePost = (req, res, next) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Invalid post data format' });
    }

    const isNested = 'post' in req.body && typeof req.body.post === 'object';
    const post = isNested ? req.body.post : req.body;
    const { title, description, image_url, category, price, num_imgs, public_id, sold } = post;

    // Validate all required fields exist
    if (
      !title ||
      !description ||
      !image_url ||
      !category ||
      !price ||
      // !num_imgs ||  // not sure if this is even used- is causing an error editing product tied to post
      !public_id
    ) {
      return res.status(400).json({
        message: 'Missing required post fields',
      });
    }

    // Validate field types and constraints
    if (
      typeof title !== 'string' ||
      typeof description !== 'string' ||
      typeof image_url !== 'string' ||
      typeof category !== 'string' ||
      typeof public_id !== 'string'
    ) {
      return res.status(400).json({
        message: 'Invalid field types',
      });
    }

    if (sold !== undefined && typeof sold !== 'boolean') {
      // Try to convert string 'true'/'false' to boolean
      if (sold === 'true') {
        post.sold = true;
      } else if (sold === 'false') {
        post.sold = false;
      } else {
        return res.status(400).json({
          message: 'Sold status must be a boolean value',
        });
      }
    }

    // Validate string lengths
    if (category.length > 255 || description.length > 1000 || title.length > 255) {
      return res.status(400).json({
        message: 'Field length exceeds maximum allowed characters',
      });
    }

    // If validation passes, sanitize the data
    req.sanitizedProduct = {
      title: title.trim(),
      description: description.trim(),
      image_url: image_url.trim(),
      category: category.trim(),
      num_imgs: num_imgs?.toString(),

      price: price.toString(),
      public_id: public_id.trim(),
      sold: sold === undefined ? false : Boolean(sold),
    };

    next();
  } catch (e) {
    console.error('Validation error:', e);
    return res.status(400).json({ message: 'Invalid post data format' });
  }
};

module.exports = validatePost;
