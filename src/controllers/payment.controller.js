const pool = require('../config/database');
const { initiatePayment, checkPaymentStatus } = require('../services/mobilemoney.service');

/**
 * Payment Controller - V1.2
 * Multi-provider mobile money via Selcom
 * Providers: M-PESA, TigoPesa, AirtelMoney, HaloPesa, T-Pesa
 */

// Initiate payment
exports.initiatePayment = async (req, res) => {
  const { 
    amount, 
    phone, 
    provider, 
    purpose, 
    consultation_id,
    certificate_id,
    collection_request_id 
  } = req.body;
  const user_id = req.user.id;

  try {
    // Validate provider
    const validProviders = ['MPESA', 'TIGOPESA', 'AIRTELMONEY', 'HALOPESA', 'TPESA'];
    if (!validProviders.includes(provider.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid payment provider' });
    }

    // Create transaction record
    const transaction = await pool.query(
      `INSERT INTO mobile_money_transactions (
        user_id, amount, phone, provider, purpose, 
        consultation_id, certificate_id, collection_request_id,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *`,
      [
        user_id,
        amount,
        phone,
        provider.toUpperCase(),
        purpose,
        consultation_id,
        certificate_id,
        collection_request_id
      ]
    );

    const txnId = transaction.rows[0].id;

    // Initiate payment with Selcom
    const paymentResult = await initiatePayment({
      transactionId: txnId,
      amount: amount,
      phone: phone,
      provider: provider.toUpperCase(),
      orderRef: `CHARLA-${txnId}`,
      buyerName: req.user.full_name,
      buyerEmail: req.user.email
    });

    if (!paymentResult.success) {
      // Update transaction as failed
      await pool.query(
        'UPDATE mobile_money_transactions SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', paymentResult.error, txnId]
      );

      return res.status(400).json({ 
        error: 'Failed to initiate payment',
        message: paymentResult.error 
      });
    }

    // Update transaction with gateway reference
    await pool.query(
      'UPDATE mobile_money_transactions SET gateway_reference = $1 WHERE id = $2',
      [paymentResult.reference, txnId]
    );

    res.status(201).json({
      message: 'Payment initiated successfully',
      transaction_id: txnId,
      gateway_reference: paymentResult.reference,
      instructions: `Please check your phone (${phone}) for payment prompt. Enter PIN to complete payment.`
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

// Check payment status
exports.checkStatus = async (req, res) => {
  const { transaction_id } = req.params;
  const user_id = req.user.id;

  try {
    // Get transaction
    const transaction = await pool.query(
      'SELECT * FROM mobile_money_transactions WHERE id = $1 AND user_id = $2',
      [transaction_id, user_id]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const txn = transaction.rows[0];

    // If already completed or failed, return current status
    if (txn.status === 'completed' || txn.status === 'failed') {
      return res.json({ 
        status: txn.status,
        transaction: txn
      });
    }

    // Check status with Selcom
    const statusResult = await checkPaymentStatus(txn.gateway_reference);

    if (statusResult.success) {
      // Update transaction
      await pool.query(
        `UPDATE mobile_money_transactions SET 
          status = $1,
          completed_at = NOW(),
          gateway_transaction_id = $2
        WHERE id = $3`,
        [statusResult.status, statusResult.transactionId, transaction_id]
      );

      // If payment completed, update related records
      if (statusResult.status === 'completed') {
        if (txn.consultation_id) {
          await pool.query(
            'UPDATE consultations SET payment_status = $1 WHERE id = $2',
            ['paid', txn.consultation_id]
          );
        }
        if (txn.certificate_id) {
          await pool.query(
            'UPDATE medical_certificates SET payment_status = $1 WHERE id = $2',
            ['paid', txn.certificate_id]
          );
        }
        if (txn.collection_request_id) {
          await pool.query(
            'UPDATE home_collection_requests SET payment_status = $1 WHERE id = $2',
            ['paid', txn.collection_request_id]
          );
        }
      }

      res.json({
        status: statusResult.status,
        message: statusResult.message
      });
    } else {
      res.json({
        status: 'pending',
        message: 'Payment status check in progress'
      });
    }
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
};

// Get user transactions
exports.getTransactions = async (req, res) => {
  const user_id = req.user.id;
  const { status, limit = 20, offset = 0 } = req.query;

  try {
    let query = 'SELECT * FROM mobile_money_transactions WHERE user_id = $1';
    const params = [user_id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Retry failed payment
exports.retryPayment = async (req, res) => {
  const { transaction_id } = req.params;
  const user_id = req.user.id;

  try {
    // Get transaction
    const transaction = await pool.query(
      'SELECT * FROM mobile_money_transactions WHERE id = $1 AND user_id = $2',
      [transaction_id, user_id]
    );

    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const txn = transaction.rows[0];

    if (txn.status !== 'failed') {
      return res.status(400).json({ error: 'Can only retry failed transactions' });
    }

    // Retry payment
    const paymentResult = await initiatePayment({
      transactionId: transaction_id,
      amount: txn.amount,
      phone: txn.phone,
      provider: txn.provider,
      orderRef: `CHARLA-${transaction_id}-RETRY`,
      buyerName: req.user.full_name,
      buyerEmail: req.user.email
    });

    if (!paymentResult.success) {
      return res.status(400).json({ 
        error: 'Failed to retry payment',
        message: paymentResult.error 
      });
    }

    // Update transaction
    await pool.query(
      `UPDATE mobile_money_transactions SET 
        status = 'pending',
        gateway_reference = $1,
        error_message = NULL,
        updated_at = NOW()
      WHERE id = $2`,
      [paymentResult.reference, transaction_id]
    );

    res.json({
      message: 'Payment retry initiated successfully',
      gateway_reference: paymentResult.reference
    });
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(500).json({ error: 'Failed to retry payment' });
  }
};

module.exports = exports;
