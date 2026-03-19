// Referral Routes
const express = require('express');
const router = express.Router();
const {
    getMyReferralCode,
    applyReferralCode,
    getMyReferrals,
    claimReward
} = require('../controllers/referral.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.get('/my-code', getMyReferralCode);
router.post('/apply', applyReferralCode);
router.get('/my-referrals', getMyReferrals);
router.post('/claim-reward', claimReward);

module.exports = router;
