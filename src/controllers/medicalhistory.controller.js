const pool = require('../config/database');

/**
 * Medical History Controller
 * Manages patient health records including allergies, chronic conditions, and medical history
 * Critical for patient safety and informed medical decisions
 */

/**
 * Create medical history record
 * POST /api/medical-history
 */
exports.createMedicalHistory = async (req, res) => {
  try {
    const { patient_id, condition_name, diagnosis_date, status, notes } = req.body;

    // Validate required fields
    if (!patient_id || !condition_name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_id, condition_name'
      });
    }

    // Validate status
    const validStatuses = ['active', 'resolved', 'chronic'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: active, resolved, or chronic'
      });
    }

    // Create medical history record
    const result = await pool.query(
      `INSERT INTO medical_history (patient_id, condition_name, diagnosis_date, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patient_id, condition_name, diagnosis_date || null, status || 'active', notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Medical history record created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating medical history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create medical history record',
      error: error.message
    });
  }
};

/**
 * Get patient medical history
 * GET /api/medical-history/patient/:patientId
 */
exports.getPatientMedicalHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        mh.*,
        u.full_name as patient_name,
        u.phone as patient_phone
      FROM medical_history mh
      JOIN users u ON mh.patient_id = u.id
      WHERE mh.patient_id = $1
    `;
    const params = [patientId];
    let paramCount = 2;

    // Filter by status if provided
    if (status) {
      query += ` AND mh.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY mh.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching patient medical history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical history',
      error: error.message
    });
  }
};

/**
 * Get medical history record by ID
 * GET /api/medical-history/:id
 */
exports.getMedicalHistoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        mh.*,
        u.full_name as patient_name,
        u.phone as patient_phone,
        u.date_of_birth as patient_dob
       FROM medical_history mh
       JOIN users u ON mh.patient_id = u.id
       WHERE mh.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical history record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching medical history record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical history record',
      error: error.message
    });
  }
};

/**
 * Update medical history record
 * PUT /api/medical-history/:id
 */
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_name, diagnosis_date, status, notes } = req.body;

    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'resolved', 'chronic'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: active, resolved, or chronic'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (condition_name) {
      updates.push(`condition_name = $${paramCount}`);
      values.push(condition_name);
      paramCount++;
    }

    if (diagnosis_date !== undefined) {
      updates.push(`diagnosis_date = $${paramCount}`);
      values.push(diagnosis_date);
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Add id parameter
    values.push(id);

    const query = `
      UPDATE medical_history 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical history record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medical history record updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating medical history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medical history record',
      error: error.message
    });
  }
};

/**
 * Delete medical history record
 * DELETE /api/medical-history/:id
 */
exports.deleteMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM medical_history WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medical history record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medical history record deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting medical history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medical history record',
      error: error.message
    });
  }
};

/**
 * Get active conditions for patient
 * GET /api/medical-history/patient/:patientId/active
 */
exports.getActiveConditions = async (req, res) => {
  try {
    const { patientId } = req.params;

    const result = await pool.query(
      `SELECT * FROM medical_history 
       WHERE patient_id = $1 AND status IN ('active', 'chronic')
       ORDER BY created_at DESC`,
      [patientId]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active conditions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active conditions',
      error: error.message
    });
  }
};
