// Referral Controller
// Handles referral program and rewards

const { query, transaction } = require('../config/database');

// ============================================================================
// GET MY REFERRAL CODE
// ============================================================================
const getMyReferralCode = async (req, res) => {
    try {
        const userId = req.user.id;

        // Generate referral code based on user name
        const userResult = await query(
            'SELECT full_name FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const fullName = userResult.rows[0].full_name;
        const referralCode = `CHARLA-${fullName.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        // Get referral stats
        const statsResult = await query(
            `SELECT 
                COUNT(*) as total_referrals,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_referrals,
                SUM(CASE WHEN status = 'rewarded' THEN reward_amount ELSE 0 END) as total_earned
             FROM referrals
             WHERE referrer_id = $1`,
            [userId]
        );

        const stats = statsResult.rows[0];

        res.json({
            success: true,
            data: {
                referralCode,
                stats: {
                    totalReferrals: parseInt(stats.total_referrals),
                    successfulReferrals: parseInt(stats.successful_referrals),
                    totalEarned: parseInt(stats.total_earned) || 0
                }
            }
        });

    } catch (error) {
        console.error('Get referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referral code',
            error: error.message
        });
    }
};

// ============================================================================
// APPLY REFERRAL CODE (During Registration)
// ============================================================================
const applyReferralCode = async (req, res) => {
    try {
        const newUserId = req.user.id;
        const { referralCode } = req.body;

        if (!referralCode) {
            return res.status(400).json({
                success: false,
                message: 'Referral code is required'
            });
        }

        // Check if user already used a referral code
        const existingReferral = await query(
            'SELECT id FROM referrals WHERE referred_user_id = $1',
            [newUserId]
        );

        if (existingReferral.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already used a referral code'
            });
        }

        // Find referrer (this is simplified - in production, store codes in DB)
        // For now, we'll extract user info from code format CHARLA-XXXX12345
        
        // Create referral record
        const result = await transaction(async (client) => {
            // Insert referral
            const referralResult = await client.query(
                `INSERT INTO referrals (referrer_id, referred_user_id, referral_code, status)
                 VALUES ((SELECT id FROM users WHERE id != $1 LIMIT 1), $1, $2, $3)
                 RETURNING *`,
                [newUserId, referralCode, 'pending']
            );

            // Give new user discount (5,000 TZS)
            const walletResult = await client.query(
                'SELECT id FROM wallet WHERE user_id = $1',
                [newUserId]
            );

            if (walletResult.rows.length > 0) {
                await client.query(
                    'UPDATE wallet SET balance = balance + $1 WHERE user_id = $2',
                    [5000, newUserId]
                );

                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
                     VALUES ($1, $2, $3, $4)`,
                    [walletResult.rows[0].id, 'bonus', 5000, 'Referral signup bonus']
                );
            }

            return referralResult.rows[0];
        });

        res.json({
            success: true,
            message: 'Referral code applied! You received 5,000 TZS bonus.',
            data: { referral: result, bonus: 5000 }
        });

    } catch (error) {
        console.error('Apply referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply referral code',
            error: error.message
        });
    }
};

// ============================================================================
// GET MY REFERRALS
// ============================================================================
const getMyReferrals = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT 
                r.*,
                u.full_name as referred_user_name,
                u.email as referred_user_email,
                u.created_at as user_joined_at
             FROM referrals r
             JOIN users u ON r.referred_user_id = u.id
             WHERE r.referrer_id = $1
             ORDER BY r.created_at DESC`,
            [userId]
        );

        // Calculate pending rewards
        const completedCount = result.rows.filter(r => r.status === 'completed').length;
        const rewardedCount = result.rows.filter(r => r.status === 'rewarded').length;
        const pendingRewards = Math.floor((completedCount - rewardedCount) / 3) * 10000;

        res.json({
            success: true,
            data: {
                referrals: result.rows,
                summary: {
                    total: result.rows.length,
                    completed: completedCount,
                    rewarded: rewardedCount,
                    pendingRewards,
                    nextRewardAt: 3 - (completedCount % 3)
                }
            }
        });

    } catch (error) {
        console.error('Get my referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch referrals',
            error: error.message
        });
    }
};

// ============================================================================
// CLAIM REFERRAL REWARD
// ============================================================================
const claimReward = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check completed referrals
        const result = await query(
            `SELECT COUNT(*) as completed
             FROM referrals
             WHERE referrer_id = $1 AND status = 'completed'`,
            [userId]
        );

        const completedCount = parseInt(result.rows[0].completed);

        if (completedCount < 3) {
            return res.status(400).json({
                success: false,
                message: `You need ${3 - completedCount} more successful referrals to claim reward`
            });
        }

        // Process reward
        const rewardResult = await transaction(async (client) => {
            // Mark 3 referrals as rewarded
            await client.query(
                `UPDATE referrals 
                 SET status = 'rewarded', reward_amount = 10000, completed_at = CURRENT_TIMESTAMP
                 WHERE id IN (
                     SELECT id FROM referrals
                     WHERE referrer_id = $1 AND status = 'completed'
                     ORDER BY created_at ASC
                     LIMIT 3
                 )`,
                [userId]
            );

            // Add reward to wallet (10,000 TZS for 3 referrals)
            const walletResult = await client.query(
                'SELECT id FROM wallet WHERE user_id = $1',
                [userId]
            );

            if (walletResult.rows.length > 0) {
                await client.query(
                    'UPDATE wallet SET balance = balance + $1 WHERE user_id = $2',
                    [10000, userId]
                );

                await client.query(
                    `INSERT INTO wallet_transactions (wallet_id, type, amount, description)
                     VALUES ($1, $2, $3, $4)`,
                    [walletResult.rows[0].id, 'bonus', 10000, 'Referral reward - 3 successful referrals']
                );
            }

            return { rewardAmount: 10000 };
        });

        res.json({
            success: true,
            message: 'Congratulations! You earned 10,000 TZS from referrals!',
            data: rewardResult
        });

    } catch (error) {
        console.error('Claim reward error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to claim reward',
            error: error.message
        });
    }
};

module.exports = {
    getMyReferralCode,
    applyReferralCode,
    getMyReferrals,
    claimReward
};
