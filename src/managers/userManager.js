const { get, all, run } = require('../database/connection');
const config = require('../config');
const logger = require('../utils/logger');
const { DEFAULT_TOOLS } = require('../utils/constants');

// Cache để giảm database queries
const userCache = new Map();
const statsCache = new Map();
const CACHE_TTL = 60000; // 60 giây cache TTL (tăng từ 30s)
const STATS_CACHE_TTL = 30000; // 30 giây cho stats
const MAX_CACHE_SIZE = 1000; // Giới hạn số lượng user trong cache

/**
 * Lấy user từ cache hoặc database
 * @param {string} discordId 
 * @returns {Object|null}
 */
function getCachedUser(discordId) {
    const cached = userCache.get(discordId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

/**
 * Lưu user vào cache
 * @param {string} discordId 
 * @param {Object} user 
 */
function setCachedUser(discordId, user) {
    // Xóa cache cũ nếu đã đầy
    if (userCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = userCache.keys().next().value;
        userCache.delete(oldestKey);
    }
    userCache.set(discordId, { data: user, timestamp: Date.now() });
}

/**
 * Xóa user khỏi cache (khi có update)
 * @param {string} discordId 
 */
function invalidateCache(discordId) {
    userCache.delete(discordId);
}

/**
 * Get user by Discord ID
 * @param {string} discordId
 * @returns {Object|null}
 */
function getUser(discordId) {
    // Kiểm tra cache trước
    const cached = getCachedUser(discordId);
    if (cached) return cached;
    
    const user = get('SELECT * FROM users WHERE discord_id = ?', [discordId]);
    if (user) {
        setCachedUser(discordId, user);
    }
    return user;
}

/**
 * Get user by ID
 * @param {number} userId
 * @returns {Object|null}
 */
function getUserById(userId) {
    return get('SELECT * FROM users WHERE id = ?', [userId]);
}

/**
 * Get user by username (case-insensitive search)
 * @param {string} username
 * @returns {Object|null}
 */
function getUserByUsername(username) {
    return get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
}

/**
 * Create new user
 * @param {string} discordId
 * @param {string} username
 * @returns {Object}
 */
function createUser(discordId, username) {
    const result = run(`
        INSERT INTO users (discord_id, username, dcoin, total_earned)
        VALUES (?, ?, ?, ?)
    `, [discordId, username, config.economy.startingBalance, config.economy.startingBalance]);

    logger.info('Created new user', { discordId, username, id: result.lastInsertRowid });

    const newUser = getUserById(result.lastInsertRowid);
    if (newUser) {
        setCachedUser(discordId, newUser);
        // Give default tools to new user
        giveDefaultTools(discordId);
    }
    return newUser;
}

/**
 * Give default tools (wooden pickaxe and fishing rod) to a user
 * @param {string} discordId
 */
function giveDefaultTools(discordId) {
    const user = getUser(discordId);
    if (!user) return;

    // Get default tool items from database
    const pickaxe = get('SELECT id FROM items WHERE name = ?', [DEFAULT_TOOLS.PICKAXE]);
    const fishingRod = get('SELECT id FROM items WHERE name = ?', [DEFAULT_TOOLS.FISHING_ROD]);

    // Check if user already has these tools (avoid duplicates on re-initialization)
    if (pickaxe) {
        const hasPickaxe = get('SELECT * FROM inventories WHERE user_id = ? AND item_id = ?', [user.id, pickaxe.id]);
        if (!hasPickaxe) {
            run('INSERT INTO inventories (user_id, item_id, quantity) VALUES (?, ?, ?)', [user.id, pickaxe.id, 1]);
            logger.info('Gave default pickaxe to user', { discordId, itemId: pickaxe.id });
        }
    }

    if (fishingRod) {
        const hasRod = get('SELECT * FROM inventories WHERE user_id = ? AND item_id = ?', [user.id, fishingRod.id]);
        if (!hasRod) {
            run('INSERT INTO inventories (user_id, item_id, quantity) VALUES (?, ?, ?)', [user.id, fishingRod.id, 1]);
            logger.info('Gave default fishing rod to user', { discordId, itemId: fishingRod.id });
        }
    }
}

/**
 * Ensure user has default tools (called when accessing mining/fishing)
 * @param {string} discordId
 */
function ensureDefaultTools(discordId) {
    giveDefaultTools(discordId);
}

/**
 * Get or create user
 * @param {string} discordId
 * @param {string} username
 * @returns {Object}
 */
function getOrCreateUser(discordId, username) {
    let user = getUser(discordId);
    if (!user) {
        user = createUser(discordId, username);
    }
    return user;
}

/**
 * Update user
 * @param {string} discordId
 * @param {Object} updates
 * @returns {boolean}
 */
function updateUser(discordId, updates) {
    const validFields = ['username', 'dcoin', 'total_earned', 'total_spent', 'pity_counter', 'pity4_counter', 'pity5_counter', 'daily_streak', 'last_daily_claim', 'is_banned', 'level', 'total_xp'];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (validFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(discordId);

    const result = run(`
        UPDATE users SET ${fields.join(', ')} WHERE discord_id = ?
    `, values);

    // Invalidate cache sau khi update
    invalidateCache(discordId);

    return result.changes > 0;
}

/**
 * Ban user
 * @param {string} discordId
 * @returns {boolean}
 */
function banUser(discordId) {
    return updateUser(discordId, { is_banned: 1 });
}

/**
 * Unban user
 * @param {string} discordId
 * @returns {boolean}
 */
function unbanUser(discordId) {
    return updateUser(discordId, { is_banned: 0 });
}

/**
 * Check if user is banned
 * @param {string} discordId
 * @returns {boolean}
 */
function isUserBanned(discordId) {
    const user = getUser(discordId);
    return user ? user.is_banned === 1 : false;
}

/**
 * Get all users ordered by DCoin
 * @param {number} limit
 * @returns {Array}
 */
function getLeaderboard(limit = 10) {
    return all(`
        SELECT discord_id, username, dcoin, total_earned, level, total_xp
        FROM users
        WHERE is_banned = 0
        ORDER BY dcoin DESC
        LIMIT ?
    `, [limit]);
}

/**
 * Get user rank by DCoin
 * @param {string} discordId
 * @returns {number}
 */
function getUserRank(discordId) {
    const result = get(`
        SELECT COUNT(*) + 1 as rank
        FROM users
        WHERE dcoin > (SELECT dcoin FROM users WHERE discord_id = ?)
        AND is_banned = 0
    `, [discordId]);

    return result ? result.rank : 0;
}

/**
 * Get user statistics (with caching)
 * @param {string} discordId
 * @returns {Object}
 */
function getUserStats(discordId) {
    // Check stats cache first
    const cachedStats = statsCache.get(discordId);
    if (cachedStats && Date.now() - cachedStats.timestamp < STATS_CACHE_TTL) {
        return cachedStats.data;
    }
    
    const user = getUser(discordId);
    if (!user) return null;

    const inventoryCount = get(`
        SELECT SUM(quantity) as total
        FROM inventories
        WHERE user_id = ?
    `, [user.id]);

    const gachaCount = get(`
        SELECT COUNT(*) as total
        FROM gacha_history
        WHERE user_id = ?
    `, [user.id]);

    const unreadMail = get(`
        SELECT COUNT(*) as total
        FROM mailbox
        WHERE user_id = ? AND is_claimed = 0
    `, [user.id]);

    const stats = {
        ...user,
        inventoryCount: inventoryCount?.total || 0,
        gachaCount: gachaCount?.total || 0,
        unreadMailCount: unreadMail?.total || 0,
        rank: getUserRank(discordId)
    };
    
    // Cache stats
    if (statsCache.size >= MAX_CACHE_SIZE) {
        const firstKey = statsCache.keys().next().value;
        statsCache.delete(firstKey);
    }
    statsCache.set(discordId, { data: stats, timestamp: Date.now() });
    
    return stats;
}

/**
 * Invalidate stats cache for a user
 * @param {string} discordId 
 */
function invalidateStatsCache(discordId) {
    statsCache.delete(discordId);
}

/**
 * Get user's equipped cosmetics
 * @param {string} discordId 
 * @returns {Object}
 */
function getEquippedCosmetics(discordId) {
    const user = getUser(discordId);
    if (!user) return {
        profile_theme: null,
        profile_border: null,
        profile_badge: null,
        home_theme: null
    };
    
    return {
        profile_theme: user.equipped_profile_theme || null,
        profile_border: user.equipped_profile_border || null,
        profile_badge: user.equipped_profile_badge || null,
        home_theme: user.equipped_home_theme || null
    };
}

/**
 * Equip a cosmetic item
 * @param {string} discordId 
 * @param {string} cosmeticType - 'PROFILE_THEME', 'PROFILE_BORDER', 'PROFILE_BADGE', 'HOME_THEME'
 * @param {string|null} itemId - item ID to equip, or null to unequip
 * @returns {boolean}
 */
function equipCosmetic(discordId, cosmeticType, itemId) {
    const user = getUser(discordId);
    if (!user) return false;

    const columnMap = {
        'PROFILE_THEME': 'equipped_profile_theme',
        'PROFILE_BORDER': 'equipped_profile_border',
        'PROFILE_BADGE': 'equipped_profile_badge',
        'HOME_THEME': 'equipped_home_theme'
    };

    const column = columnMap[cosmeticType];
    if (!column) {
        logger.warn('Invalid cosmetic type', { discordId, cosmeticType });
        return false;
    }

    try {
        run(`UPDATE users SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE discord_id = ?`, [itemId, discordId]);
        invalidateCache(discordId);
        invalidateStatsCache(discordId);
        logger.info('Equipped cosmetic', { discordId, cosmeticType, itemId });
        return true;
    } catch (error) {
        logger.error('Failed to equip cosmetic', { error: error.message, discordId, cosmeticType, itemId });
        return false;
    }
}

/**
 * Unequip a specific cosmetic type
 * @param {string} discordId 
 * @param {string} cosmeticType 
 * @returns {boolean}
 */
function unequipCosmetic(discordId, cosmeticType) {
    return equipCosmetic(discordId, cosmeticType, null);
}

module.exports = {
    getUser,
    getUserById,
    getUserByUsername,
    createUser,
    getOrCreateUser,
    updateUser,
    banUser,
    unbanUser,
    isUserBanned,
    getLeaderboard,
    getUserRank,
    getUserStats,
    invalidateCache,
    invalidateStatsCache,
    giveDefaultTools,
    ensureDefaultTools,
    getEquippedCosmetics,
    equipCosmetic,
    unequipCosmetic
};
