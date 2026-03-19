const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facility.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Professional routes
router.post('/request', facilityController.requestAccess);
router.get('/professional', facilityController.getProfessionalFacilities);

// Facility routes
router.post('/approve/:id', facilityController.approveAccess);
router.post('/reject/:id', facilityController.rejectAccess);
router.get('/facility', facilityController.getFacilityProfessionals);

// Usage tracking
router.post('/usage', facilityController.logUsage);
router.get('/analytics', facilityController.getUsageAnalytics);

module.exports = router;
