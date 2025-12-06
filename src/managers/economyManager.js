const { get, all, run } = require('../database/connection');
const userManager = require('./userManager');
const logger = require('../utils/logger');
const { TRANSACTION_TYPES } = require('../utils/constants');

/**
 * Get user balance
 * @param {string} discordId
 * @returns {number}
 */
function getBalance(discordId) {
    const user = userManager.getUser(discordId);
    return user ? user.dcoin : 0;
}

/**
 * Add DCoin to user
 * @param {string} discordId
 * @param {number} amount
 * @param {string} type - Transaction type
 * @param {string} description
 * @returns {boolean}
 */
function addDCoin(discordId, amount, type = TRANSACTION_TYPES.EARN, description = '') {
    if (amount <= 0) return false;

    const user = userManager.getUser(discordId);
    if (!user) {
        logger.warn('addDCoin: User not found', { discordId });
        return false;
    }

    try {
        // Update user balance
        run(`
            UPDATE users SET 
                dcoin = dcoin + ?,
                total_earned = total_earned + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        `, [amount, amount, discordId]);

        // Record transaction
        run(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
        `, [user.id, type, amount, description]);

        // Invalidate user cache sau khi update balance
        userManager.invalidateCache(discordId);

        logger.info('Added DCoin', { discordId, amount, type });
        return true;
    } catch (error) {
        logger.error('addDCoin error', { discordId, amount, error: error.message });
        return false;
    }
}

/**
 * Deduct DCoin from user
 * @param {string} discordId
 * @param {number} amount
 * @param {string} type - Transaction type
 * @param {string} description
 * @returns {boolean}
 */
function deductDCoin(discordId, amount, type = TRANSACTION_TYPES.SPEND, description = '') {
    if (amount <= 0) return false;

    const user = userManager.getUser(discordId);
    if (!user || user.dcoin < amount) {
        logger.warn('deductDCoin: Insufficient balance or user not found', {
            discordId,
            amount,
            balance: user?.dcoin
        });
        return false;
    }

    try {
        // Update user balance
        run(`
            UPDATE users SET 
                dcoin = dcoin - ?,
                total_spent = total_spent + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        `, [amount, amount, discordId]);

        // Record transaction
        run(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
        `, [user.id, type, -amount, description]);

        // Invalidate user cache sau khi update balance
        userManager.invalidateCache(discordId);

        logger.info('Deducted DCoin', { discordId, amount, type });
        return true;
    } catch (error) {
        logger.error('deductDCoin error', { discordId, amount, error: error.message });
        return false;
    }
}

/**
 * Set user balance
 * @param {string} discordId
 * @param {number} amount
 * @returns {boolean}
 */
function setBalance(discordId, amount) {
    if (amount < 0) return false;

    const user = userManager.getUser(discordId);
    if (!user) return false;

    try {
        run(`
            UPDATE users SET 
                dcoin = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        `, [amount, discordId]);

        // Invalidate user cache sau khi update balance
        userManager.invalidateCache(discordId);

        logger.info('Set balance', { discordId, amount });
        return true;
    } catch (error) {
        logger.error('setBalance error', { discordId, amount, error: error.message });
        return false;
    }
}

/**
 * Transfer DCoin between users
 * @param {string} fromDiscordId
 * @param {string} toDiscordId
 * @param {number} amount
 * @returns {boolean}
 */
function transferDCoin(fromDiscordId, toDiscordId, amount) {
    if (amount <= 0) return false;
    if (fromDiscordId === toDiscordId) return false;

    const fromUser = userManager.getUser(fromDiscordId);
    const toUser = userManager.getUser(toDiscordId);

    if (!fromUser || !toUser) return false;
    if (fromUser.dcoin < amount) return false;

    try {
        // Deduct from sender
        run(`
            UPDATE users SET 
                dcoin = dcoin - ?,
                total_spent = total_spent + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        `, [amount, amount, fromDiscordId]);

        // Add to receiver
        run(`
            UPDATE users SET 
                dcoin = dcoin + ?,
                total_earned = total_earned + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE discord_id = ?
        `, [amount, amount, toDiscordId]);

        // Record transactions
        run(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
        `, [fromUser.id, TRANSACTION_TYPES.TRANSFER, -amount, `Chuyển cho ${toDiscordId}`]);

        run(`
            INSERT INTO transactions (user_id, type, amount, description)
            VALUES (?, ?, ?, ?)
        `, [toUser.id, TRANSACTION_TYPES.TRANSFER, amount, `Nhận từ ${fromDiscordId}`]);

        // Invalidate user cache cho cả 2 users sau khi transfer
        userManager.invalidateCache(fromDiscordId);
        userManager.invalidateCache(toDiscordId);

        logger.info('Transferred DCoin', { from: fromDiscordId, to: toDiscordId, amount });
        return true;
    } catch (error) {
        logger.error('transferDCoin error', { error: error.message });
        return false;
    }
}

/**
 * Check if user can afford amount
 * @param {string} discordId
 * @param {number} amount
 * @returns {boolean}
 */
function canAfford(discordId, amount) {
    return getBalance(discordId) >= amount;
}

/**
 * Check if user is "broke" (low balance) and eligible for comeback bonus
 * @param {string} discordId
 * @returns {Object} { isBroke: boolean, balance: number }
 */
function checkBrokeStatus(discordId) {
    const balance = getBalance(discordId);
    return {
        isBroke: balance < 50,
        balance
    };
}

/**
 * Give comeback bonus to broke users
 * Only given once per hour to prevent abuse
 * @param {string} discordId
 * @returns {Object} { success: boolean, amount: number, reason: string }
 */
const comebackCooldowns = new Map();
const COMEBACK_COOLDOWN = 3600000; // 1 hour
const COMEBACK_AMOUNT = 50;

// ============= MEMORY OPTIMIZATION =============
// Cleanup comeback cooldowns every 30 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, timestamp] of comebackCooldowns.entries()) {
        // Xóa cooldowns đã hết hạn quá 2 lần thời gian cooldown
        if (now - timestamp > COMEBACK_COOLDOWN * 2) {
            comebackCooldowns.delete(key);
            cleaned++;
        }
    }
}, 30 * 60 * 1000);

function giveComebackBonus(discordId) {
    const status = checkBrokeStatus(discordId);

    if (!status.isBroke) {
        return { success: false, reason: 'not_broke', balance: status.balance };
    }

    // Check cooldown
    const lastBonus = comebackCooldowns.get(discordId) || 0;
    const now = Date.now();
    if (now - lastBonus < COMEBACK_COOLDOWN) {
        const remaining = Math.ceil((COMEBACK_COOLDOWN - (now - lastBonus)) / 60000);
        return { success: false, reason: 'cooldown', remaining };
    }

    // Give bonus
    addDCoin(discordId, COMEBACK_AMOUNT, TRANSACTION_TYPES.EARN, 'Comeback Bonus');
    comebackCooldowns.set(discordId, now);

    logger.info('Comeback bonus given', { discordId, amount: COMEBACK_AMOUNT });

    return { success: true, amount: COMEBACK_AMOUNT, newBalance: getBalance(discordId) };
}

/**
 * Get transaction history
 * @param {string} discordId
 * @param {number} limit
 * @returns {Array}
 */
function getTransactionHistory(discordId, limit = 10) {
    const user = userManager.getUser(discordId);
    if (!user) return [];

    return all(`
        SELECT type, amount, description, created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `, [user.id, limit]);
}

module.exports = {
    getBalance,
    addDCoin,
    deductDCoin,
    setBalance,
    transferDCoin,
    canAfford,
    checkBrokeStatus,
    giveComebackBonus,
    getTransactionHistory
};
