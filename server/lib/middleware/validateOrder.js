//
//
//*  this middleware sanitizes the order input data from dashboard
//
//
//

const validateOrder = (req, res, next) => {
  const orderData = req.body.orderData || req.body;
  const { date, client_name, items, shipping, order_number } = orderData;

  try {
    // Parse items back from JSON string
    const parsedItems = JSON.parse(items);

    // Convert single object to array if needed
    const itemsArray = Array.isArray(parsedItems) ? parsedItems : [parsedItems];

    // Validate all required fields exist
    if (
      !date ||
      !client_name ||
      !itemsArray.length ||
      typeof shipping !== 'number' ||
      !order_number
    ) {
      return res.status(400).json({
        error: 'Missing or invalid required order fields',
      });
    }

    // Validate each item
    const validItems = itemsArray.every((item) => {
      // Check if all necessary fields are present and of the right type
      const isValid =
        item.name &&
        typeof item.name === 'string' &&
        item.name.length <= 255 &&
        Number.isInteger(item.qty) &&
        item.qty > 0 &&
        item.qty <= 10000 &&
        typeof item.rate === 'number' &&
        item.rate >= 0 &&
        item.rate <= 1000000 &&
        item.category &&
        typeof item.category === 'string' &&
        item.category.length <= 255 &&
        item.description &&
        typeof item.description === 'string' &&
        item.description.length <= 255 &&
        shipping >= 0 &&
        shipping <= 100000;

      return isValid;
    });

    if (!validItems) {
      return res.status(400).json({
        error: 'Invalid item data or string length exceeds 255 characters',
      });
    }
    if (client_name.length > 255) {
      return res.status(400).json({
        error: 'Invalid item data or string length exceeds 255 characters',
      });
    }

    // If validation passes, attach parsed items to req
    req.parsedItems = parsedItems;
    next();
  } catch (error) {
    console.error('validation error: ', error);

    return res.status(400).json({ error: 'Invalid items JSON format' });
  }
};

module.exports = validateOrder;
