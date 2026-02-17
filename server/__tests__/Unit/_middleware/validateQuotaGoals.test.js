const validateQuotaGoals = require('../../../lib/middleware/validateQuotaGoals.js');

describe('validateQuotaGoals middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        quotaData: {
          monthly_quota: '1000',
          work_days: '20',
        },
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should pass validation for valid quota data', () => {
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockReq.quotaData).toEqual({
      monthly_quota: 1000,
      work_days: 20,
    });
  });

  it('should reject when request body is null', () => {
    mockReq.body = null;
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Request body is required',
    });
  });

  it('should reject when request body is not an object', () => {
    mockReq.body = 'not an object';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Request body is required',
    });
  });

  it('should reject when quotaData is missing', () => {
    delete mockReq.body.quotaData;
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Request must include quotaData object',
    });
  });

  it('should reject when monthly_quota is missing', () => {
    delete mockReq.body.quotaData.monthly_quota;
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Monthly quota and work days are required fields',
    });
  });

  it('should reject when work_days is missing', () => {
    delete mockReq.body.quotaData.work_days;
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Monthly quota and work days are required fields',
    });
  });

  it('should reject when monthly_quota is not a number', () => {
    mockReq.body.quotaData.monthly_quota = 'not a number';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Monthly quota must be a positive number',
    });
  });

  it('should reject when monthly_quota is negative', () => {
    mockReq.body.quotaData.monthly_quota = '-100';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Monthly quota must be a positive number',
    });
  });

  it('should reject when work_days is not a number', () => {
    mockReq.body.quotaData.work_days = 'not a number';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'work_days must be a number between 1 and 31',
    });
  });

  it('should reject when work_days is negative', () => {
    mockReq.body.quotaData.work_days = '-5';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'work_days must be a number between 1 and 31',
    });
  });

  it('should reject when work_days is greater than 31', () => {
    mockReq.body.quotaData.work_days = '32';
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'work_days must be a number between 1 and 31',
    });
  });

  it('should convert string numbers to actual numbers', () => {
    mockReq.body.quotaData = {
      monthly_quota: '1500',
      work_days: '15',
    };
    validateQuotaGoals(mockReq, mockRes, nextFunction);
    expect(mockReq.quotaData).toEqual({
      monthly_quota: 1500,
      work_days: 15,
    });
  });
});
