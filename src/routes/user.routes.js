// User Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { query } = require('../config/database');

// Get user profile
router.get('/profile', protect, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, full_name, phone, category, main_category FROM users WHERE id = $1',
            [req.user.id]
        );
        
        res.json({ success: true, data: { user: result.rows[0] } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
