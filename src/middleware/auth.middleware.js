// Authentication Middleware
// JWT token verification and user authentication

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// ============================================================================
// PROTECT ROUTES - Verify JWT Token
// ============================================================================
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in headers
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route. Please login.'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user still exists
            const result = await query(
                'SELECT id, email, category, main_category, verified, active FROM users WHERE id = $1',
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists'
                });
            }

            const user = result.rows[0];

            // Check if user is active
            if (!user.active) {
                return res.status(403).json({
                    success: false,
                    message: 'Account has been deactivated'
                });
            }

            // Attach user to request
            req.user = user;
            next();

        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// ============================================================================
// ROLE-BASED ACCESS CONTROL
// ============================================================================
const authorize = (...categories) => {
    return (req, res, next) => {
        if (!categories.includes(req.user.category)) {
            return res.status(403).json({
                success: false,
                message: `User category '${req.user.category}' is not authorized to access this route`
            });
        }
        next();
    };
};

// ============================================================================
// ADMIN ONLY ACCESS
// ============================================================================
const adminOnly = (req, res, next) => {
    if (req.user.category !== 'administrator') {
        return res.status(403).json({
            success: false,
            message: 'This route is only accessible to administrators'
        });
    }
    next();
};

// ============================================================================
// VERIFIED USERS ONLY
// ============================================================================
const verifiedOnly = (req, res, next) => {
    if (!req.user.verified) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your account to access this feature'
        });
    }
    next();
};

// ============================================================================
// OPTIONAL AUTH (for public routes that enhance with auth)
// ============================================================================
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const result = await query(
                    'SELECT id, email, category, main_category FROM users WHERE id = $1',
                    [decoded.id]
                );
                
                if (result.rows.length > 0) {
                    req.user = result.rows[0];
                }
            } catch (error) {
                // Token invalid, but continue as unauthenticated
            }
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    protect,
    authorize,
    adminOnly,
    verifiedOnly,
    optionalAuth
};
