const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Patient routes
router.post('/request', certificateController.requestCertificate);
router.get('/patient', certificateController.getPatientCertificates);
router.get('/download/:id', certificateController.downloadCertificate);

// Doctor routes
router.get('/doctor', certificateController.getDoctorCertificates);
router.post('/approve/:id', certificateController.approveCertificate);
router.post('/reject/:id', certificateController.rejectCertificate);

// Public verification (no auth required)
router.get('/verify/:certificate_number', certificateController.verifyCertificate);

module.exports = router;
