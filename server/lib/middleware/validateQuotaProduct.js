//
//
//* This middleware checks that quota product data is valid
//
//
//
const validateQuotaProduct = (req, res, next) => {
  const productData = req.body;
  const {
    category,
    date,
    description,
    image_url,
    num_days,
    price,
    public_id,
    title,
    type,
    sold,
    qty,
  } = productData;

  try {
    // Validate all required fields exist
    if (
      !date ||
      !description ||
      !num_days ||
      !price ||
      !public_id ||
      !type ||
      !qty ||
      (type !== 'prep-other' && (!category || !title || !image_url))
    ) {
      return res.status(400).json({
        error: 'Missing required product fields',
      });
    }

    // Validate field types and constraints
    if (
      typeof description !== 'string' ||
      typeof image_url !== 'string' ||
      typeof public_id !== 'string' ||
      typeof type !== 'string' ||
      (type !== 'prep-other' && (typeof category !== 'string' || typeof title !== 'string'))
    ) {
      return res.status(400).json({
        error: 'Invalid field types',
      });
    }

    if (sold !== undefined && typeof sold !== 'boolean') {
      // Try to convert string 'true'/'false' to boolean
      if (sold === 'true') {
        productData.sold = true;
      } else if (sold === 'false') {
        productData.sold = false;
      } else {
        return res.status(400).json({
          error: 'Sold status must be a boolean value',
        });
      }
    }

    // Validate string lengths
    if (
      category?.length > 255 ||
      description?.length > 1000 ||
      title?.length > 255 ||
      type?.length > 50
    ) {
      return res.status(400).json({
        error: 'Field length exceeds maximum allowed characters',
      });
    }

    // Validate date is a valid timestamp
    const dateNum = Number(date);
    if (isNaN(dateNum) || dateNum <= 0) {
      return res.status(400).json({
        error: 'Invalid date format',
      });
    }

    // Validate num_days is a positive integer
    const days = Number(num_days);
    if (!Number.isInteger(days) || days <= 0) {
      return res.status(400).json({
        error: 'num_days must be a positive integer',
      });
    }

    // Validate price is a valid number string
    const priceNum = Number(price);
    if (
      isNaN(priceNum) ||
      (type === 'prep-other' && priceNum > 0) ||
      (type !== 'prep-other' && priceNum < 0)
    ) {
      return res.status(400).json({
        error:
          type === 'prep-other'
            ? 'Prep costs must be negative values'
            : 'Price must be a positive value',
      });
    }

    // Validate type is one of the allowed values
    const validTypes = ['auction', 'direct-sale', 'inventory', 'prep-other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid product type',
      });
    }

    // Validate qty is a positive integer
    if (!Number(qty) || qty <= 0) {
      return res.status(400).json({
        error: 'qty must be a positive integer',
      });
    }

    // If validation passes, sanitize the data
    req.sanitizedProduct = {
      category: category?.trim(),
      date: dateNum?.toString(),
      description: description?.trim(),
      image_url: image_url?.trim(),
      num_days: days?.toString(),
      price: priceNum?.toString(),
      public_id: public_id?.trim(),
      title: title?.trim(),
      type: type?.trim(),
      sold: sold === undefined ? false : Boolean(sold),
      qty,
    };

    next();
  } catch (e) {
    console.error('Validation error:', e);
    return res.status(400).json({ error: 'Invalid product data format' });
  }
};

module.exports = validateQuotaProduct;
