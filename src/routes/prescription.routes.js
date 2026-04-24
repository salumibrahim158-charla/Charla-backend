const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescription.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/prescriptions
 * @desc    Create a new prescription (doctors only)
 * @access  Private (Doctor)
 */
router.post('/', prescriptionController.createPrescription);

/**
 * @route   GET /api/prescriptions/:id
 * @desc    Get prescription by ID
 * @access  Private
 */
router.get('/:id', prescriptionController.getPrescriptionById);

/**
 * @route   GET /api/prescriptions/patient/:patientId
 * @desc    Get all prescriptions for a patient
 * @access  Private
 */
router.get('/patient/:patientId', prescriptionController.getPatientPrescriptions);

/**
 * @route   GET /api/prescriptions/doctor/:doctorId
 * @desc    Get all prescriptions by a doctor
 * @access  Private
 */
router.get('/doctor/:doctorId', prescriptionController.getDoctorPrescriptions);

/**
 * @route   DELETE /api/prescriptions/:id
 * @desc    Delete a prescription (admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', prescriptionController.deletePrescription);

module.exports = router;
