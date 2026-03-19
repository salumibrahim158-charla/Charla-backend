const pool = require('../config/database');

// Request facility access
exports.requestAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      facilityId,
      serviceType,
      requestMessage,
      expectedUsageFrequency
    } = req.body;

    if (!facilityId || !serviceType) {
      return res.status(400).json({ error: 'Facility ID and service type required' });
    }

    // Get professional details
    const professional = await pool.query(
      'SELECT full_name, category FROM users WHERE id = $1',
      [userId]
    );

    // Get facility details
    const facility = await pool.query(
      'SELECT full_name, category FROM users WHERE id = $1 AND category = \'facility\'',
      [facilityId]
    );

    if (!facility.rows[0]) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Create request
    const result = await pool.query(`
      INSERT INTO professional_facility_requests (
        professional_id, professional_name, professional_category,
        facility_id, facility_name, facility_type,
        service_type, request_message, expected_usage_frequency,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `, [
      userId, professional.rows[0].full_name, professional.rows[0].category,
      facilityId, facility.rows[0].full_name, facility.rows[0].category,
      serviceType, requestMessage, expectedUsageFrequency
    ]);

    res.status(201).json({
      success: true,
      message: 'Access request submitted successfully',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Request access error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Review request (facility owner)
exports.reviewRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      status,
      revenueSplitProfessional,
      revenueSplitFacility,
      revenueSplitPlatform = 10.00,
      accessHours,
      accessRestrictions,
      specialTerms,
      rejectionReason
    } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get reviewer name
    const reviewer = await pool.query(
      'SELECT full_name FROM users WHERE id = $1',
      [userId]
    );

    let updateQuery;
    let params;

    if (status === 'approved') {
      updateQuery = `
        UPDATE professional_facility_requests
        SET status = 'approved',
            revenue_split_professional = $1,
            revenue_split_facility = $2,
            revenue_split_platform = $3,
            access_hours = $4,
            access_restrictions = $5,
            special_terms = $6,
            reviewed_at = NOW(),
            reviewed_by = $7,
            reviewer_name = $8,
            valid_from = NOW()
        WHERE id = $9 AND facility_id = $10 AND status = 'pending'
        RETURNING *
      `;
      params = [
        revenueSplitProfessional, revenueSplitFacility, revenueSplitPlatform,
        accessHours, accessRestrictions, specialTerms,
        userId, reviewer.rows[0].full_name, id, userId
      ];
    } else {
      updateQuery = `
        UPDATE professional_facility_requests
        SET status = 'rejected',
            rejection_reason = $1,
            reviewed_at = NOW(),
            reviewed_by = $2,
            reviewer_name = $3
        WHERE id = $4 AND facility_id = $5 AND status = 'pending'
        RETURNING *
      `;
      params = [rejectionReason, userId, reviewer.rows[0].full_name, id, userId];
    }

    const result = await pool.query(updateQuery, params);

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Request not found or already reviewed' });
    }

    res.json({
      success: true,
      message: `Request ${status} successfully`,
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Review request error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get my requests (professional view)
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = 'SELECT * FROM professional_facility_requests WHERE professional_id = $1';
    const params = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const requests = await pool.query(query, params);

    res.json({
      success: true,
      requests: requests.rows
    });

  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get facility requests (facility view)
exports.getFacilityRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = 'SELECT * FROM professional_facility_requests WHERE facility_id = $1';
    const params = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const requests = await pool.query(query, params);

    res.json({
      success: true,
      requests: requests.rows
    });

  } catch (error) {
    console.error('Get facility requests error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get my approved facilities (professional view)
exports.getMyFacilities = async (req, res) => {
  try {
    const userId = req.user.id;

    const facilities = await pool.query(`
      SELECT * FROM professional_facility_requests
      WHERE professional_id = $1 AND status = 'approved'
      ORDER BY facility_name
    `, [userId]);

    res.json({
      success: true,
      facilities: facilities.rows
    });

  } catch (error) {
    console.error('Get my facilities error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
