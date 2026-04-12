const pool = require('../config/database');

/**
 * Logging Service - Admin activity tracking
 * Logs all admin actions for audit trail and accountability
 */

class LoggingService {
  /**
   * Log admin activity
   * @param {string} adminId - Admin user ID
   * @param {string} action - Action performed
   * @param {object} details - Additional details (optional)
   * @param {string} ipAddress - Admin IP address (optional)
   * @param {string} userAgent - Admin user agent (optional)
   * @returns {object} Created log entry
   */
  async logAdminActivity(adminId, action, details = null, ipAddress = null, userAgent = null) {
    try {
      const result = await pool.query(
        `INSERT INTO admin_activity_logs (admin_id, action, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [adminId, action, details, ipAddress, userAgent]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error logging admin activity:', error);
      // Don't throw - logging failure shouldn't break main operation
      return null;
    }
  }

  /**
   * Get admin activity logs
   * @param {object} options - Query options
   * @returns {array} Log entries
   */
  async getAdminLogs(options = {}) {
    try {
      const {
        adminId = null,
        action = null,
        limit = 100,
        offset = 0
      } = options;

      let query = `
        SELECT 
          aal.*,
          u.full_name as admin_name,
          u.email as admin_email
        FROM admin_activity_logs aal
        JOIN users u ON aal.admin_id = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (adminId) {
        query += ` AND aal.admin_id = $${paramCount}`;
        params.push(adminId);
        paramCount++;
      }

      if (action) {
        query += ` AND aal.action = $${paramCount}`;
        params.push(action);
        paramCount++;
      }

      query += ` ORDER BY aal.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      throw error;
    }
  }

  /**
   * Log user suspension
   */
  async logUserSuspension(adminId, userId, reason, req = null) {
    return this.logAdminActivity(
      adminId,
      'user_suspended',
      { user_id: userId, reason },
      req?.ip,
      req?.get('user-agent')
    );
  }

  /**
   * Log user unsuspension
   */
  async logUserUnsuspension(adminId, userId, req = null) {
    return this.logAdminActivity(
      adminId,
      'user_unsuspended',
      { user_id: userId },
      req?.ip,
      req?.get('user-agent')
    );
  }

  /**
   * Log doctor approval
   */
  async logDoctorApproval(adminId, doctorId, req = null) {
    return this.logAdminActivity(
      adminId,
      'doctor_approved',
      { doctor_id: doctorId },
      req?.ip,
      req?.get('user-agent')
    );
  }

  /**
   * Log doctor rejection
   */
  async logDoctorRejection(adminId, doctorId, reason, req = null) {
    return this.logAdminActivity(
      adminId,
      'doctor_rejected',
      { doctor_id: doctorId, reason },
      req?.ip,
      req?.get('user-agent')
    );
  }

  /**
   * Log settings update
   */
  async logSettingsUpdate(adminId, settingKey, oldValue, newValue, req = null) {
    return this.logAdminActivity(
      adminId,
      'settings_updated',
      { setting_key: settingKey, old_value: oldValue, new_value: newValue },
      req?.ip,
      req?.get('user-agent')
    );
  }

  /**
   * Log content moderation action
   */
  async logContentModeration(adminId, contentType, contentId, action, req = null) {
    return this.logAdminActivity(
      adminId,
      'content_moderated',
      { content_type: contentType, content_id: contentId, moderation_action: action },
      req?.ip,
      req?.get('user-agent')
    );
  }
}

module.exports = new LoggingService();
