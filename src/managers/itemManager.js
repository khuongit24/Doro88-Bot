const { get, all, run } = require('../database/connection');

/**
 * Get all items
 * @returns {Array}
 */
function getAllItems() {
    return all('SELECT * FROM items ORDER BY rarity DESC, name ASC');
}

/**
 * Get item by ID
 * @param {number} itemId
 * @returns {Object|null}
 */
function getItemById(itemId) {
    return get('SELECT * FROM items WHERE id = ?', [itemId]);
}

/**
 * Get item by name
 * @param {string} name
 * @returns {Object|null}
 */
function getItemByName(name) {
    return get('SELECT * FROM items WHERE name = ?', [name]);
}

/**
 * Get items by rarity
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(rarity) {
    return all('SELECT * FROM items WHERE rarity = ?', [rarity]);
}

/**
 * Get items by type
 * @param {string} type
 * @returns {Array}
 */
function getItemsByType(type) {
    return all('SELECT * FROM items WHERE type = ?', [type]);
}

/**
 * Create new item
 * @param {Object} itemData
 * @returns {Object}
 */
function createItem(itemData) {
    const result = run(`
        INSERT INTO items (name, description, rarity, type, image_url, base_value, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        itemData.name,
        itemData.description || null,
        itemData.rarity,
        itemData.type,
        itemData.image_url || null,
        itemData.base_value || 0,
        itemData.metadata || null
    ]);

    return getItemById(result.lastInsertRowid);
}

/**
 * Update item
 * @param {number} itemId
 * @param {Object} updates
 * @returns {boolean}
 */
function updateItem(itemId, updates) {
    const validFields = ['name', 'description', 'rarity', 'type', 'image_url', 'base_value', 'metadata'];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (validFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) return false;

    values.push(itemId);

    const result = run(`
        UPDATE items SET ${fields.join(', ')} WHERE id = ?
    `, values);

    return result.changes > 0;
}

/**
 * Delete item
 * @param {number} itemId
 * @returns {boolean}
 */
function deleteItem(itemId) {
    const result = run('DELETE FROM items WHERE id = ?', [itemId]);
    return result.changes > 0;
}

/**
 * Search items
 * @param {string} query
 * @returns {Array}
 */
function searchItems(query) {
    return all(`
        SELECT * FROM items
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY rarity DESC, name ASC
    `, [`%${query}%`, `%${query}%`]);
}

/**
 * Get item count by rarity
 * @returns {Object}
 */
function getItemCountByRarity() {
    const results = all(`
        SELECT rarity, COUNT(*) as count
        FROM items
        GROUP BY rarity
    `);

    const counts = {};
    for (const row of results) {
        counts[row.rarity] = row.count;
    }
    return counts;
}

module.exports = {
    getAllItems,
    getItemById,
    getItemByName,
    getItemsByRarity,
    getItemsByType,
    createItem,
    updateItem,
    deleteItem,
    searchItems,
    getItemCountByRarity
};
