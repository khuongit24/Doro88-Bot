const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

let db = null;
let SQL = null;

// Debounce save để tối ưu hiệu năng - giảm số lần ghi file
let saveTimeout = null;
let pendingSave = false;
const SAVE_DEBOUNCE_MS = 2000; // 2 giây debounce (tăng từ 1s để giảm I/O)

// Query cache để tối ưu các truy vấn lặp đi lặp lại
const queryCache = new Map();
const QUERY_CACHE_TTL = 5000; // 5 giây TTL cho cache
const MAX_CACHE_SIZE = 500; // Giới hạn số lượng query trong cache
let cacheHits = 0;
let cacheMisses = 0;

// Batch operations tracking
let batchMode = false;
let batchOperations = 0;

/**
 * Initialize SQL.js and get database connection
 * @returns {Promise<Database>}
 */
async function initDatabase() {
    if (db) return db;

    // Initialize SQL.js
    SQL = await initSqlJs();



    // Ensure database directory exists
    const dbPath = path.resolve(config.databasePath);
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        logger.info('Database loaded from file', { path: dbPath });
    } else {
        db = new SQL.Database();
        logger.info('New database created', { path: dbPath });
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    return db;
}

/**
 * Get database connection (sync wrapper for compatibility)
 * @returns {Database}
 */
function getConnection() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

/**
 * Save database to file (with debounce for performance)
 * @param {boolean} immediate - Force immediate save
 */
function saveDatabase(immediate = false) {
    if (!db) return;

    // Nếu yêu cầu save ngay lập tức (khi shutdown)
    if (immediate) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        performSave();
        return;
    }

    // Đánh dấu có pending save
    pendingSave = true;

    // Debounce: chỉ save sau khi không có thao tác mới trong SAVE_DEBOUNCE_MS
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        if (pendingSave) {
            performSave();
            pendingSave = false;
        }
        saveTimeout = null;
    }, SAVE_DEBOUNCE_MS);
}

/**
 * Thực hiện save database thực tế
 */
function performSave() {
    if (!db) return;
    
    try {
        const dbPath = path.resolve(config.databasePath);
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    } catch (error) {
        logger.error('Failed to save database', { error: error.message });
    }
}

/**
 * Close database connection
 */
function closeConnection() {
    if (db) {
        // Force immediate save khi đóng connection
        saveDatabase(true);
        db.close();
        db = null;
        logger.info('Database connection closed');
    }
}

/**
 * Execute a transaction
 * @param {Function} fn - Function to execute in transaction
 * @returns {*} Result of function
 */
function transaction(fn) {
    const connection = getConnection();
    let inTransaction = false;
    try {
        connection.run('BEGIN TRANSACTION');
        inTransaction = true;
        const result = fn(connection);
        connection.run('COMMIT');
        inTransaction = false;
        saveDatabase(); // Auto-save after transaction
        return result;
    } catch (error) {
        if (inTransaction) {
            try {
                connection.run('ROLLBACK');
            } catch (rollbackError) {
                // Ignore rollback error
            }
        }
        throw error;
    }
}

/**
 * Helper to run prepared statement and get results
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Array}
 */
function all(sql, params = []) {
    const connection = getConnection();
    const stmt = connection.prepare(sql);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

/**
 * Generate cache key from SQL and params
 * @param {string} sql 
 * @param {Array} params 
 * @returns {string}
 */
function getCacheKey(sql, params) {
    return sql + '|' + JSON.stringify(params);
}

/**
 * Get cached result or null if not cached/expired
 * @param {string} key 
 * @returns {*|null}
 */
function getCachedResult(key) {
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL) {
        cacheHits++;
        return cached.data;
    }
    cacheMisses++;
    return null;
}

/**
 * Cache a query result
 * @param {string} key 
 * @param {*} data 
 */
function setCachedResult(key, data) {
    // LRU-style: remove oldest if at capacity
    if (queryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
    }
    queryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidate all query cache (after writes)
 */
function invalidateQueryCache() {
    queryCache.clear();
}

/**
 * Helper to get single row (with caching for SELECT queries)
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Object|undefined}
 */
function get(sql, params = []) {
    // Only cache SELECT queries
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
    if (isSelect && !batchMode) {
        const cacheKey = getCacheKey(sql, params);
        const cached = getCachedResult(cacheKey);
        if (cached !== null) {
            return cached;
        }
    }
    
    const results = all(sql, params);
    const result = results[0];
    
    // Cache the result
    if (isSelect && !batchMode) {
        const cacheKey = getCacheKey(sql, params);
        setCachedResult(cacheKey, result);
    }
    
    return result;
}

/**
 * Helper to run INSERT/UPDATE/DELETE and return changes info
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Object}
 */
function run(sql, params = []) {
    const connection = getConnection();
    connection.run(sql, params);

    // Get last insert ID and changes count
    const lastId = connection.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] || 0;
    const changes = connection.getRowsModified();

    // Invalidate cache on writes
    invalidateQueryCache();
    
    // Auto-save after modifications (debounced)
    if (!batchMode) {
        saveDatabase();
    } else {
        batchOperations++;
    }

    return { lastInsertRowid: lastId, changes };
}

/**
 * Start batch mode (defer saves until endBatch)
 */
function startBatch() {
    batchMode = true;
    batchOperations = 0;
}

/**
 * End batch mode and save if there were operations
 */
function endBatch() {
    const ops = batchOperations;
    batchMode = false;
    batchOperations = 0;
    if (ops > 0) {
        saveDatabase();
    }
    return ops;
}

/**
 * Get cache stats for debugging
 * @returns {Object}
 */
function getCacheStats() {
    return {
        size: queryCache.size,
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: cacheHits + cacheMisses > 0 
            ? ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) + '%' 
            : '0%'
    };
}

/**
 * Helper to execute raw SQL (for migrations)
 * @param {string} sql 
 */
function exec(sql) {
    const connection = getConnection();
    connection.run(sql);
    saveDatabase();
}

module.exports = {
    initDatabase,
    getConnection,
    closeConnection,
    transaction,
    all,
    get,
    run,
    exec,
    saveDatabase,
    startBatch,
    endBatch,
    invalidateQueryCache,
    getCacheStats
};
