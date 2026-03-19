// Lab Test Booking Controller
const { query } = require('../config/database');

// Get available lab tests
const getLabTests = async (req, res) => {
  try {
    const { category, facilityId } = req.query;
    
    let sql = `
      SELECT lt.*, f.full_name as facility_name, f.region, f.district
      FROM lab_tests lt
      JOIN facilities f ON lt.facility_id = f.id
      WHERE lt.available = true
    `;
    
    const params = [];
    if (category) {
      sql += ` AND lt.category = $${params.length + 1}`;
      params.push(category);
    }
    if (facilityId) {
      sql += ` AND lt.facility_id = $${params.length + 1}`;
      params.push(facilityId);
    }
    
    sql += ` ORDER BY lt.name`;
    
    const result = await query(sql, params);
    
    res.json({
      success: true,
      data: {
        tests: result.rows,
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error('Get lab tests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Book lab test
const bookLabTest = async (req, res) => {
  try {
    const { testId, preferredDate, preferredTime, notes } = req.body;
    const patientId = req.user.id;
    
    // Get test details
    const testResult = await query(
      'SELECT * FROM lab_tests WHERE id = $1',
      [testId]
    );
    
    if (testResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }
    
    const test = testResult.rows[0];
    
    // Check wallet balance
    const walletResult = await query(
      'SELECT balance FROM wallet WHERE user_id = $1',
      [patientId]
    );
    
    if (!walletResult.rows[0] || walletResult.rows[0].balance < test.price) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
      });
    }
    
    // Create booking
    const bookingResult = await query(
      `INSERT INTO lab_bookings (
        patient_id, test_id, facility_id, preferred_date, preferred_time,
        price, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [patientId, testId, test.facility_id, preferredDate, preferredTime, test.price, 'pending', notes]
    );
    
    // Deduct from wallet
    await query(
      'UPDATE wallet SET balance = balance - $1, total_spent = total_spent + $1 WHERE user_id = $2',
      [test.price, patientId]
    );
    
    // Record transaction
    await query(
      `INSERT INTO wallet_transactions (user_id, type, amount, description, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [patientId, 'spend', test.price, `Lab test: ${test.name}`, bookingResult.rows[0].id]
    );
    
    res.json({
      success: true,
      data: { booking: bookingResult.rows[0] },
      message: 'Lab test booked successfully',
    });
  } catch (error) {
    console.error('Book lab test error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get my lab bookings
const getMyLabBookings = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const result = await query(
      `SELECT lb.*, lt.name as test_name, lt.category, f.full_name as facility_name
       FROM lab_bookings lb
       JOIN lab_tests lt ON lb.test_id = lt.id
       JOIN facilities f ON lb.facility_id = f.id
       WHERE lb.patient_id = $1
       ORDER BY lb.created_at DESC`,
      [patientId]
    );
    
    res.json({
      success: true,
      data: { bookings: result.rows },
    });
  } catch (error) {
    console.error('Get lab bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getLabTests,
  bookLabTest,
  getMyLabBookings,
};
