const { get, all, run } = require('../database/connection');
const userManager = require('./userManager');
const itemManager = require('./itemManager');
const { paginate } = require('../utils/helpers');
const logger = require('../utils/logger');

// ============= INVENTORY CACHING SYSTEM =============
// Cache để giảm database queries cho inventory operations
const inventoryCache = new Map();
const CACHE_TTL = 30000; // 30 giây cache TTL
const MAX_CACHE_SIZE = 500;

/**
 * Lấy inventory từ cache
 * @param {string} discordId 
 * @returns {Object|null}
 */
function getCachedInventory(discordId) {
    const cached = inventoryCache.get(discordId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

/**
 * Lưu inventory vào cache
 * @param {string} discordId 
 * @param {Object} data 
 */
function setCachedInventory(discordId, data) {
    if (inventoryCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = inventoryCache.keys().next().value;
        inventoryCache.delete(oldestKey);
    }
    inventoryCache.set(discordId, { data, timestamp: Date.now() });
}

/**
 * Xóa inventory cache (khi có update)
 * @param {string} discordId 
 */
function invalidateInventoryCache(discordId) {
    inventoryCache.delete(discordId);
}

/**
 * Get user inventory
 * @param {string} discordId
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
function getInventory(discordId, page = 1, perPage = 10) {
    const user = userManager.getUser(discordId);
    if (!user) return { items: [], pagination: paginate(0, 1, perPage) };

    // Get total count
    const countResult = get(`
        SELECT COUNT(*) as total FROM inventories WHERE user_id = ?
    `, [user.id]);

    const pagination = paginate(countResult?.total || 0, page, perPage);

    // Get items with pagination
    const items = all(`
        SELECT i.*, inv.quantity, inv.acquired_at
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = ?
        ORDER BY i.rarity DESC, i.name ASC
        LIMIT ? OFFSET ?
    `, [user.id, pagination.perPage, pagination.offset]);

    return { items, pagination };
}

/**
 * Get specific item in user inventory
 * @param {string} discordId
 * @param {number} itemId
 * @returns {Object|null}
 */
function getInventoryItem(discordId, itemId) {
    const user = userManager.getUser(discordId);
    if (!user) return null;

    return get(`
        SELECT i.*, inv.quantity, inv.acquired_at
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = ? AND inv.item_id = ?
    `, [user.id, itemId]);
}

/**
 * Get all inventory items (no pagination)
 * @param {string} discordId
 * @returns {Array}
 */
function getAllInventoryItems(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return [];

    return all(`
        SELECT i.*, inv.quantity, inv.acquired_at
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = ?
        ORDER BY i.rarity DESC, i.name ASC
    `, [user.id]);
}

/**
 * Add item to inventory
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {boolean}
 */
function addItem(discordId, itemId, quantity = 1) {
    if (quantity <= 0) return false;

    const user = userManager.getUser(discordId);
    const item = itemManager.getItemById(itemId);

    if (!user || !item) return false;

    try {
        // Check if user already has this item
        const existing = get(`
            SELECT * FROM inventories WHERE user_id = ? AND item_id = ?
        `, [user.id, itemId]);

        if (existing) {
            // Update quantity
            run(`
                UPDATE inventories SET quantity = quantity + ? WHERE user_id = ? AND item_id = ?
            `, [quantity, user.id, itemId]);
        } else {
            // Insert new record
            run(`
                INSERT INTO inventories (user_id, item_id, quantity) VALUES (?, ?, ?)
            `, [user.id, itemId, quantity]);
        }

        logger.info('Added item to inventory', { discordId, itemId, quantity });

        // Invalidate cache sau khi thêm item
        invalidateInventoryCache(discordId);

        return true;
    } catch (error) {
        logger.error('addItem error', { discordId, itemId, error: error.message });
        return false;
    }
}

/**
 * Remove item from inventory
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {boolean}
 */
function removeItem(discordId, itemId, quantity = 1) {
    if (quantity <= 0) return false;

    const user = userManager.getUser(discordId);
    if (!user) return false;

    try {
        const existing = get(`
            SELECT * FROM inventories WHERE user_id = ? AND item_id = ?
        `, [user.id, itemId]);

        if (!existing || existing.quantity < quantity) return false;

        if (existing.quantity === quantity) {
            // Remove record entirely
            run(`
                DELETE FROM inventories WHERE user_id = ? AND item_id = ?
            `, [user.id, itemId]);
        } else {
            // Decrease quantity
            run(`
                UPDATE inventories SET quantity = quantity - ? WHERE user_id = ? AND item_id = ?
            `, [quantity, user.id, itemId]);
        }

        logger.info('Removed item from inventory', { discordId, itemId, quantity });

        // Invalidate cache sau khi xóa item
        invalidateInventoryCache(discordId);

        return true;
    } catch (error) {
        logger.error('removeItem error', { discordId, itemId, error: error.message });
        return false;
    }
}

/**
 * Check if user has item
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {boolean}
 */
function hasItem(discordId, itemId, quantity = 1) {
    const item = getInventoryItem(discordId, itemId);
    return item && item.quantity >= quantity;
}

/**
 * Get total item count in inventory
 * @param {string} discordId
 * @returns {number}
 */
function getItemCount(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return 0;

    const result = get(`
        SELECT SUM(quantity) as total FROM inventories WHERE user_id = ?
    `, [user.id]);

    return result?.total || 0;
}

/**
 * Get unique item count in inventory
 * @param {string} discordId
 * @returns {number}
 */
function getUniqueItemCount(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return 0;

    const result = get(`
        SELECT COUNT(*) as total FROM inventories WHERE user_id = ?
    `, [user.id]);

    return result?.total || 0;
}

/**
 * Sell item
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {Object|null}
 */
function sellItem(discordId, itemId, quantity = 1) {
    const inv = getInventoryItem(discordId, itemId);
    if (!inv || inv.quantity < quantity) return null;

    // CÂN BẰNG KINH TẾ v3.0: Giá bán = 100% base_value
    // Item values trong gacha banners đã được điều chỉnh để đạt RTP ~70%
    const pricePerItem = Math.floor(inv.base_value);
    const totalValue = pricePerItem * quantity;
    const economyManager = require('./economyManager');

    try {
        removeItem(discordId, itemId, quantity);
        economyManager.addDCoin(discordId, totalValue, 'EARN', `Bán ${quantity}x ${inv.name}`);

        return {
            item: inv,
            quantity,
            totalValue,
            pricePerItem
        };
    } catch (error) {
        logger.error('sellItem error', { discordId, itemId, error: error.message });
        return null;
    }
}

/**
 * Get inventory by rarity
 * @param {string} discordId
 * @param {string} rarity
 * @returns {Array}
 */
function getInventoryByRarity(discordId, rarity) {
    const user = userManager.getUser(discordId);
    if (!user) return [];

    return all(`
        SELECT i.*, inv.quantity, inv.acquired_at
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = ? AND i.rarity = ?
        ORDER BY i.name ASC
    `, [user.id, rarity]);
}

module.exports = {
    getInventory,
    getInventoryItem,
    getAllInventoryItems,
    addItem,
    removeItem,
    hasItem,
    getItemCount,
    getUniqueItemCount,
    sellItem,
    getInventoryByRarity
};
