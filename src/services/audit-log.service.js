const pool = require('../config/database');

exports.log = async (userId, action, entityType, entityId, details = {}) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

exports.getLogs = async (filters = {}, limit = 50, offset = 0) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return result.rows;
  } catch (error) {
    console.error('Get audit logs error:', error);
    throw error;
  }
};

exports.getLogsCount = async (filters = {}) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM audit_logs');
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Get audit logs count error:', error);
    throw error;
  }
};

module.exports = exports;
