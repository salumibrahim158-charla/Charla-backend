const express = require('express');
const router = express.Router();
const phlebotomistController = require('../controllers/phlebotomist.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/phlebotomist/apply
 * @desc    Submit phlebotomist application
 * @access  Private
 */
router.post('/apply', phlebotomistController.submitApplication);

/**
 * @route   GET /api/phlebotomist/my-application
 * @desc    Get user's own application
 * @access  Private
 */
router.get('/my-application', phlebotomistController.getMyApplication);

/**
 * @route   GET /api/phlebotomist/approved
 * @desc    Get approved phlebotomists (public for home collection feature)
 * @access  Private
 */
router.get('/approved', phlebotomistController.getApprovedPhlebotomists);

/**
 * @route   GET /api/phlebotomist/applications
 * @desc    Get all phlebotomist applications (admin only)
 * @access  Private (Admin)
 */
router.get('/applications', phlebotomistController.getAllApplications);

/**
 * @route   GET /api/phlebotomist/applications/:id
 * @desc    Get application by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/applications/:id', phlebotomistController.getApplicationById);

/**
 * @route   POST /api/phlebotomist/applications/:id/approve
 * @desc    Approve phlebotomist application (admin only)
 * @access  Private (Admin)
 */
router.post('/applications/:id/approve', phlebotomistController.approveApplication);

/**
 * @route   POST /api/phlebotomist/applications/:id/reject
 * @desc    Reject phlebotomist application (admin only)
 * @access  Private (Admin)
 */
router.post('/applications/:id/reject', phlebotomistController.rejectApplication);

module.exports = router;
