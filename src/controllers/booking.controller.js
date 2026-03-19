// Booking Controller
// Handles consultation bookings including emergency consultations

const { query, transaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CREATE BOOKING
// ============================================================================
const createBooking = async (req, res) => {
    try {
        const patientId = req.user.id;
        const {
            doctorId,
            bookingDate,
            bookingTime,
            isEmergency,
            familyMemberId,
            notes
        } = req.body;

        // Validate required fields
        if (!doctorId || !bookingDate || (!bookingTime && !isEmergency)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Get doctor's consultation price
        const doctorResult = await query(
            'SELECT consultation_price FROM professionals WHERE user_id = $1',
            [doctorId]
        );

        if (doctorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        let price = doctorResult.rows[0].consultation_price;

        // Emergency consultation: 67% price increase (30K → 50K)
        if (isEmergency) {
            price = Math.round(price * (parseFloat(process.env.EMERGENCY_PRICE_MULTIPLIER) || 1.67));
        }

        // Check user's wallet balance
        const walletResult = await query(
            'SELECT balance FROM wallet WHERE user_id = $1',
            [patientId]
        );

        const walletBalance = walletResult.rows.length > 0 ? walletResult.rows[0].balance : 0;

        if (walletBalance < price) {
            return res.status(402).json({
                success: false,
                message: 'Insufficient wallet balance',
                data: {
                    required: price,
                    available: walletBalance,
                    shortfall: price - walletBalance
                }
            });
        }

        // For emergency, find next available slot or assign immediately
        let finalBookingTime = bookingTime;
        let finalBookingDate = bookingDate;

        if (isEmergency && !bookingTime) {
            // Emergency: schedule ASAP (next 30 min slot)
            const now = new Date();
            const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
            now.setMinutes(roundedMinutes);
            now.setSeconds(0);
            
            finalBookingTime = now.toTimeString().split(' ')[0].substring(0, 5);
            finalBookingDate = now.toISOString().split('T')[0];
        }

        // Create booking in transaction
        const result = await transaction(async (client) => {
            // Insert booking
            const bookingResult = await client.query(
                `INSERT INTO bookings (
                    patient_id, doctor_id, family_member_id, booking_date, booking_time,
                    status, is_emergency, price, payment_status, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    patientId, doctorId, familyMemberId || null,
                    finalBookingDate, finalBookingTime,
                    isEmergency ? 'confirmed' : 'pending', // Emergency bookings auto-confirmed
                    isEmergency || false, price, 'paid', notes || null
                ]
            );

            const booking = bookingResult.rows[0];

            // Deduct from wallet
            await client.query(
                'UPDATE wallet SET balance = balance - $1 WHERE user_id = $2',
                [price, patientId]
            );

            // Record wallet transaction
            const walletResult = await client.query(
                'SELECT id FROM wallet WHERE user_id = $1',
                [patientId]
            );

            if (walletResult.rows.length > 0) {
                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description, booking_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        walletResult.rows[0].id,
                        'spend',
                        price,
                        isEmergency ? 'Emergency consultation payment' : 'Consultation payment',
                        booking.id
                    ]
                );
            }

            // Create notification for doctor
            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, data)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    doctorId,
                    isEmergency ? 'emergency' : 'booking',
                    isEmergency ? '🚨 EMERGENCY CONSULTATION' : 'New Booking',
                    isEmergency 
                        ? `Emergency consultation requested for ${finalBookingDate} at ${finalBookingTime}`
                        : `New booking for ${finalBookingDate} at ${finalBookingTime}`,
                    JSON.stringify({ bookingId: booking.id, patientId, isEmergency })
                ]
            );

            return booking;
        });

        res.status(201).json({
            success: true,
            message: isEmergency 
                ? 'Emergency consultation booked! Doctor will contact you immediately.'
                : 'Booking created successfully',
            data: { booking: result }
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
};

// ============================================================================
// GET MY BOOKINGS (Patient)
// ============================================================================
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, upcoming } = req.query;

        let queryText = `
            SELECT 
                b.*,
                d.full_name as doctor_name,
                d.phone as doctor_phone,
                p.specialty,
                p.consultation_price,
                fm.full_name as family_member_name
            FROM bookings b
            JOIN users d ON b.doctor_id = d.id
            JOIN professionals p ON d.id = p.user_id
            LEFT JOIN family_members fm ON b.family_member_id = fm.id
            WHERE b.patient_id = $1
        `;

        const params = [userId];

        if (status) {
            queryText += ' AND b.status = $2';
            params.push(status);
        }

        if (upcoming === 'true') {
            queryText += ' AND b.booking_date >= CURRENT_DATE';
        }

        queryText += ' ORDER BY b.booking_date DESC, b.booking_time DESC';

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: { bookings: result.rows }
        });

    } catch (error) {
        console.error('Get my bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

// ============================================================================
// GET DOCTOR APPOINTMENTS
// ============================================================================
const getDoctorAppointments = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date, status } = req.query;

        let queryText = `
            SELECT 
                b.*,
                p.full_name as patient_name,
                p.phone as patient_phone,
                fm.full_name as family_member_name
            FROM bookings b
            JOIN users p ON b.patient_id = p.id
            LEFT JOIN family_members fm ON b.family_member_id = fm.id
            WHERE b.doctor_id = $1
        `;

        const params = [doctorId];
        let paramCount = 1;

        if (date) {
            paramCount++;
            queryText += ` AND b.booking_date = $${paramCount}`;
            params.push(date);
        }

        if (status) {
            paramCount++;
            queryText += ` AND b.status = $${paramCount}`;
            params.push(status);
        }

        queryText += ' ORDER BY b.booking_date ASC, b.booking_time ASC';

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: { appointments: result.rows }
        });

    } catch (error) {
        console.error('Get doctor appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments',
            error: error.message
        });
    }
};

// ============================================================================
// CANCEL BOOKING
// ============================================================================
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get booking
        const bookingResult = await query(
            'SELECT * FROM bookings WHERE id = $1',
            [id]
        );

        if (bookingResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const booking = bookingResult.rows[0];

        // Check authorization (patient or doctor can cancel)
        if (booking.patient_id !== userId && booking.doctor_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this booking'
            });
        }

        // Cannot cancel completed bookings
        if (booking.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel completed booking'
            });
        }

        // Process refund in transaction
        await transaction(async (client) => {
            // Update booking status
            await client.query(
                'UPDATE bookings SET status = $1 WHERE id = $2',
                ['cancelled', id]
            );

            // Refund to wallet if paid
            if (booking.payment_status === 'paid') {
                await client.query(
                    'UPDATE wallet SET balance = balance + $1 WHERE user_id = $2',
                    [booking.price, booking.patient_id]
                );

                // Record refund transaction
                const walletResult = await client.query(
                    'SELECT id FROM wallet WHERE user_id = $1',
                    [booking.patient_id]
                );

                if (walletResult.rows.length > 0) {
                    await client.query(
                        `INSERT INTO wallet_transactions (wallet_id, type, amount, description, booking_id)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [walletResult.rows[0].id, 'refund', booking.price, 'Booking cancellation refund', booking.id]
                    );
                }

                // Update payment status
                await client.query(
                    'UPDATE bookings SET payment_status = $1 WHERE id = $2',
                    ['refunded', id]
                );
            }
        });

        res.json({
            success: true,
            message: 'Booking cancelled successfully. Refund processed.',
            data: { refundAmount: booking.price }
        });

    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getDoctorAppointments,
    cancelBooking
};
