const pool = require('../utils/pool.js');

module.exports = class FailedTransactions {
  id;
  customerId;
  failureCode;
  transactionsAmt;
  timestamp;
  invoiceId;

  constructor(row) {
    this.id = row.id;
    this.customerId = row.customer_id;
    this.failureCode = row.failure_code;
    this.transactionsAmt = row.transaction_amt;
    this.timestamp = row.timestamp;
    this.invoiceId = row.invoiceId;
  }

  static async insertFailedTransaction(
    customerId,
    failureCode,
    transactionAmt,
    timestamp,
    invoiceId
  ) {
    const { rows } = await pool.query(
      `
      INSERT INTO failed_transactions (customer_id, failure_code, transaction_amt, timestamp, invoice_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [customerId, failureCode, transactionAmt, timestamp, invoiceId]
    );

    return new FailedTransactions(rows[0]);
  }
};
