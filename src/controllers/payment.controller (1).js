const pool = require('../config/database');
const mobileMoneyService = require('../services/mobilemoney.service');

// Initiate payment
exports.initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      amount,
      phoneNumber,
      purpose,
      relatedEntityType,
      relatedEntityId
    } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({ error: 'Amount and phone number required' });
    }

    if (amount < 1000) {
      return res.status(400).json({ error: 'Minimum amount is 1,000 TZS' });
    }

    const result = await mobileMoneyService.initiatePayment({
      userId,
      amount,
      phoneNumber,
      purpose,
      relatedEntityType,
      relatedEntityId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      transaction: result
    });

  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Request withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, phoneNumber, purpose } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({ error: 'Amount and phone number required' });
    }

    // Check wallet balance
    const wallet = await pool.query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [userId]
    );

    if (!wallet.rows[0] || wallet.rows[0].balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const result = await mobileMoneyService.requestWithdrawal({
      userId,
      amount,
      phoneNumber,
      purpose
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Deduct from wallet
    await pool.query(
      'UPDATE wallet SET balance = balance - $1 WHERE user_id = $2',
      [amount, userId]
    );

    await pool.query(`
      INSERT INTO wallet_transactions (wallet_id, type, amount, description)
      SELECT id, 'debit', $1, $2 FROM wallet WHERE user_id = $3
    `, [amount, 'Withdrawal to ' + phoneNumber, userId]);

    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      transaction: result
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await mobileMoneyService.verifyPayment(reference);

    res.json({
      success: true,
      payment: result
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get transaction history
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    const transactions = await pool.query(`
      SELECT * FROM mobile_money_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({
      success: true,
      transactions: transactions.rows
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
