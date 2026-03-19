// Authentication Controller
// Handles registration, login, password management

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// REGISTER USER
// ============================================================================
const register = async (req, res) => {
    try {
        const {
            email,
            password,
            fullName,
            phone,
            nida,
            category,
            mainCategory,
            location,
            facilityName,
            licenseNumber,
            licenseFileUrl
        } = req.body;

        // Validate required fields
        if (!email || !password || !fullName || !phone || !nida || !category || !mainCategory) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1 OR nida = $2',
            [email, nida]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email or NIDA already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const userResult = await query(
            `INSERT INTO users (email, password_hash, full_name, phone, nida, category, main_category)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, full_name, phone, nida, category, main_category, created_at`,
            [email, passwordHash, fullName, phone, nida, category, mainCategory]
        );

        const user = userResult.rows[0];

        // Insert location
        if (location) {
            await query(
                `INSERT INTO locations (user_id, region, district, ward, street)
                 VALUES ($1, $2, $3, $4, $5)`,
                [user.id, location.region, location.district, location.ward, location.street]
            );
        }

        // Insert professional/facility data
        if (mainCategory === 'professional' && facilityName && licenseNumber) {
            await query(
                `INSERT INTO professionals (user_id, facility_name, license_number, license_file_url)
                 VALUES ($1, $2, $3, $4)`,
                [user.id, facilityName, licenseNumber, licenseFileUrl || null]
            );
        }

        if (mainCategory === 'facility' && facilityName && licenseNumber) {
            await query(
                `INSERT INTO facilities (user_id, facility_name, registration_number, license_file_url, facility_type)
                 VALUES ($1, $2, $3, $4, $5)`,
                [user.id, facilityName, licenseNumber, licenseFileUrl || null, category]
            );
        }

        // Create wallet for user
        await query(
            'INSERT INTO wallet (user_id, balance) VALUES ($1, $2)',
            [user.id, 0]
        );

        // Generate referral code
        const referralCode = `CHARLA-${fullName.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, category: user.category },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful! Karibu Charla Medics.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    category: user.category,
                    mainCategory: user.main_category,
                    referralCode
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// ============================================================================
// LOGIN USER
// ============================================================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user
        const result = await query(
            `SELECT u.*, l.region, l.district, l.ward, l.street
             FROM users u
             LEFT JOIN locations l ON u.id = l.user_id
             WHERE u.email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
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

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, category: user.category },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    category: user.category,
                    mainCategory: user.main_category,
                    verified: user.verified,
                    location: {
                        region: user.region,
                        district: user.district,
                        ward: user.ward,
                        street: user.street
                    }
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// ============================================================================
// ADMIN LOGIN (Login as any user)
// ============================================================================
const adminLogin = async (req, res) => {
    try {
        const { adminPassword, userEmail } = req.body;

        // Validate admin password
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2000charla';
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin password'
            });
        }

        // Find user
        const result = await query(
            `SELECT u.*, l.region, l.district, l.ward, l.street
             FROM users u
             LEFT JOIN locations l ON u.id = l.user_id
             WHERE u.email = $1`,
            [userEmail]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found. Please register first as a normal user.'
            });
        }

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, category: user.category, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '7d' }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    category: user.category,
                    mainCategory: user.main_category,
                    location: {
                        region: user.region,
                        district: user.district,
                        ward: user.ward,
                        street: user.street
                    }
                },
                token,
                adminAccess: true
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin login failed',
            error: error.message
        });
    }
};

// ============================================================================
// GET CURRENT USER
// ============================================================================
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT u.id, u.email, u.full_name, u.phone, u.nida, u.category, u.main_category, 
                    u.verified, u.created_at, 
                    l.region, l.district, l.ward, l.street,
                    w.balance as wallet_balance
             FROM users u
             LEFT JOIN locations l ON u.id = l.user_id
             LEFT JOIN wallet w ON u.id = w.user_id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.full_name,
                    phone: user.phone,
                    nida: user.nida,
                    category: user.category,
                    mainCategory: user.main_category,
                    verified: user.verified,
                    walletBalance: user.wallet_balance || 0,
                    location: {
                        region: user.region,
                        district: user.district,
                        ward: user.ward,
                        street: user.street
                    },
                    createdAt: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data',
            error: error.message
        });
    }
};

// ============================================================================
// VERIFY TOKEN
// ============================================================================
const verifyToken = async (req, res) => {
    try {
        // Token is already verified by auth middleware
        res.json({
            success: true,
            message: 'Token is valid',
            data: {
                userId: req.user.id,
                email: req.user.email,
                category: req.user.category
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

module.exports = {
    register,
    login,
    adminLogin,
    getCurrentUser,
    verifyToken
};
