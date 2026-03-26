jest.mock('../../../lib/utils/pool');

const Invoices = require('../../../lib/models/Invoices.js');
const pool = require('../../../lib/utils/pool.js');

const mockRow = {
  customer_id: 'cus_123',
  invoice_id: 'inv_abc',
  start_date: '1731389540',
  end_date: '1762925540',
  invoice_status: 'paid',
  subscription_id: 'sub_xyz',
  amount_due: 5000,
  amount_paid: 5000,
};

describe('Invoices Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('maps all 8 snake_case columns to camelCase properties', () => {
      const invoice = new Invoices(mockRow);
      expect(invoice.customerId).toBe('cus_123');
      expect(invoice.invoiceId).toBe('inv_abc');
      expect(invoice.startDate).toBe('1731389540');
      expect(invoice.endDate).toBe('1762925540');
      expect(invoice.invoiceStatus).toBe('paid');
      expect(invoice.subscriptionId).toBe('sub_xyz');
      expect(invoice.amountDue).toBe(5000);
      expect(invoice.amountPaid).toBe(5000);
    });
  });

  describe('insertNewInvoice()', () => {
    it('returns an Invoices instance with mapped properties', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Invoices.insertNewInvoice('inv_abc', 'sub_xyz', 'cus_123', '1731389540', '1762925540');

      expect(result).toBeInstanceOf(Invoices);
      expect(result.invoiceId).toBe('inv_abc');
      expect(result.customerId).toBe('cus_123');
    });

    it('calls pool.query with INSERT and params in correct order [invoiceID, subscriptionID, customerId, startDate, endDate]', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      await Invoices.insertNewInvoice('inv_abc', 'sub_xyz', 'cus_123', '1731389540', '1762925540');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO invoices'),
        ['inv_abc', 'sub_xyz', 'cus_123', '1731389540', '1762925540']
      );
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(
        Invoices.insertNewInvoice('inv_abc', 'sub_xyz', 'cus_123', '1731389540', '1762925540')
      ).rejects.toThrow('db error');
    });
  });

  describe('updateInvoice()', () => {
    it('returns an Invoices instance with updated values', async () => {
      const updatedRow = { ...mockRow, invoice_status: 'paid', amount_paid: 5000 };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await Invoices.updateInvoice('inv_abc', 'paid', 'sub_xyz', 5000, 5000);

      expect(result).toBeInstanceOf(Invoices);
      expect(result.invoiceStatus).toBe('paid');
      expect(result.amountPaid).toBe(5000);
    });

    it('calls pool.query with UPDATE and params in correct order [invoiceID, invoiceStatus, subscription_id, amount_due, amount_paid]', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      await Invoices.updateInvoice('inv_abc', 'paid', 'sub_xyz', 5000, 5000);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE invoices'),
        ['inv_abc', 'paid', 'sub_xyz', 5000, 5000]
      );
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(
        Invoices.updateInvoice('inv_abc', 'paid', 'sub_xyz', 5000, 5000)
      ).rejects.toThrow('db error');
    });
  });

  describe('getBillingPeriodByCustomerId()', () => {
    it('returns an Invoices instance when a row exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Invoices.getBillingPeriodByCustomerId('cus_123');

      expect(result).toBeInstanceOf(Invoices);
      expect(result.customerId).toBe('cus_123');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE customer_id = $1'),
        ['cus_123']
      );
    });

    it('returns null when no rows found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await Invoices.getBillingPeriodByCustomerId('cus_unknown');
      expect(result).toBeNull();
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(Invoices.getBillingPeriodByCustomerId('cus_123')).rejects.toThrow('db error');
    });
  });

  describe('getInvoices()', () => {
    it('returns an array of Invoices instances', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockRow, { ...mockRow, invoice_id: 'inv_def' }] });

      const result = await Invoices.getInvoices();

      expect(result).toHaveLength(2);
      result.forEach((inv) => expect(inv).toBeInstanceOf(Invoices));
      expect(result[0].invoiceId).toBe('inv_abc');
      expect(result[1].invoiceId).toBe('inv_def');
    });

    it('returns an empty array when there are no invoices', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const result = await Invoices.getInvoices();
      expect(result).toEqual([]);
    });

    it('propagates pool errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('db error'));
      await expect(Invoices.getInvoices()).rejects.toThrow('db error');
    });
  });
});
