const pool = require('../utils/pool.js');

module.exports = class Invoices {
  customerId;
  invoiceId;
  startDate;
  endDate;
  invoiceStatus;
  subscriptionId;
  amountDue;
  amountPaid;

  constructor(row) {
    this.customerId = row.customer_id;
    this.invoiceId = row.invoice_id;
    this.startDate = row.start_date;
    this.endDate = row.end_date;
    this.invoiceStatus = row.invoice_status;
    this.subscriptionId = row.subscription_id;
    this.amountDue = row.amount_due;
    this.amountPaid = row.amount_paid;
  }

  static async insertNewInvoice(
    invoiceID,
    subscriptionID,
    customerId,
    startDate,
    endDate
  ) {
    const { rows } = await pool.query(
      `
      INSERT INTO invoices (invoice_id, subscription_id, customer_id, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [invoiceID, subscriptionID, customerId, startDate, endDate]
    );

    return new Invoices(rows[0]);
  }

  static async updateInvoice(
    invoiceID,
    invoiceStatus,
    subscription_id,
    amount_due,
    amount_paid
  ) {
    const { rows } = await pool.query(
      `
      UPDATE invoices
      SET invoice_status = $2, subscription_id = $3, amount_due = $4, amount_paid = $5
      WHERE invoice_id = $1
      RETURNING *
      `,
      [invoiceID, invoiceStatus, subscription_id, amount_due, amount_paid]
    );
    return new Invoices(rows[0]);
  }

  static async getBillingPeriodByCustomerId(customerId) {
    const { rows } = await pool.query(
      `
      SELECT * FROM invoices
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [customerId]
    );
    return new Invoices(rows[0]);
  }

  static async getInvoices() {
    const { rows } = await pool.query(
      `
      SELECT * FROM invoices
      ORDER BY created_at DESC
      `,
      []
    );
    return rows.map((row) => new Invoices(row));
  }
};
