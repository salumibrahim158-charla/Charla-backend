const express = require('express');
const router = express.Router();
const moderationController = require('../controllers/moderation.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/moderation/flag
 * @desc    Flag content for review
 * @access  Private
 */
router.post('/flag', moderationController.flagContent);

/**
 * @route   GET /api/moderation/my-flags
 * @desc    Get user's own flagged reports
 * @access  Private
 */
router.get('/my-flags', moderationController.getMyFlags);

/**
 * @route   GET /api/moderation/flagged
 * @desc    Get all flagged content (admin only)
 * @access  Private (Admin)
 */
router.get('/flagged', moderationController.getAllFlaggedContent);

/**
 * @route   GET /api/moderation/flagged/:id
 * @desc    Get flagged content by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/flagged/:id', moderationController.getFlaggedContentById);

/**
 * @route   POST /api/moderation/flagged/:id/review
 * @desc    Mark flagged content as reviewed (admin only)
 * @access  Private (Admin)
 */
router.post('/flagged/:id/review', moderationController.reviewFlaggedContent);

/**
 * @route   POST /api/moderation/flagged/:id/remove
 * @desc    Remove flagged content (admin only)
 * @access  Private (Admin)
 */
router.post('/flagged/:id/remove', moderationController.removeContent);

/**
 * @route   POST /api/moderation/flagged/:id/dismiss
 * @desc    Dismiss flag as no violation (admin only)
 * @access  Private (Admin)
 */
router.post('/flagged/:id/dismiss', moderationController.dismissFlag);

/**
 * @route   GET /api/moderation/stats
 * @desc    Get moderation statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', moderationController.getModerationStats);

module.exports = router;
