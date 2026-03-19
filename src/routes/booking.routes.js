// Booking Routes
const express = require('express');
const router = express.Router();
const {
    createBooking,
    getMyBookings,
    getDoctorAppointments,
    cancelBooking
} = require('../controllers/booking.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// All routes are protected
router.use(protect);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/appointments', authorize('doctor'), getDoctorAppointments);
router.delete('/:id', cancelBooking);

module.exports = router;
