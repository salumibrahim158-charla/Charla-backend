const pool = require('../config/database');
const { sendSMS } = require('../services/sms.service');

/**
 * Webhook Controller - V1.2
 * Handles Selcom payment callbacks
 */

// Selcom payment webhook
exports.selcomWebhook = async (req, res) => {
  try {
    const {
      order_id,
      reference,
      result,
      resultcode,
      status,
      transaction_id,
      msisdn,
      operator,
      amount
    } = req.body;

    console.log('Selcom webhook received:', req.body);

    // Extract Charla transaction ID from order_id (format: CHARLA-123)
    const orderParts = order_id.split('-');
    if (orderParts.length < 2) {
      console.error('Invalid order_id format:', order_id);
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const transactionId = orderParts[1].replace('-RETRY', ''); // Remove -RETRY suffix if present

    // Get transaction from database
    const txn = await pool.query(
      'SELECT * FROM mobile_money_transactions WHERE id = $1',
      [transactionId]
    );

    if (txn.rows.length === 0) {
      console.error('Transaction not found:', transactionId);
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = txn.rows[0];

    // Determine final status
    let finalStatus;
    if (status === 'SUCCESS' || resultcode === '000') {
      finalStatus = 'completed';
    } else if (status === 'FAILED' || resultcode !== '000') {
      finalStatus = 'failed';
    } else {
      finalStatus = 'pending';
    }

    // Update transaction
    await pool.query(
      `UPDATE mobile_money_transactions SET 
        status = $1,
        gateway_transaction_id = $2,
        gateway_status = $3,
        gateway_result_code = $4,
        completed_at = $5,
        webhook_data = $6,
        updated_at = NOW()
      WHERE id = $7`,
      [
        finalStatus,
        transaction_id,
        status,
        resultcode,
        finalStatus === 'completed' ? new Date() : null,
        JSON.stringify(req.body),
        transactionId
      ]
    );

    // If payment successful, update related records
    if (finalStatus === 'completed') {
      // Update consultation payment status
      if (transaction.consultation_id) {
        await pool.query(
          'UPDATE consultations SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          ['paid', transaction.consultation_id]
        );
      }

      // Update certificate payment status
      if (transaction.certificate_id) {
        await pool.query(
          'UPDATE medical_certificates SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          ['paid', transaction.certificate_id]
        );
      }

      // Update home collection payment status
      if (transaction.collection_request_id) {
        await pool.query(
          'UPDATE home_collection_requests SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          ['paid', transaction.collection_request_id]
        );
      }

      // Get user details
      const user = await pool.query(
        'SELECT phone, full_name FROM users WHERE id = $1',
        [transaction.user_id]
      );

      // Send success SMS
      if (user.rows[0].phone) {
        await sendSMS(
          user.rows[0].phone,
          `Payment of ${amount} TZS successful! Transaction ID: ${transactionId}. Thank you for using Charla Medics.`
        );
      }
    }

    // If payment failed, send notification
    if (finalStatus === 'failed') {
      const user = await pool.query(
        'SELECT phone FROM users WHERE id = $1',
        [transaction.user_id]
      );

      if (user.rows[0].phone) {
        await sendSMS(
          user.rows[0].phone,
          `Payment failed. Please try again or contact support. Transaction ID: ${transactionId}`
        );
      }
    }

    // Acknowledge webhook
    res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('Selcom webhook error:', error);
    // Still return 200 to prevent webhook retries
    res.status(200).json({ 
      success: false,
      error: 'Internal error processing webhook' 
    });
  }
};

module.exports = exports;
