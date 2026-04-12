const pool = require('../config/database');
const loggingService = require('../services/logging.service');

/**
 * Phlebotomist Controller
 * Manages phlebotomist applications for home collection service
 * Handles application submission, approval workflow, and workforce management
 */

/**
 * Submit phlebotomist application
 * POST /api/phlebotomist/apply
 */
exports.submitApplication = async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      certification_number,
      certification_document_url,
      years_of_experience,
      previous_employer,
      availability_zones,
      working_hours
    } = req.body;

    // Validate required fields
    if (!certification_number) {
      return res.status(400).json({
        success: false,
        message: 'Certification number is required'
      });
    }

    // Check if user already has a pending or approved application
    const existingCheck = await pool.query(
      `SELECT id, status FROM phlebotomist_applications 
       WHERE user_id = $1 AND status IN ('pending', 'approved')`,
      [user_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingCheck.rows[0].status} application`,
        application_id: existingCheck.rows[0].id
      });
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO phlebotomist_applications 
       (user_id, certification_number, certification_document_url, years_of_experience, 
        previous_employer, availability_zones, working_hours, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        user_id,
        certification_number,
        certification_document_url || null,
        years_of_experience || null,
        previous_employer || null,
        availability_zones ? JSON.stringify(availability_zones) : null,
        working_hours ? JSON.stringify(working_hours) : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully. Awaiting admin review.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting phlebotomist application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

/**
 * Get all phlebotomist applications (admin)
 * GET /api/phlebotomist/applications
 */
exports.getAllApplications = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        pa.*,
        u.full_name,
        u.email,
        u.phone,
        reviewer.full_name as reviewer_name
      FROM phlebotomist_applications pa
      JOIN users u ON pa.user_id = u.id
      LEFT JOIN users reviewer ON pa.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND pa.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY pa.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

/**
 * Get application by ID
 * GET /api/phlebotomist/applications/:id
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        pa.*,
        u.full_name,
        u.email,
        u.phone,
        u.date_of_birth,
        reviewer.full_name as reviewer_name
       FROM phlebotomist_applications pa
       JOIN users u ON pa.user_id = u.id
       LEFT JOIN users reviewer ON pa.reviewed_by = reviewer.id
       WHERE pa.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message
    });
  }
};

/**
 * Get user's own application
 * GET /api/phlebotomist/my-application
 */
exports.getMyApplication = async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT 
        pa.*,
        reviewer.full_name as reviewer_name
       FROM phlebotomist_applications pa
       LEFT JOIN users reviewer ON pa.reviewed_by = reviewer.id
       WHERE pa.user_id = $1
       ORDER BY pa.created_at DESC
       LIMIT 1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No application found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch application',
      error: error.message
    });
  }
};

/**
 * Approve phlebotomist application (admin)
 * POST /api/phlebotomist/applications/:id/approve
 */
exports.approveApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;
    const { review_notes } = req.body;

    // Update application status
    const result = await pool.query(
      `UPDATE phlebotomist_applications 
       SET status = 'approved', 
           reviewed_by = $1, 
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [admin_id, review_notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or already reviewed'
      });
    }

    // Log admin action
    await loggingService.logAdminActivity(
      admin_id,
      'phlebotomist_approved',
      { application_id: id, user_id: result.rows[0].user_id },
      req.ip,
      req.get('user-agent')
    );

    // TODO: Send notification to applicant
    // TODO: Update user role to include 'phlebotomist'

    res.status(200).json({
      success: true,
      message: 'Application approved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve application',
      error: error.message
    });
  }
};

/**
 * Reject phlebotomist application (admin)
 * POST /api/phlebotomist/applications/:id/reject
 */
exports.rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;
    const { review_notes } = req.body;

    if (!review_notes) {
      return res.status(400).json({
        success: false,
        message: 'Review notes are required for rejection'
      });
    }

    // Update application status
    const result = await pool.query(
      `UPDATE phlebotomist_applications 
       SET status = 'rejected', 
           reviewed_by = $1, 
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [admin_id, review_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or already reviewed'
      });
    }

    // Log admin action
    await loggingService.logAdminActivity(
      admin_id,
      'phlebotomist_rejected',
      { application_id: id, user_id: result.rows[0].user_id, reason: review_notes },
      req.ip,
      req.get('user-agent')
    );

    // TODO: Send notification to applicant

    res.status(200).json({
      success: true,
      message: 'Application rejected',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject application',
      error: error.message
    });
  }
};

/**
 * Get approved phlebotomists
 * GET /api/phlebotomist/approved
 */
exports.getApprovedPhlebotomists = async (req, res) => {
  try {
    const { availability_zone, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        pa.id as application_id,
        pa.certification_number,
        pa.years_of_experience,
        pa.availability_zones,
        pa.working_hours,
        u.id as user_id,
        u.full_name,
        u.phone,
        u.profile_picture
      FROM phlebotomist_applications pa
      JOIN users u ON pa.user_id = u.id
      WHERE pa.status = 'approved'
    `;
    const params = [];
    let paramCount = 1;

    // Filter by availability zone if provided
    if (availability_zone) {
      query += ` AND pa.availability_zones @> $${paramCount}::jsonb`;
      params.push(JSON.stringify([availability_zone]));
      paramCount++;
    }

    query += ` ORDER BY pa.reviewed_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching approved phlebotomists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved phlebotomists',
      error: error.message
    });
  }
};
