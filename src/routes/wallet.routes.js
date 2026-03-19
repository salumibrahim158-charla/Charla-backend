// Wallet Routes
const express = require('express');
const router = express.Router();
const {
    getWalletBalance,
    addFunds,
    getTransactions,
    getWalletPackages
} = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.get('/balance', getWalletBalance);
router.post('/add-funds', addFunds);
router.get('/transactions', getTransactions);
router.get('/packages', getWalletPackages);

module.exports = router;
