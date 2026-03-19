const pool = require('../config/database');
const auditLog = require('../services/audit-log.service');

// Get comprehensive analytics
exports.getAnalytics = async (req, res) => {
  try {
    // Total users
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    
    // Verified users
    const verifiedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE verified = true');
    
    // Total revenue
    const revenue = await pool.query('SELECT SUM(amount) FROM wallet_transactions WHERE type = \'purchase\'');
    
    // Total consultations
    const consultations = await pool.query('SELECT COUNT(*) FROM bookings WHERE status = \'completed\'');
    
    // Users by category
    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM users 
      GROUP BY category
    `);
    
    // Recent activity
    const recentActivity = await pool.query(`
      SELECT 
        CASE 
          WHEN action LIKE '%register%' THEN 'New user registered'
          WHEN action LIKE '%booking%' THEN 'New booking created'
          WHEN action LIKE '%payment%' THEN 'Payment received'
          ELSE action
        END as description,
        created_at as timestamp
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Revenue by source
    const revenueBySource = {
      consultations: 0,
      packages: 0,
      lab: 0,
      pharmacy: 0
    };
    
    // Top doctors
    const topDoctors = await pool.query(`
      SELECT 
        u.full_name as name,
        COUNT(b.id) as consultations,
        SUM(b.price) * 0.7 as revenue
      FROM users u
      JOIN bookings b ON u.id = b.doctor_id
      WHERE b.status = 'completed'
      GROUP BY u.id, u.full_name
      ORDER BY revenue DESC
      LIMIT 5
    `);
    
    // Recent transactions
    const recentTransactions = await pool.query(`
      SELECT 
        wt.*,
        u.full_name as user_name
      FROM wallet_transactions wt
      JOIN wallet w ON wt.wallet_id = w.id
      JOIN users u ON w.user_id = u.id
      ORDER BY wt.created_at DESC
      LIMIT 20
    `);
    
    res.json({
      totalUsers: parseInt(totalUsers.rows[0].count),
      verifiedUsers: parseInt(verifiedUsers.rows[0].count),
      verificationRate: ((verifiedUsers.rows[0].count / totalUsers.rows[0].count) * 100).toFixed(1),
      totalRevenue: parseInt(revenue.rows[0].sum || 0),
      totalConsultations: parseInt(consultations.rows[0].count),
      usersByCategory: Object.fromEntries(
        byCategory.rows.map(r => [r.category, parseInt(r.count)])
      ),
      recentActivity: recentActivity.rows,
      revenueBySource,
      topDoctors: topDoctors.rows,
      recentTransactions: recentTransactions.rows
    });
    
    await auditLog.log(req.user.id, 'VIEW_ANALYTICS', 'analytics', null, req);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
};

// Get all users with filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { category, verified, active, search, page = 1, limit = 50 } = req.query;
    
    let query = 'SELECT u.*, l.region, l.district FROM users u LEFT JOIN locations l ON u.id = l.user_id WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (category) {
      query += ` AND u.category = $${paramIndex++}`;
      params.push(category);
    }
    
    if (verified !== undefined) {
      query += ` AND u.verified = $${paramIndex++}`;
      params.push(verified === 'true');
    }
    
    if (active !== undefined) {
      query += ` AND u.active = $${paramIndex++}`;
      params.push(active === 'true');
    }
    
    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), (page - 1) * limit);
    
    const result = await pool.query(query, params);
    
    await auditLog.log(req.user.id, 'VIEW_USERS', 'users', null, req);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

// Approve user
exports.approveUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE users SET verified = true, approved_by = $1 WHERE id = $2 RETURNING *',
      [req.user.id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await auditLog.log(req.user.id, 'APPROVE_USER', 'users', id, req);
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

// Suspend user
exports.suspendUser = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE users SET active = false, suspended_by = $1, suspension_reason = $2 WHERE id = $3 RETURNING *',
      [req.user.id, reason || 'No reason provided', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await auditLog.log(req.user.id, 'SUSPEND_USER', 'users', id, req, { reason });
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

// Activate user
exports.activateUser = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'UPDATE users SET active = true, suspended_by = NULL, suspension_reason = NULL WHERE id = $1 RETURNING *',
      [id]
    );
    
    await auditLog.log(req.user.id, 'ACTIVATE_USER', 'users', id, req);
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

// More controller methods would go here (truncated for space)
// - getUserDetails
// - deleteUser
// - getPendingProfessionals
// - verifyProfessional
// - getAllTransactions
// - processRefund
// - etc.

module.exports = exports;
