const pool = require('../config/database');

/**
 * Settings Service - Platform configuration management
 * Reads from platform_settings table for dynamic configuration
 */

class SettingsService {
  /**
   * Get a single setting by key
   * @param {string} key - Setting key (e.g., 'consultation_fee')
   * @returns {object|null} Setting value or null
   */
  async getSetting(key) {
    try {
      const result = await pool.query(
        'SELECT setting_value FROM platform_settings WHERE setting_key = $1',
        [key]
      );
      
      return result.rows.length > 0 ? result.rows[0].setting_value : null;
    } catch (error) {
      console.error('Error fetching setting:', error);
      throw error;
    }
  }

  /**
   * Get multiple settings at once
   * @param {array} keys - Array of setting keys
   * @returns {object} Object with key-value pairs
   */
  async getSettings(keys) {
    try {
      const result = await pool.query(
        'SELECT setting_key, setting_value FROM platform_settings WHERE setting_key = ANY($1)',
        [keys]
      );
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      return settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Get all settings
   * @returns {object} All settings as key-value pairs
   */
  async getAllSettings() {
    try {
      const result = await pool.query(
        'SELECT setting_key, setting_value FROM platform_settings ORDER BY setting_key'
      );
      
      const settings = {};
      result.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      return settings;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  }

  /**
   * Update a setting
   * @param {string} key - Setting key
   * @param {object} value - New value (will be stored as JSONB)
   * @param {string} userId - User making the change
   * @returns {object} Updated setting
   */
  async updateSetting(key, value, userId) {
    try {
      const result = await pool.query(
        `UPDATE platform_settings 
         SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE setting_key = $3
         RETURNING *`,
        [value, userId, key]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  /**
   * Get consultation fee
   * @returns {number} Fee amount in TZS
   */
  async getConsultationFee() {
    const setting = await this.getSetting('consultation_fee');
    return setting ? setting.amount : 10000; // Default 10,000 TZS
  }

  /**
   * Get platform commission percentage
   * @returns {number} Commission percentage
   */
  async getPlatformCommission() {
    const setting = await this.getSetting('platform_commission');
    return setting ? setting.percentage : 10; // Default 10%
  }

  /**
   * Get referral bonus amount
   * @returns {number} Bonus amount in TZS
   */
  async getReferralBonus() {
    const setting = await this.getSetting('referral_bonus');
    return setting ? setting.amount : 5000; // Default 5,000 TZS
  }

  /**
   * Check if feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} True if enabled
   */
  async isFeatureEnabled(feature) {
    const setting = await this.getSetting(feature);
    return setting ? setting.enabled === true : false;
  }

  /**
   * Check if in maintenance mode
   * @returns {boolean} True if maintenance mode active
   */
  async isMaintenanceMode() {
    return await this.isFeatureEnabled('maintenance_mode');
  }
}

module.exports = new SettingsService();
