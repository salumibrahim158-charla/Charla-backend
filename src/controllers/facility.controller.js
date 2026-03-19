const pool = require('../config/database');
const { sendSMS } = require('../services/sms.service');

/**
 * Facility Controller - V1.2
 * Professional-facility linking with revenue splits
 * Split: 60% professional, 30% facility, 10% platform
 */

// Request facility access
exports.requestAccess = async (req, res) => {
  const { facility_id, requested_services } = req.body;
  const professional_id = req.user.id;

  try {
    // Verify user is a professional
    const user = await pool.query(
      'SELECT category, main_category FROM users WHERE id = $1',
      [professional_id]
    );

    if (user.rows[0].category !== 'professional') {
      return res.status(403).json({ error: 'Only professionals can request facility access' });
    }

    // Check if facility exists
    const facility = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND main_category = $2',
      [facility_id, 'facility']
    );

    if (facility.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Check if request already exists
    const existing = await pool.query(
      'SELECT id FROM professional_facility_requests WHERE professional_id = $1 AND facility_id = $2 AND status = $3',
      [professional_id, facility_id, 'pending']
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Request already pending' });
    }

    // Create request
    const result = await pool.query(
      `INSERT INTO professional_facility_requests (
        professional_id, facility_id, requested_services, status
      ) VALUES ($1, $2, $3, 'pending')
      RETURNING *`,
      [professional_id, facility_id, JSON.stringify(requested_services)]
    );

    // Notify facility
    const facilityUser = await pool.query(
      'SELECT phone, full_name FROM users WHERE id = $1',
      [facility_id]
    );

    if (facilityUser.rows[0].phone) {
      await sendSMS(
        facilityUser.rows[0].phone,
        `New access request from ${req.user.full_name}. Please review and approve.`
      );
    }

    res.status(201).json({
      message: 'Access request sent successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: 'Failed to request access' });
  }
};

// Approve access request (facility only)
exports.approveAccess = async (req, res) => {
  const { id } = req.params;
  const { approved_services, revenue_split_professional, revenue_split_facility, revenue_split_platform } = req.body;
  const facility_id = req.user.id;

  try {
    // Verify request exists and belongs to facility
    const request = await pool.query(
      'SELECT * FROM professional_facility_requests WHERE id = $1 AND facility_id = $2',
      [id, facility_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Default revenue split: 60% professional, 30% facility, 10% platform
    const profSplit = revenue_split_professional || 60;
    const facilSplit = revenue_split_facility || 30;
    const platSplit = revenue_split_platform || 10;

    if (profSplit + facilSplit + platSplit !== 100) {
      return res.status(400).json({ error: 'Revenue splits must total 100%' });
    }

    // Approve request
    const result = await pool.query(
      `UPDATE professional_facility_requests SET 
        status = 'approved',
        approved_services = $1,
        revenue_split_professional = $2,
        revenue_split_facility = $3,
        revenue_split_platform = $4,
        approved_at = NOW()
      WHERE id = $5
      RETURNING *`,
      [JSON.stringify(approved_services), profSplit, facilSplit, platSplit, id]
    );

    // Notify professional
    const professional = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [request.rows[0].professional_id]
    );

    if (professional.rows[0].phone) {
      await sendSMS(
        professional.rows[0].phone,
        `Your facility access request has been approved! You can now start using ${req.user.full_name} facilities.`
      );
    }

    res.json({
      message: 'Access approved successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Approve access error:', error);
    res.status(500).json({ error: 'Failed to approve access' });
  }
};

// Reject access request (facility only)
exports.rejectAccess = async (req, res) => {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const facility_id = req.user.id;

  try {
    const request = await pool.query(
      'SELECT * FROM professional_facility_requests WHERE id = $1 AND facility_id = $2',
      [id, facility_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const result = await pool.query(
      `UPDATE professional_facility_requests SET 
        status = 'rejected',
        rejection_reason = $1,
        rejected_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [rejection_reason, id]
    );

    // Notify professional
    const professional = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [request.rows[0].professional_id]
    );

    if (professional.rows[0].phone) {
      await sendSMS(
        professional.rows[0].phone,
        `Your facility access request was not approved. Reason: ${rejection_reason}`
      );
    }

    res.json({
      message: 'Access rejected',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Reject access error:', error);
    res.status(500).json({ error: 'Failed to reject access' });
  }
};

// Log facility usage
exports.logUsage = async (req, res) => {
  const { 
    facility_id, 
    service_type, 
    patient_id, 
    consultation_id,
    revenue_amount 
  } = req.body;
  const professional_id = req.user.id;

  try {
    // Verify access is approved
    const access = await pool.query(
      'SELECT * FROM professional_facility_requests WHERE professional_id = $1 AND facility_id = $2 AND status = $3',
      [professional_id, facility_id, 'approved']
    );

    if (access.rows.length === 0) {
      return res.status(403).json({ error: 'No approved access to this facility' });
    }

    // Calculate revenue splits
    const splits = {
      professional: (revenue_amount * access.rows[0].revenue_split_professional) / 100,
      facility: (revenue_amount * access.rows[0].revenue_split_facility) / 100,
      platform: (revenue_amount * access.rows[0].revenue_split_platform) / 100
    };

    // Log usage
    const result = await pool.query(
      `INSERT INTO facility_access_usage_log (
        professional_id, facility_id, service_type, patient_id, 
        consultation_id, revenue_amount, 
        revenue_professional, revenue_facility, revenue_platform
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        professional_id,
        facility_id,
        service_type,
        patient_id,
        consultation_id,
        revenue_amount,
        splits.professional,
        splits.facility,
        splits.platform
      ]
    );

    res.status(201).json({
      message: 'Usage logged successfully',
      usage: result.rows[0]
    });
  } catch (error) {
    console.error('Log usage error:', error);
    res.status(500).json({ error: 'Failed to log usage' });
  }
};

// Get professional's facility access list
exports.getProfessionalFacilities = async (req, res) => {
  const professional_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT pfr.*, u.full_name as facility_name, u.phone as facility_phone
       FROM professional_facility_requests pfr
       JOIN users u ON pfr.facility_id = u.id
       WHERE pfr.professional_id = $1 AND pfr.status = 'approved'
       ORDER BY pfr.approved_at DESC`,
      [professional_id]
    );

    res.json({ facilities: result.rows });
  } catch (error) {
    console.error('Get professional facilities error:', error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
};

// Get facility's professionals list
exports.getFacilityProfessionals = async (req, res) => {
  const facility_id = req.user.id;
  const { status } = req.query;

  try {
    let query = `
      SELECT pfr.*, u.full_name as professional_name, u.main_category
      FROM professional_facility_requests pfr
      JOIN users u ON pfr.professional_id = u.id
      WHERE pfr.facility_id = $1
    `;
    const params = [facility_id];

    if (status) {
      query += ' AND pfr.status = $2';
      params.push(status);
    }

    query += ' ORDER BY pfr.created_at DESC';

    const result = await pool.query(query, params);

    res.json({ professionals: result.rows });
  } catch (error) {
    console.error('Get facility professionals error:', error);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
};

// Get usage analytics (for both professional and facility)
exports.getUsageAnalytics = async (req, res) => {
  const user_id = req.user.id;
  const { start_date, end_date } = req.query;

  try {
    // Determine if user is professional or facility
    const user = await pool.query(
      'SELECT main_category FROM users WHERE id = $1',
      [user_id]
    );

    const isProfessional = user.rows[0].main_category !== 'facility';

    let query = `
      SELECT 
        COUNT(*) as total_uses,
        SUM(revenue_amount) as total_revenue,
        SUM(${isProfessional ? 'revenue_professional' : 'revenue_facility'}) as earned_revenue,
        service_type
      FROM facility_access_usage_log
      WHERE ${isProfessional ? 'professional_id' : 'facility_id'} = $1
    `;
    const params = [user_id];

    if (start_date) {
      query += ' AND created_at >= $2';
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ' GROUP BY service_type';

    const result = await pool.query(query, params);

    res.json({ analytics: result.rows });
  } catch (error) {
    console.error('Get usage analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = exports;
