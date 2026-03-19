const express = require('express');
const router = express.Router();
const homeCollectionController = require('../controllers/homecollection.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Patient routes
router.post('/request', homeCollectionController.requestCollection);
router.get('/patient', homeCollectionController.getPatientRequests);

// Phlebotomist routes
router.post('/accept/:id', homeCollectionController.acceptRequest);
router.post('/complete/:id', homeCollectionController.completeCollection);
router.get('/phlebotomist', homeCollectionController.getPhlebotomistRequests);
router.get('/available', homeCollectionController.getAvailableRequests);
router.post('/availability', homeCollectionController.updateAvailability);

// Shared routes
router.post('/cancel/:id', homeCollectionController.cancelRequest);

module.exports = router;
