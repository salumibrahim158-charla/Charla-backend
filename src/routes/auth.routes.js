// Authentication Routes
// /api/v1/auth

const express = require('express');
const router = express.Router();
const {
    register,
    login,
    adminLogin,
    getCurrentUser,
    verifyToken
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user (Patient, Professional, Facility)
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/v1/auth/admin-login
 * @desc    Admin login as any user
 * @access  Public (but requires admin password)
 */
router.post('/admin-login', adminLogin);

// ============================================================================
// PROTECTED ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, getCurrentUser);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', protect, verifyToken);

module.exports = router;
