const pool = require('../config/database');
const { sendSMS } = require('../services/sms.service');

/**
 * Home Collection Controller - V1.2
 * Phlebotomist gig economy for home sample collection
 */

// Request home sample collection
exports.requestCollection = async (req, res) => {
  const { 
    sample_type, 
    collection_address, 
    preferred_date, 
    preferred_time,
    location_lat,
    location_lng,
    notes 
  } = req.body;
  const patient_id = req.user.id;

  try {
    // Get pricing based on location (region detection from GPS)
    const pricing = await pool.query(
      `SELECT * FROM home_collection_pricing 
       WHERE region = 'Dar es Salaam' 
       AND sample_type = $1
       LIMIT 1`,
      [sample_type]
    );

    const base_price = pricing.rows.length > 0 ? pricing.rows[0].price : 15000; // Default 15,000 TZS

    // Create collection request
    const result = await pool.query(
      `INSERT INTO home_collection_requests (
        patient_id, sample_type, collection_address, 
        preferred_date, preferred_time, location_lat, location_lng,
        notes, price, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [
        patient_id,
        sample_type,
        collection_address,
        preferred_date,
        preferred_time,
        location_lat,
        location_lng,
        notes,
        base_price
      ]
    );

    // Notify available phlebotomists in the area
    const phlebotomists = await pool.query(
      `SELECT u.id, u.phone FROM users u
       JOIN phlebotomist_availability pa ON u.id = pa.phlebotomist_id
       WHERE u.category = 'professional' 
       AND u.main_category = 'phlebotomist'
       AND pa.is_available = true
       AND pa.region = 'Dar es Salaam'`
    );

    // Send SMS to nearby phlebotomists
    for (const phleb of phlebotomists.rows) {
      if (phleb.phone) {
        await sendSMS(
          phleb.phone,
          `New sample collection request! ${sample_type} at ${collection_address}. Date: ${preferred_date}. Price: ${base_price} TZS. Login to accept.`
        );
      }
    }

    res.status(201).json({
      message: 'Collection request created successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Request collection error:', error);
    res.status(500).json({ error: 'Failed to create collection request' });
  }
};

// Accept collection request (phlebotomist only)
exports.acceptRequest = async (req, res) => {
  const { id } = req.params;
  const phlebotomist_id = req.user.id;

  try {
    // Verify user is phlebotomist
    const user = await pool.query(
      'SELECT main_category FROM users WHERE id = $1',
      [phlebotomist_id]
    );

    if (user.rows[0].main_category !== 'phlebotomist') {
      return res.status(403).json({ error: 'Only phlebotomists can accept requests' });
    }

    // Check if request is still pending
    const request = await pool.query(
      'SELECT * FROM home_collection_requests WHERE id = $1',
      [id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Request already accepted by another phlebotomist' });
    }

    // Accept request
    const result = await pool.query(
      `UPDATE home_collection_requests SET 
        phlebotomist_id = $1,
        status = 'accepted',
        accepted_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [phlebotomist_id, id]
    );

    // Notify patient
    const patient = await pool.query(
      'SELECT u.phone, u.full_name FROM users u WHERE id = $1',
      [request.rows[0].patient_id]
    );

    const phlebotomist = await pool.query(
      'SELECT full_name, phone FROM users WHERE id = $1',
      [phlebotomist_id]
    );

    if (patient.rows[0].phone) {
      await sendSMS(
        patient.rows[0].phone,
        `Your sample collection request has been accepted by ${phlebotomist.rows[0].full_name}. They will contact you shortly.`
      );
    }

    res.json({
      message: 'Request accepted successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
};

// Complete collection (phlebotomist only)
exports.completeCollection = async (req, res) => {
  const { id } = req.params;
  const { sample_collected, notes, lab_delivery_eta } = req.body;
  const phlebotomist_id = req.user.id;

  try {
    const request = await pool.query(
      'SELECT * FROM home_collection_requests WHERE id = $1 AND phlebotomist_id = $2',
      [id, phlebotomist_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const result = await pool.query(
      `UPDATE home_collection_requests SET 
        status = 'completed',
        sample_collected = $1,
        collection_notes = $2,
        lab_delivery_eta = $3,
        completed_at = NOW()
      WHERE id = $4
      RETURNING *`,
      [sample_collected, notes, lab_delivery_eta, id]
    );

    // Notify patient
    const patient = await pool.query(
      'SELECT phone FROM users WHERE id = $1',
      [request.rows[0].patient_id]
    );

    if (patient.rows[0].phone) {
      await sendSMS(
        patient.rows[0].phone,
        `Sample collection completed! Your ${request.rows[0].sample_type} sample has been collected and will be delivered to the lab.`
      );
    }

    res.json({
      message: 'Collection completed successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Complete collection error:', error);
    res.status(500).json({ error: 'Failed to complete collection' });
  }
};

// Get patient requests
exports.getPatientRequests = async (req, res) => {
  const patient_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT hcr.*, u.full_name as phlebotomist_name, u.phone as phlebotomist_phone
       FROM home_collection_requests hcr
       LEFT JOIN users u ON hcr.phlebotomist_id = u.id
       WHERE hcr.patient_id = $1
       ORDER BY hcr.created_at DESC`,
      [patient_id]
    );

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get patient requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

// Get phlebotomist requests
exports.getPhlebotomistRequests = async (req, res) => {
  const phlebotomist_id = req.user.id;
  const { status } = req.query;

  try {
    let query = `
      SELECT hcr.*, u.full_name as patient_name, u.phone as patient_phone
      FROM home_collection_requests hcr
      JOIN users u ON hcr.patient_id = u.id
      WHERE hcr.phlebotomist_id = $1
    `;
    const params = [phlebotomist_id];

    if (status) {
      query += ' AND hcr.status = $2';
      params.push(status);
    }

    query += ' ORDER BY hcr.preferred_date DESC, hcr.preferred_time DESC';

    const result = await pool.query(query, params);

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get phlebotomist requests error:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

// Get available requests (for phlebotomists to browse)
exports.getAvailableRequests = async (req, res) => {
  const { region } = req.query;

  try {
    let query = `
      SELECT hcr.*, u.full_name as patient_name
      FROM home_collection_requests hcr
      JOIN users u ON hcr.patient_id = u.id
      WHERE hcr.status = 'pending'
    `;
    const params = [];

    if (region) {
      query += ' AND hcr.region = $1';
      params.push(region);
    }

    query += ' ORDER BY hcr.created_at DESC LIMIT 20';

    const result = await pool.query(query, params);

    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get available requests error:', error);
    res.status(500).json({ error: 'Failed to fetch available requests' });
  }
};

// Update phlebotomist availability
exports.updateAvailability = async (req, res) => {
  const { is_available, region, available_from, available_until } = req.body;
  const phlebotomist_id = req.user.id;

  try {
    // Check if availability record exists
    const existing = await pool.query(
      'SELECT id FROM phlebotomist_availability WHERE phlebotomist_id = $1',
      [phlebotomist_id]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE phlebotomist_availability SET 
          is_available = $1,
          region = $2,
          available_from = $3,
          available_until = $4,
          updated_at = NOW()
        WHERE phlebotomist_id = $5
        RETURNING *`,
        [is_available, region, available_from, available_until, phlebotomist_id]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO phlebotomist_availability (
          phlebotomist_id, is_available, region, available_from, available_until
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [phlebotomist_id, is_available, region, available_from, available_until]
      );
    }

    res.json({
      message: 'Availability updated successfully',
      availability: result.rows[0]
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};

// Cancel request
exports.cancelRequest = async (req, res) => {
  const { id } = req.params;
  const { cancellation_reason } = req.body;
  const user_id = req.user.id;

  try {
    const request = await pool.query(
      'SELECT * FROM home_collection_requests WHERE id = $1 AND (patient_id = $2 OR phlebotomist_id = $2)',
      [id, user_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.rows[0].status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed request' });
    }

    const result = await pool.query(
      `UPDATE home_collection_requests SET 
        status = 'cancelled',
        cancellation_reason = $1,
        cancelled_at = NOW(),
        cancelled_by = $2
      WHERE id = $3
      RETURNING *`,
      [cancellation_reason, user_id, id]
    );

    // Notify other party
    const otherUserId = request.rows[0].patient_id === user_id 
      ? request.rows[0].phlebotomist_id 
      : request.rows[0].patient_id;

    if (otherUserId) {
      const otherUser = await pool.query(
        'SELECT phone FROM users WHERE id = $1',
        [otherUserId]
      );

      if (otherUser.rows[0].phone) {
        await sendSMS(
          otherUser.rows[0].phone,
          `Sample collection request has been cancelled. Reason: ${cancellation_reason}`
        );
      }
    }

    res.json({
      message: 'Request cancelled successfully',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
};

module.exports = exports;
