const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// All admin routes require authentication + admin role
router.use(protect);
router.use(adminOnly);

// Analytics
router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/users', adminController.getUserAnalytics);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/approve', adminController.approveUser);
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.deleteUser);

// Professionals Management
router.get('/professionals/pending', adminController.getPendingProfessionals);
router.put('/professionals/:id/verify', adminController.verifyProfessional);
router.put('/professionals/:id/reject', adminController.rejectProfessional);

// Transactions
router.get('/transactions', adminController.getAllTransactions);
router.get('/transactions/:id', adminController.getTransactionDetails);
router.post('/transactions/:id/refund', adminController.processRefund);

// Bookings
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/emergency', adminController.getEmergencyBookings);
router.put('/bookings/:id/cancel', adminController.cancelBooking);

// Wallet Management
router.get('/wallet/transactions', adminController.getWalletTransactions);
router.post('/wallet/withdrawal/:id/approve', adminController.approveWithdrawal);
router.post('/wallet/withdrawal/:id/reject', adminController.rejectWithdrawal);

// Reports
router.get('/reports/daily', adminController.getDailyReport);
router.get('/reports/monthly', adminController.getMonthlyReport);
router.get('/reports/export', adminController.exportReport);

// System Health
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/logs', adminController.getSystemLogs);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
