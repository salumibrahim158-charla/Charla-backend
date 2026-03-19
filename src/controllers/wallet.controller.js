// Wallet Controller
// Handles prepaid health wallet credits

const { query, transaction } = require('../config/database');

// ============================================================================
// GET WALLET BALANCE
// ============================================================================
const getWalletBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT w.*, 
                    (SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id = w.id) as transaction_count
             FROM wallet w
             WHERE w.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // Create wallet if doesn't exist
            const newWallet = await query(
                'INSERT INTO wallet (user_id, balance) VALUES ($1, $2) RETURNING *',
                [userId, 0]
            );

            return res.json({
                success: true,
                data: { wallet: newWallet.rows[0] }
            });
        }

        res.json({
            success: true,
            data: { wallet: result.rows[0] }
        });

    } catch (error) {
        console.error('Get wallet balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet balance',
            error: error.message
        });
    }
};

// ============================================================================
// ADD FUNDS TO WALLET
// ============================================================================
const addFunds = async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        // In production, integrate with M-Pesa, Tigo Pesa, Airtel Money here
        // For MVP, we'll simulate successful payment

        const result = await transaction(async (client) => {
            // Update wallet balance
            await client.query(
                'UPDATE wallet SET balance = balance + $1, total_purchased = total_purchased + $1 WHERE user_id = $2',
                [amount, userId]
            );

            // Get wallet ID
            const walletResult = await client.query(
                'SELECT id FROM wallet WHERE user_id = $1',
                [userId]
            );

            const walletId = walletResult.rows[0].id;

            // Record transaction
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
                 VALUES ($1, $2, $3, $4)`,
                [walletId, 'purchase', amount, `Added funds via ${paymentMethod || 'payment'}`]
            );

            // Check for bonus (bulk purchase rewards)
            let bonus = 0;
            if (amount >= 200000) {
                bonus = 30000; // 15% bonus for 200K+
            } else if (amount >= 100000) {
                bonus = 10000; // 10% bonus for 100K+
            }

            if (bonus > 0) {
                await client.query(
                    'UPDATE wallet SET balance = balance + $1 WHERE user_id = $2',
                    [bonus, userId]
                );

                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
                     VALUES ($1, $2, $3, $4)`,
                    [walletId, 'bonus', bonus, 'Bulk purchase bonus']
                );
            }

            // Get updated balance
            const updatedWallet = await client.query(
                'SELECT * FROM wallet WHERE user_id = $1',
                [userId]
            );

            return { wallet: updatedWallet.rows[0], bonus };
        });

        res.json({
            success: true,
            message: 'Funds added successfully',
            data: result
        });

    } catch (error) {
        console.error('Add funds error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add funds',
            error: error.message
        });
    }
};

// ============================================================================
// GET WALLET TRANSACTIONS
// ============================================================================
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, limit = 50 } = req.query;

        let queryText = `
            SELECT wt.*, b.booking_date, b.booking_time
            FROM wallet_transactions wt
            JOIN wallet w ON wt.wallet_id = w.id
            LEFT JOIN bookings b ON wt.booking_id = b.id
            WHERE w.user_id = $1
        `;

        const params = [userId];

        if (type) {
            queryText += ' AND wt.type = $2';
            params.push(type);
        }

        queryText += ' ORDER BY wt.created_at DESC LIMIT $' + (params.length + 1);
        params.push(parseInt(limit));

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: { transactions: result.rows }
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
};

// ============================================================================
// GET WALLET PACKAGES (Pricing tiers)
// ============================================================================
const getWalletPackages = async (req, res) => {
    try {
        const packages = [
            {
                id: 'basic',
                name: 'Basic',
                amount: 50000,
                consultations: 2,
                pricePerConsultation: 25000,
                bonus: 0,
                savings: 0
            },
            {
                id: 'standard',
                name: 'Standard',
                amount: 100000,
                consultations: 5, // 4 + 1 free
                pricePerConsultation: 20000,
                bonus: 20000,
                savings: 20000
            },
            {
                id: 'premium',
                name: 'Premium',
                amount: 200000,
                consultations: 13, // 10 + 3 free
                pricePerConsultation: 15385,
                bonus: 40000,
                savings: 90000
            }
        ];

        res.json({
            success: true,
            data: { packages }
        });

    } catch (error) {
        console.error('Get wallet packages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch packages',
            error: error.message
        });
    }
};

module.exports = {
    getWalletBalance,
    addFunds,
    getTransactions,
    getWalletPackages
};
