const express = require('express');
const router = express.Router();
const medicalHistoryController = require('../controllers/medicalhistory.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/medical-history
 * @desc    Create medical history record
 * @access  Private
 */
router.post('/', medicalHistoryController.createMedicalHistory);

/**
 * @route   GET /api/medical-history/:id
 * @desc    Get medical history record by ID
 * @access  Private
 */
router.get('/:id', medicalHistoryController.getMedicalHistoryById);

/**
 * @route   GET /api/medical-history/patient/:patientId
 * @desc    Get all medical history for a patient
 * @access  Private
 */
router.get('/patient/:patientId', medicalHistoryController.getPatientMedicalHistory);

/**
 * @route   GET /api/medical-history/patient/:patientId/active
 * @desc    Get active conditions for a patient
 * @access  Private
 */
router.get('/patient/:patientId/active', medicalHistoryController.getActiveConditions);

/**
 * @route   PUT /api/medical-history/:id
 * @desc    Update medical history record
 * @access  Private
 */
router.put('/:id', medicalHistoryController.updateMedicalHistory);

/**
 * @route   DELETE /api/medical-history/:id
 * @desc    Delete medical history record
 * @access  Private
 */
router.delete('/:id', medicalHistoryController.deleteMedicalHistory);

module.exports = router;
