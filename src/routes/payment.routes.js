const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Payment routes
router.post('/initiate', paymentController.initiatePayment);
router.get('/status/:transaction_id', paymentController.checkStatus);
router.get('/transactions', paymentController.getTransactions);
router.post('/retry/:transaction_id', paymentController.retryPayment);

module.exports = router;
