// Doctor Routes
const express = require('express');
const router = express.Router();
const {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorAvailability
} = require('../controllers/doctor.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Public routes
router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/availability', getDoctorAvailability);

// Protected routes
router.put('/profile', protect, authorize('doctor'), updateDoctorProfile);

module.exports = router;
