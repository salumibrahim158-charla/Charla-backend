const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Webhook route (no authentication - Selcom calls this)
router.post('/selcom', webhookController.selcomWebhook);

module.exports = router;
