const pool = require('../config/database');
const axios = require('axios');

/**
 * SMS Service - V1.2
 * Africa's Talking SMS integration
 */

const AFRICAS_TALKING_API_KEY = process.env.AFRICAS_TALKING_API_KEY || 'sandbox';
const AFRICAS_TALKING_USERNAME = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'CHARLA';
const AFRICAS_TALKING_URL = 'https://api.africastalking.com/version1/messaging';

/**
 * Send SMS
 * @param {string} phone - Phone number (format: +255XXXXXXXXX)
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} - Result object
 */
exports.sendSMS = async (phone, message) => {
  try {
    // Format phone number (ensure it starts with +255)
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      if (phone.startsWith('0')) {
        formattedPhone = '+255' + phone.substring(1);
      } else if (phone.startsWith('255')) {
        formattedPhone = '+' + phone;
      } else {
        formattedPhone = '+255' + phone;
      }
    }

    // Prepare request
    const data = new URLSearchParams({
      username: AFRICAS_TALKING_USERNAME,
      to: formattedPhone,
      message: message,
      from: SMS_SENDER_ID
    });

    // Send SMS
    const response = await axios.post(AFRICAS_TALKING_URL, data, {
      headers: {
        'apiKey': AFRICAS_TALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });

    // Log SMS
    await pool.query(
      `INSERT INTO sms_log (phone, message, status, provider_response, sent_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        formattedPhone,
        message,
        'sent',
        JSON.stringify(response.data)
      ]
    );

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('Send SMS error:', error);

    // Log failed SMS
    try {
      await pool.query(
        `INSERT INTO sms_log (phone, message, status, error_message, sent_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          phone,
          message,
          'failed',
          error.message
        ]
      );
    } catch (logError) {
      console.error('SMS log error:', logError);
    }

    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send bulk SMS
 * @param {Array} recipients - Array of {phone, message} objects
 * @returns {Promise<Object>} - Results object
 */
exports.sendBulkSMS = async (recipients) => {
  const results = {
    successful: 0,
    failed: 0,
    details: []
  };

  for (const recipient of recipients) {
    const result = await exports.sendSMS(recipient.phone, recipient.message);
    
    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }

    results.details.push({
      phone: recipient.phone,
      success: result.success,
      error: result.error || null
    });
  }

  return results;
};

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<Object>} - Result object
 */
exports.sendOTP = async (phone, otp) => {
  const message = `Your Charla Medics verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return exports.sendSMS(phone, message);
};

/**
 * Get SMS logs with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} - SMS logs
 */
exports.getSMSLogs = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM sms_log WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.phone) {
      query += ` AND phone = $${paramIndex}`;
      params.push(filters.phone);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND sent_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND sent_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY sent_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Get SMS logs error:', error);
    throw error;
  }
};

/**
 * Get SMS statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} - Statistics
 */
exports.getSMSStats = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_sms,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM sms_log
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.startDate) {
      query += ` AND sent_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND sent_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('Get SMS stats error:', error);
    throw error;
  }
};

module.exports = exports;
