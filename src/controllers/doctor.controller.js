// Doctor Controller
// Handles doctor listing, search, profiles, and availability

const { query } = require('../config/database');

// ============================================================================
// GET ALL DOCTORS
// ============================================================================
const getDoctors = async (req, res) => {
    try {
        const {
            region,
            specialty,
            minPrice,
            maxPrice,
            minRating,
            search,
            page = 1,
            limit = 20
        } = req.query;

        let queryText = `
            SELECT 
                u.id,
                u.full_name,
                u.phone,
                u.email,
                p.specialty,
                p.consultation_price,
                p.rating,
                p.total_consultations,
                p.bio,
                p.experience_years,
                p.availability,
                l.region,
                l.district,
                l.ward
            FROM users u
            JOIN professionals p ON u.id = p.user_id
            LEFT JOIN locations l ON u.id = l.user_id
            WHERE u.category = 'doctor'
            AND u.verified = TRUE
            AND u.active = TRUE
        `;

        const params = [];
        let paramCount = 0;

        // Apply filters
        if (region) {
            paramCount++;
            queryText += ` AND l.region = $${paramCount}`;
            params.push(region);
        }

        if (specialty) {
            paramCount++;
            queryText += ` AND p.specialty ILIKE $${paramCount}`;
            params.push(`%${specialty}%`);
        }

        if (minPrice) {
            paramCount++;
            queryText += ` AND p.consultation_price >= $${paramCount}`;
            params.push(parseInt(minPrice));
        }

        if (maxPrice) {
            paramCount++;
            queryText += ` AND p.consultation_price <= $${paramCount}`;
            params.push(parseInt(maxPrice));
        }

        if (minRating) {
            paramCount++;
            queryText += ` AND p.rating >= $${paramCount}`;
            params.push(parseFloat(minRating));
        }

        if (search) {
            paramCount++;
            queryText += ` AND (u.full_name ILIKE $${paramCount} OR p.specialty ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // Order by rating and consultations
        queryText += ` ORDER BY p.rating DESC, p.total_consultations DESC`;

        // Pagination
        const offset = (page - 1) * limit;
        paramCount++;
        queryText += ` LIMIT $${paramCount}`;
        params.push(parseInt(limit));

        paramCount++;
        queryText += ` OFFSET $${paramCount}`;
        params.push(offset);

        const result = await query(queryText, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            JOIN professionals p ON u.id = p.user_id
            LEFT JOIN locations l ON u.id = l.user_id
            WHERE u.category = 'doctor'
            AND u.verified = TRUE
            AND u.active = TRUE
        `;

        if (region || specialty || minPrice || maxPrice || minRating || search) {
            // Apply same filters for count
            const countParams = params.slice(0, -2); // Remove limit and offset
            const countResult = await query(countQuery, countParams);
            var total = parseInt(countResult.rows[0].total);
        } else {
            const countResult = await query(countQuery, []);
            var total = parseInt(countResult.rows[0].total);
        }

        res.json({
            success: true,
            data: {
                doctors: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors',
            error: error.message
        });
    }
};

// ============================================================================
// GET DOCTOR BY ID
// ============================================================================
const getDoctorById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT 
                u.id,
                u.full_name,
                u.phone,
                u.email,
                u.verified,
                p.specialty,
                p.consultation_price,
                p.rating,
                p.total_consultations,
                p.bio,
                p.experience_years,
                p.availability,
                p.facility_name,
                p.license_number,
                l.region,
                l.district,
                l.ward,
                l.street
            FROM users u
            JOIN professionals p ON u.id = p.user_id
            LEFT JOIN locations l ON u.id = l.user_id
            WHERE u.id = $1 AND u.category = 'doctor'`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Get reviews
        const reviewsResult = await query(
            `SELECT 
                r.rating,
                r.review_text,
                r.created_at,
                u.full_name as patient_name
            FROM reviews r
            JOIN users u ON r.patient_id = u.id
            WHERE r.doctor_id = $1
            ORDER BY r.created_at DESC
            LIMIT 10`,
            [id]
        );

        const doctor = result.rows[0];
        doctor.reviews = reviewsResult.rows;

        res.json({
            success: true,
            data: { doctor }
        });

    } catch (error) {
        console.error('Get doctor by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctor',
            error: error.message
        });
    }
};

// ============================================================================
// UPDATE DOCTOR PROFILE
// ============================================================================
const updateDoctorProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            specialty,
            bio,
            experienceYears,
            consultationPrice,
            availability
        } = req.body;

        // Verify user is a doctor
        if (req.user.category !== 'doctor') {
            return res.status(403).json({
                success: false,
                message: 'Only doctors can update doctor profiles'
            });
        }

        const updates = [];
        const params = [];
        let paramCount = 0;

        if (specialty !== undefined) {
            paramCount++;
            updates.push(`specialty = $${paramCount}`);
            params.push(specialty);
        }

        if (bio !== undefined) {
            paramCount++;
            updates.push(`bio = $${paramCount}`);
            params.push(bio);
        }

        if (experienceYears !== undefined) {
            paramCount++;
            updates.push(`experience_years = $${paramCount}`);
            params.push(parseInt(experienceYears));
        }

        if (consultationPrice !== undefined) {
            paramCount++;
            updates.push(`consultation_price = $${paramCount}`);
            params.push(parseInt(consultationPrice));
        }

        if (availability !== undefined) {
            paramCount++;
            updates.push(`availability = $${paramCount}`);
            params.push(JSON.stringify(availability));
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        paramCount++;
        params.push(userId);

        const result = await query(
            `UPDATE professionals 
             SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $${paramCount}
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor profile not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { profile: result.rows[0] }
        });

    } catch (error) {
        console.error('Update doctor profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// ============================================================================
// GET DOCTOR AVAILABILITY
// ============================================================================
const getDoctorAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        // Get doctor's general availability
        const doctorResult = await query(
            'SELECT availability, consultation_price FROM professionals WHERE user_id = $1',
            [id]
        );

        if (doctorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const doctor = doctorResult.rows[0];

        // Get existing bookings for the date
        const bookingsResult = await query(
            `SELECT booking_time, duration 
             FROM bookings 
             WHERE doctor_id = $1 
             AND booking_date = $2 
             AND status IN ('pending', 'confirmed')
             ORDER BY booking_time`,
            [id, date || new Date().toISOString().split('T')[0]]
        );

        const bookedSlots = bookingsResult.rows.map(b => b.booking_time);

        res.json({
            success: true,
            data: {
                availability: doctor.availability || {},
                bookedSlots,
                consultationPrice: doctor.consultation_price,
                date: date || new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        console.error('Get doctor availability error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch availability',
            error: error.message
        });
    }
};

module.exports = {
    getDoctors,
    getDoctorById,
    updateDoctorProfile,
    getDoctorAvailability
};
