const pool = require('../config/database');

/**
 * Prescription Controller
 * Handles doctor prescriptions after consultations
 */

/**
 * Create a prescription
 * POST /api/prescriptions
 */
exports.createPrescription = async (req, res) => {
  try {
    const { booking_id, patient_id, medications, instructions } = req.body;
    const doctor_id = req.user.id;

    // Validate required fields
    if (!booking_id || !patient_id || !medications) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: booking_id, patient_id, medications'
      });
    }

    // Validate medications is array
    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Medications must be a non-empty array'
      });
    }

    // Verify booking exists and belongs to this doctor
    const bookingCheck = await pool.query(
      'SELECT id, status FROM bookings WHERE id = $1 AND doctor_id = $2',
      [booking_id, doctor_id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or you are not authorized'
      });
    }

    // Check if prescription already exists for this booking
    const existingCheck = await pool.query(
      'SELECT id FROM prescriptions WHERE booking_id = $1',
      [booking_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Prescription already exists for this booking'
      });
    }

    // Create prescription
    const result = await pool.query(
      `INSERT INTO prescriptions (booking_id, patient_id, doctor_id, medications, instructions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking_id, patient_id, doctor_id, JSON.stringify(medications), instructions]
    );

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create prescription',
      error: error.message
    });
  }
};

/**
 * Get prescriptions for a patient
 * GET /api/prescriptions/patient/:patientId
 */
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        p.*,
        b.appointment_date,
        b.appointment_time,
        u.full_name as doctor_name,
        u.specialization as doctor_specialization
       FROM prescriptions p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.doctor_id = u.id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [patientId, limit, offset]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching patient prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
};

/**
 * Get prescription by ID
 * GET /api/prescriptions/:id
 */
exports.getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*,
        b.appointment_date,
        b.appointment_time,
        doc.full_name as doctor_name,
        doc.specialization as doctor_specialization,
        doc.license_number as doctor_license,
        pat.full_name as patient_name,
        pat.phone as patient_phone
       FROM prescriptions p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users doc ON p.doctor_id = doc.id
       JOIN users pat ON p.patient_id = pat.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescription',
      error: error.message
    });
  }
};

/**
 * Get prescriptions by doctor
 * GET /api/prescriptions/doctor/:doctorId
 */
exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        p.*,
        b.appointment_date,
        u.full_name as patient_name
       FROM prescriptions p
       JOIN bookings b ON p.booking_id = b.id
       JOIN users u ON p.patient_id = u.id
       WHERE p.doctor_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching doctor prescriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prescriptions',
      error: error.message
    });
  }
};

/**
 * Delete prescription (admin only)
 * DELETE /api/prescriptions/:id
 */
exports.deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM prescriptions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete prescription',
      error: error.message
    });
  }
};
