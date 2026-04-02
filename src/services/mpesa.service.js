// M-Pesa Payment Integration Service
// Tanzania Vodacom M-Pesa API

const axios = require('axios');

const MPESA_API_URL = process.env.MPESA_API_URL || 'https://openapi.m-pesa.com';
const MPESA_API_KEY = process.env.MPESA_API_KEY;
const MPESA_PUBLIC_KEY = process.env.MPESA_PUBLIC_KEY;

// Get session key (OAuth)
const getSessionKey = async () => {
  try {
    const response = await axios.get(`${MPESA_API_URL}/sandbox/ipg/v2/vodacomTZN/getSession/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MPESA_API_KEY}`,
      },
    });
    return response.data.output_SessionID;
  } catch (error) {
    console.error('M-Pesa session error:', error);
    throw error;
  }
};

// Customer to Business (C2B) - User adds funds
const initiateC2BPayment = async ({ phoneNumber, amount, reference }) => {
  try {
    const sessionKey = await getSessionKey();
    
    const response = await axios.post(
      `${MPESA_API_URL}/sandbox/ipg/v2/vodacomTZN/c2bPayment/singleStage/`,
      {
        input_Amount: amount,
        input_Country: 'TZN',
        input_Currency: 'TZS',
        input_CustomerMSISDN: phoneNumber, // Format: 255712345678
        input_ServiceProviderCode: process.env.MPESA_BUSINESS_SHORTCODE,
        input_ThirdPartyConversationID: reference,
        input_TransactionReference: reference,
        input_PurchasedItemsDesc: 'Charla Medics - Health Wallet Top Up',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionKey}`,
        },
      }
    );

    return {
      success: true,
      transactionId: response.data.output_TransactionID,
      conversationId: response.data.output_ConversationID,
      status: response.data.output_ResponseCode,
      message: response.data.output_ResponseDesc,
    };
  } catch (error) {
    console.error('M-Pesa C2B error:', error.response?.data || error);
    throw {
      success: false,
      message: error.response?.data?.output_ResponseDesc || 'Payment failed',
    };
  }
};

// Query transaction status
const queryTransactionStatus = async (conversationId) => {
  try {
    const sessionKey = await getSessionKey();
    
    const response = await axios.get(
      `${MPESA_API_URL}/sandbox/ipg/v2/vodacomTZN/queryTransactionStatus/`,
      {
        params: {
          input_QueryReference: conversationId,
          input_ServiceProviderCode: process.env.MPESA_BUSINESS_SHORTCODE,
          input_Country: 'TZN',
        },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionKey}`,
        },
      }
    );

    return {
      success: true,
      status: response.data.output_ResponseCode,
      description: response.data.output_ResponseDesc,
    };
  } catch (error) {
    console.error('M-Pesa query error:', error);
    throw error;
  }
};

// Business to Customer (B2C) - Refunds
const initiateB2CPayment = async ({ phoneNumber, amount, reference }) => {
  try {
    const sessionKey = await getSessionKey();
    
    const response = await axios.post(
      `${MPESA_API_URL}/sandbox/ipg/v2/vodacomTZN/b2cPayment/`,
      {
        input_Amount: amount,
        input_Country: 'TZN',
        input_Currency: 'TZS',
        input_CustomerMSISDN: phoneNumber,
        input_ServiceProviderCode: process.env.MPESA_BUSINESS_SHORTCODE,
        input_ThirdPartyConversationID: reference,
        input_TransactionReference: reference,
        input_PaymentItemsDesc: 'Charla Medics - Refund',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionKey}`,
        },
      }
    );

    return {
      success: true,
      transactionId: response.data.output_TransactionID,
      conversationId: response.data.output_ConversationID,
    };
  } catch (error) {
    console.error('M-Pesa B2C error:', error);
    throw error;
  }
};

// Webhook handler for payment callbacks
const handleMpesaCallback = async (req, res) => {
  const { output_ResponseCode, output_ConversationID, output_TransactionID } = req.body;

  if (output_ResponseCode === 'INS-0') {
    // Payment successful
    // Update wallet balance in database
    // await updateWalletBalance(output_ConversationID, 'completed');
    // Payment failed
    
    // await updateWalletBalance(output_ConversationID, 'failed');

};

module.exports = {
  initiateC2BPayment,
  initiateB2CPayment,
  queryTransactionStatus,
  handleMpesaCallback,
};
