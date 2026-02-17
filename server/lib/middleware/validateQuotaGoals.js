//
//
//* This middleware checks that quota goal data is valid
//
//
//

function validateQuotaGoals(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      message: 'Request body is required',
    });
  }

  const { quotaData } = req.body;
  if (!quotaData) {
    return res.status(400).json({
      message: 'Request must include quotaData object',
    });
  }

  const { monthly_quota, work_days } = quotaData;

  // Check if required fields exist
  if (!monthly_quota || !work_days) {
    return res.status(400).json({
      message: 'Monthly quota and work days are required fields',
    });
  }

  // Ensure values are numbers and within reasonable ranges
  const quotaNum = Number(monthly_quota);
  const daysNum = Number(work_days);

  if (isNaN(quotaNum) || quotaNum <= 0) {
    return res.status(400).json({
      message: 'Monthly quota must be a positive number',
    });
  }

  if (isNaN(daysNum) || daysNum <= 0 || daysNum > 31) {
    return res.status(400).json({
      message: 'work_days must be a number between 1 and 31',
    });
  }

  // If validation passes, attach sanitized numbers to req
  req.quotaData = {
    monthly_quota: quotaNum,
    work_days: daysNum,
  };

  next();
}

module.exports = validateQuotaGoals;
