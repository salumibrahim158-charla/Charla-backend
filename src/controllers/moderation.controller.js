const pool = require('../config/database');
const loggingService = require('../services/logging.service');

/**
 * Moderation Controller
 * Manages content flagging and moderation system
 * Handles user reports and admin review of inappropriate content
 */

/**
 * Flag content for review
 * POST /api/moderation/flag
 */
exports.flagContent = async (req, res) => {
  try {
    const flagged_by = req.user.id;
    const { content_type, content_id, reason } = req.body;

    // Validate required fields
    if (!content_type || !content_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: content_type, content_id, reason'
      });
    }

    // Validate content type
    const validTypes = ['review', 'message', 'profile', 'booking_note'];
    if (!validTypes.includes(content_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content_type. Must be: review, message, profile, or booking_note'
      });
    }

    // Check if user already flagged this content
    const existingCheck = await pool.query(
      `SELECT id FROM flagged_content 
       WHERE content_type = $1 AND content_id = $2 AND flagged_by = $3`,
      [content_type, content_id, flagged_by]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already flagged this content'
      });
    }

    // Create flag record
    const result = await pool.query(
      `INSERT INTO flagged_content (content_type, content_id, flagged_by, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [content_type, content_id, flagged_by, reason]
    );

    res.status(201).json({
      success: true,
      message: 'Content flagged for review. Our team will investigate.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error flagging content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flag content',
      error: error.message
    });
  }
};

/**
 * Get all flagged content (admin)
 * GET /api/moderation/flagged
 */
exports.getAllFlaggedContent = async (req, res) => {
  try {
    const { status, content_type, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        fc.*,
        flagger.full_name as flagged_by_name,
        flagger.email as flagged_by_email,
        reviewer.full_name as reviewed_by_name
      FROM flagged_content fc
      JOIN users flagger ON fc.flagged_by = flagger.id
      LEFT JOIN users reviewer ON fc.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND fc.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (content_type) {
      query += ` AND fc.content_type = $${paramCount}`;
      params.push(content_type);
      paramCount++;
    }

    query += ` ORDER BY fc.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged content',
      error: error.message
    });
  }
};

/**
 * Get flagged content by ID
 * GET /api/moderation/flagged/:id
 */
exports.getFlaggedContentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        fc.*,
        flagger.full_name as flagged_by_name,
        flagger.email as flagged_by_email,
        reviewer.full_name as reviewed_by_name
       FROM flagged_content fc
       JOIN users flagger ON fc.flagged_by = flagger.id
       LEFT JOIN users reviewer ON fc.reviewed_by = reviewer.id
       WHERE fc.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flagged content not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flagged content',
      error: error.message
    });
  }
};

/**
 * Get my flagged reports
 * GET /api/moderation/my-flags
 */
exports.getMyFlags = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT * FROM flagged_content 
       WHERE flagged_by = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching user flags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your flags',
      error: error.message
    });
  }
};

/**
 * Review flagged content - Mark as reviewed (admin)
 * POST /api/moderation/flagged/:id/review
 */
exports.reviewFlaggedContent = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;
    const { review_notes } = req.body;

    const result = await pool.query(
      `UPDATE flagged_content 
       SET status = 'reviewed', 
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
        message: 'Flagged content not found or already reviewed'
      });
    }

    // Log admin action
    await loggingService.logContentModeration(
      admin_id,
      result.rows[0].content_type,
      result.rows[0].content_id,
      'reviewed',
      req
    );

    res.status(200).json({
      success: true,
      message: 'Content reviewed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error reviewing flagged content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to review flagged content',
      error: error.message
    });
  }
};

/**
 * Remove flagged content (admin)
 * POST /api/moderation/flagged/:id/remove
 */
exports.removeContent = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;
    const { review_notes } = req.body;

    if (!review_notes) {
      return res.status(400).json({
        success: false,
        message: 'Review notes are required when removing content'
      });
    }

    const result = await pool.query(
      `UPDATE flagged_content 
       SET status = 'removed', 
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
        message: 'Flagged content not found or already reviewed'
      });
    }

    // Log admin action
    await loggingService.logContentModeration(
      admin_id,
      result.rows[0].content_type,
      result.rows[0].content_id,
      'removed',
      req
    );

    // TODO: Actually remove/hide the content from the relevant table
    // Example: if content_type is 'review', update reviews table to set is_hidden = true

    res.status(200).json({
      success: true,
      message: 'Content removed successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error removing content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove content',
      error: error.message
    });
  }
};

/**
 * Dismiss flag (admin)
 * POST /api/moderation/flagged/:id/dismiss
 */
exports.dismissFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const admin_id = req.user.id;
    const { review_notes } = req.body;

    const result = await pool.query(
      `UPDATE flagged_content 
       SET status = 'dismissed', 
           reviewed_by = $1, 
           reviewed_at = CURRENT_TIMESTAMP,
           review_notes = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [admin_id, review_notes || 'No violation found', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flagged content not found or already reviewed'
      });
    }

    // Log admin action
    await loggingService.logContentModeration(
      admin_id,
      result.rows[0].content_type,
      result.rows[0].content_id,
      'dismissed',
      req
    );

    res.status(200).json({
      success: true,
      message: 'Flag dismissed - no violation found',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error dismissing flag:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to dismiss flag',
      error: error.message
    });
  }
};

/**
 * Get moderation statistics (admin)
 * GET /api/moderation/stats
 */
exports.getModerationStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_flags,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed,
        COUNT(*) FILTER (WHERE status = 'removed') as removed,
        COUNT(*) FILTER (WHERE status = 'dismissed') as dismissed,
        COUNT(*) FILTER (WHERE content_type = 'review') as review_flags,
        COUNT(*) FILTER (WHERE content_type = 'message') as message_flags,
        COUNT(*) FILTER (WHERE content_type = 'profile') as profile_flags,
        COUNT(*) FILTER (WHERE content_type = 'booking_note') as booking_note_flags
      FROM flagged_content
    `);

    res.status(200).json({
      success: true,
      data: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch moderation statistics',
      error: error.message
    });
  }
};
