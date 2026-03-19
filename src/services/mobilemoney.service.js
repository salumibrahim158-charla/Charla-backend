const axios = require('axios');
const crypto = require('crypto');

/**
 * Mobile Money Service - V1.2
 * Selcom integration for multi-provider payments
 * Providers: M-PESA, TigoPesa, AirtelMoney, HaloPesa, T-Pesa
 */

const SELCOM_API_URL = process.env.SELCOM_API_URL || 'https://apigw.selcommobile.com';
const SELCOM_API_KEY = process.env.SELCOM_API_KEY || '';
const SELCOM_API_SECRET = process.env.SELCOM_API_SECRET || '';
const SELCOM_VENDOR_ID = process.env.SELCOM_VENDOR_ID || '';

/**
 * Generate Selcom signature
 * @param {string} signedFields - Comma-separated field names
 * @param {Object} params - Request parameters
 * @returns {string} - HMAC signature
 */
const generateSignature = (signedFields, params) => {
  const fields = signedFields.split(',');
  const dataToSign = fields.map(field => `${field}=${params[field]}`).join(',');
  return crypto
    .createHmac('sha256', SELCOM_API_SECRET)
    .update(dataToSign)
    .digest('hex');
};

/**
 * Initiate mobile money payment
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} - Payment result
 */
exports.initiatePayment = async (paymentData) => {
  try {
    const {
      transactionId,
      amount,
      phone,
      provider,
      orderRef,
      buyerName,
      buyerEmail
    } = paymentData;

    // Format phone number for Selcom (255XXXXXXXXX)
    let formattedPhone = phone;
    if (phone.startsWith('+')) {
      formattedPhone = phone.substring(1);
    } else if (phone.startsWith('0')) {
      formattedPhone = '255' + phone.substring(1);
    } else if (!phone.startsWith('255')) {
      formattedPhone = '255' + phone;
    }

    // Prepare request parameters
    const timestamp = new Date().toISOString();
    const params = {
      vendor: SELCOM_VENDOR_ID,
      order_id: orderRef,
      buyer_email: buyerEmail || 'noreply@charlamedics.com',
      buyer_name: buyerName,
      buyer_phone: formattedPhone,
      amount: amount,
      currency: 'TZS',
      buyer_remarks: `Payment for ${orderRef}`,
      merchant_remarks: 'Charla Medics Service',
      no_of_items: 1,
      payment_method: provider, // MPESA, TIGOPESA, AIRTELMONEY, HALOPESA, TPESA
      timestamp: timestamp
    };

    // Generate signature
    const signedFields = 'vendor,order_id,buyer_email,buyer_name,buyer_phone,amount,currency,payment_method';
    params.signed_field_names = signedFields;
    params.signature = generateSignature(signedFields, params);

    // Make API request
    const response = await axios.post(
      `${SELCOM_API_URL}/v1/checkout`,
      params,
      {
        headers: {
          'Authorization': `Bearer ${SELCOM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.result === 'SUCCESS') {
      return {
        success: true,
        reference: response.data.reference,
        transactionId: response.data.transid,
        message: 'Payment initiated successfully'
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Payment initiation failed'
      };
    }

  } catch (error) {
    console.error('Initiate payment error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Check payment status
 * @param {string} orderRef - Order reference
 * @returns {Promise<Object>} - Payment status
 */
exports.checkPaymentStatus = async (orderRef) => {
  try {
    const params = {
      vendor: SELCOM_VENDOR_ID,
      order_id: orderRef
    };

    const signedFields = 'vendor,order_id';
    params.signed_field_names = signedFields;
    params.signature = generateSignature(signedFields, params);

    const response = await axios.post(
      `${SELCOM_API_URL}/v1/checkout/order-status`,
      params,
      {
        headers: {
          'Authorization': `Bearer ${SELCOM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data) {
      const status = response.data.payment_status;
      
      return {
        success: true,
        status: status === 'COMPLETED' ? 'completed' : status === 'PENDING' ? 'pending' : 'failed',
        transactionId: response.data.transid,
        message: response.data.message
      };
    } else {
      return {
        success: false,
        error: 'Unable to check payment status'
      };
    }

  } catch (error) {
    console.error('Check payment status error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Process refund
 * @param {Object} refundData - Refund details
 * @returns {Promise<Object>} - Refund result
 */
exports.processRefund = async (refundData) => {
  try {
    const {
      originalTransactionId,
      amount,
      reason
    } = refundData;

    const timestamp = new Date().toISOString();
    const params = {
      vendor: SELCOM_VENDOR_ID,
      transid: originalTransactionId,
      amount: amount,
      reason: reason || 'Refund requested',
      timestamp: timestamp
    };

    const signedFields = 'vendor,transid,amount';
    params.signed_field_names = signedFields;
    params.signature = generateSignature(signedFields, params);

    const response = await axios.post(
      `${SELCOM_API_URL}/v1/refund`,
      params,
      {
        headers: {
          'Authorization': `Bearer ${SELCOM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.result === 'SUCCESS') {
      return {
        success: true,
        refundId: response.data.refund_id,
        message: 'Refund processed successfully'
      };
    } else {
      return {
        success: false,
        error: response.data?.message || 'Refund processing failed'
      };
    }

  } catch (error) {
    console.error('Process refund error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Validate webhook signature
 * @param {Object} webhookData - Webhook payload
 * @param {string} receivedSignature - Signature from webhook
 * @returns {boolean} - Is valid
 */
exports.validateWebhookSignature = (webhookData, receivedSignature) => {
  try {
    const signedFields = webhookData.signed_field_names;
    const calculatedSignature = generateSignature(signedFields, webhookData);
    return calculatedSignature === receivedSignature;
  } catch (error) {
    console.error('Validate webhook signature error:', error);
    return false;
  }
};

/**
 * Get supported payment providers
 * @returns {Array} - List of providers
 */
exports.getSupportedProviders = () => {
  return [
    {
      code: 'MPESA',
      name: 'M-PESA',
      description: 'Vodacom M-PESA',
      logo: '/images/providers/mpesa.png'
    },
    {
      code: 'TIGOPESA',
      name: 'Tigo Pesa',
      description: 'Tigo Mobile Money',
      logo: '/images/providers/tigopesa.png'
    },
    {
      code: 'AIRTELMONEY',
      name: 'Airtel Money',
      description: 'Airtel Mobile Money',
      logo: '/images/providers/airtel.png'
    },
    {
      code: 'HALOPESA',
      name: 'Halo Pesa',
      description: 'Halotel Mobile Money',
      logo: '/images/providers/halopesa.png'
    },
    {
      code: 'TPESA',
      name: 'T-Pesa',
      description: 'TTCL Mobile Money',
      logo: '/images/providers/tpesa.png'
    }
  ];
};

module.exports = exports;
