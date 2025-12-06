const { getConnection, exec } = require('./connection');
const logger = require('../utils/logger');

/**
 * Run all database migrations
 */
function runMigrations() {
    const db = getConnection();

    logger.info('Running database migrations...');

    // Users table
    exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            username TEXT NOT NULL,
            dcoin INTEGER DEFAULT 1000,
            total_earned INTEGER DEFAULT 1000,
            total_spent INTEGER DEFAULT 0,
            pity_counter INTEGER DEFAULT 0,
            daily_streak INTEGER DEFAULT 0,
            last_daily_claim TEXT,
            is_banned INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)`);

    // Runtime migration: add separate pity counters if missing
    try {
        const info = db.exec(`PRAGMA table_info(users)`);
        const cols = (info && info[0] && info[0].values) ? info[0].values.map(r => r[1]) : [];
        if (!cols.includes('pity4_counter')) {
            logger.info('Adding users.pity4_counter column...');
            exec(`ALTER TABLE users ADD COLUMN pity4_counter INTEGER DEFAULT 0`);
        }
        if (!cols.includes('pity5_counter')) {
            logger.info('Adding users.pity5_counter column...');
            exec(`ALTER TABLE users ADD COLUMN pity5_counter INTEGER DEFAULT 0`);
        }
        // Add 50/50 guarantee columns for proper gacha system
        if (!cols.includes('guarantee_5star')) {
            logger.info('Adding users.guarantee_5star column for 50/50 system...');
            exec(`ALTER TABLE users ADD COLUMN guarantee_5star INTEGER DEFAULT 0`);
        }
        if (!cols.includes('guarantee_4star')) {
            logger.info('Adding users.guarantee_4star column for 50/50 system...');
            exec(`ALTER TABLE users ADD COLUMN guarantee_4star INTEGER DEFAULT 0`);
        }
        // Add level system columns
        if (!cols.includes('level')) {
            logger.info('Adding users.level column for level system...');
            exec(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1`);
        }
        if (!cols.includes('total_xp')) {
            logger.info('Adding users.total_xp column for level system...');
            exec(`ALTER TABLE users ADD COLUMN total_xp INTEGER DEFAULT 0`);
        }
    } catch (e) {
        logger.error('Failed to add pity/guarantee counters to users table', { error: e.message });
    }

    // Items table
    exec(`
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            rarity TEXT CHECK(rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY')),
            type TEXT CHECK(type IN ('CONSUMABLE', 'COLLECTIBLE', 'EQUIPMENT', 'CURRENCY', 'BOOSTER', 'MATERIAL')),
            image_url TEXT,
            base_value INTEGER DEFAULT 0,
            metadata TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: extend CHECK constraint to include 'MATERIAL' if missing in existing schema
    try {
        const itemsRow = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='items'`);
        const itemsSql = itemsRow && itemsRow[0] && itemsRow[0].values && itemsRow[0].values[0] && itemsRow[0].values[0][0] ? itemsRow[0].values[0][0] : '';
        if (itemsSql && !itemsSql.includes("'MATERIAL'")) {
            logger.info('Migrating items CHECK constraint to include MATERIAL...');
            exec('PRAGMA foreign_keys=OFF');
            exec('BEGIN TRANSACTION');
            exec(`
                CREATE TABLE items_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    rarity TEXT CHECK(rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY')),
                    type TEXT CHECK(type IN ('CONSUMABLE', 'COLLECTIBLE', 'EQUIPMENT', 'CURRENCY', 'BOOSTER', 'MATERIAL')),
                    image_url TEXT,
                    base_value INTEGER DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            exec(`INSERT INTO items_new SELECT * FROM items`);
            exec(`DROP TABLE items`);
            exec(`ALTER TABLE items_new RENAME TO items`);
            exec(`CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity)`);
            exec(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)`);
            exec('COMMIT');
            exec('PRAGMA foreign_keys=ON');
            logger.info('Items table migration completed.');
        }
    } catch (e) {
        logger.error('Failed to migrate items table', { error: e.message });
        try { exec('ROLLBACK'); } catch (_) { }
        exec('PRAGMA foreign_keys=ON');
    }

    exec(`CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity)`);
    exec(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)`);

    // Inventories table
    exec(`
        CREATE TABLE IF NOT EXISTS inventories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            acquired_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            UNIQUE(user_id, item_id)
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_inventories_user ON inventories(user_id)`);

    // Transactions table
    exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT CHECK(type IN ('EARN', 'SPEND', 'TRANSFER', 'ADMIN_GIFT', 'GAME_WIN', 'GAME_LOSS')),
            amount INTEGER NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`);
    exec(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);

    // Gacha banners table
    exec(`
        CREATE TABLE IF NOT EXISTS gacha_banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            banner_type TEXT CHECK(banner_type IN ('STANDARD', 'LIMITED', 'PREMIUM', 'LUXURY', 'TOOL_KIT')) DEFAULT 'STANDARD',
            cost_per_pull INTEGER DEFAULT 100,
            start_date TEXT,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: extend CHECK constraint to include 'TOOL_KIT' if missing in existing schema
    try {
        const row = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='gacha_banners'`);
        const sql = row && row[0] && row[0].values && row[0].values[0] && row[0].values[0][0] ? row[0].values[0][0] : '';
        if (sql && !sql.includes("'TOOL_KIT'")) {
            logger.info('Migrating gacha_banners CHECK constraint to include TOOL_KIT...');
            exec('PRAGMA foreign_keys=OFF');
            exec('BEGIN TRANSACTION');
            exec(`
                CREATE TABLE gacha_banners_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    banner_type TEXT CHECK(banner_type IN ('STANDARD', 'LIMITED', 'PREMIUM', 'LUXURY', 'TOOL_KIT')) DEFAULT 'STANDARD',
                    cost_per_pull INTEGER DEFAULT 100,
                    start_date TEXT,
                    end_date TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            exec(`INSERT INTO gacha_banners_new (id, name, description, banner_type, cost_per_pull, start_date, end_date, is_active, created_at)
                  SELECT id, name, description, banner_type, cost_per_pull, start_date, end_date, is_active, created_at FROM gacha_banners`);
            exec('DROP TABLE gacha_banners');
            exec('ALTER TABLE gacha_banners_new RENAME TO gacha_banners');
            exec('COMMIT');
            exec('PRAGMA foreign_keys=ON');
            logger.info('gacha_banners constraint migration completed');
        }
    } catch (e) {
        logger.error('Failed to migrate gacha_banners constraint', { error: e.message });
    }

    // Gacha pools table
    exec(`
        CREATE TABLE IF NOT EXISTS gacha_pools (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            banner_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            drop_rate REAL NOT NULL,
            is_featured INTEGER DEFAULT 0,
            FOREIGN KEY (banner_id) REFERENCES gacha_banners(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
    `);

    // Gacha history table
    exec(`
        CREATE TABLE IF NOT EXISTS gacha_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            banner_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            pulled_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (banner_id) REFERENCES gacha_banners(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_gacha_history_user ON gacha_history(user_id)`);

    // Banner guarantees table - Per-banner guarantee tracking
    // Mỗi user có thể có guarantee riêng cho từng banner type
    exec(`
        CREATE TABLE IF NOT EXISTS banner_guarantees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            banner_type TEXT NOT NULL,
            guarantee_5star INTEGER DEFAULT 0,
            guarantee_4star INTEGER DEFAULT 0,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, banner_type)
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_banner_guarantees_user ON banner_guarantees(user_id)`);

    // Mailbox table
    exec(`
        CREATE TABLE IF NOT EXISTS mailbox (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            sender_type TEXT CHECK(sender_type IN ('SYSTEM', 'ADMIN', 'EVENT')) DEFAULT 'SYSTEM',
            subject TEXT NOT NULL,
            content TEXT,
            dcoin_reward INTEGER DEFAULT 0,
            item_rewards TEXT,
            is_read INTEGER DEFAULT 0,
            is_claimed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    exec(`CREATE INDEX IF NOT EXISTS idx_mailbox_user ON mailbox(user_id)`);
    exec(`CREATE INDEX IF NOT EXISTS idx_mailbox_claimed ON mailbox(is_claimed)`);

    // Game sessions table
    exec(`
        CREATE TABLE IF NOT EXISTS game_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_type TEXT CHECK(game_type IN ('BLACKJACK', 'ROULETTE', 'SLOTS', 'POKER', 'BACCARAT', 'COINFLIP', 'DICE', 'RPS')),
            game_state TEXT,
            bet_amount INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Reports table
    exec(`
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT NOT NULL,
            username TEXT NOT NULL,
            type TEXT CHECK(type IN ('FEEDBACK', 'BUG')),
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: Add sender_name column to mailbox table for user-to-user mail
    try {
        const mailboxInfo = db.exec(`PRAGMA table_info(mailbox)`);
        const mailboxCols = (mailboxInfo && mailboxInfo[0] && mailboxInfo[0].values) ? mailboxInfo[0].values.map(r => r[1]) : [];

        if (!mailboxCols.includes('sender_name')) {
            exec(`ALTER TABLE mailbox ADD COLUMN sender_name TEXT`);
            logger.info('Migration: Added sender_name column to mailbox table');
        }
    } catch (e) {
        // Table may not exist yet, will be created above
    }

    // Migration: Add cosmetic equipped columns to users table
    try {
        const usersInfo = db.exec(`PRAGMA table_info(users)`);
        const usersCols = (usersInfo && usersInfo[0] && usersInfo[0].values) ? usersInfo[0].values.map(r => r[1]) : [];

        if (!usersCols.includes('equipped_profile_theme')) {
            logger.info('Adding users.equipped_profile_theme column for cosmetic system...');
            exec(`ALTER TABLE users ADD COLUMN equipped_profile_theme TEXT DEFAULT NULL`);
        }
        if (!usersCols.includes('equipped_profile_border')) {
            logger.info('Adding users.equipped_profile_border column for cosmetic system...');
            exec(`ALTER TABLE users ADD COLUMN equipped_profile_border TEXT DEFAULT NULL`);
        }
        if (!usersCols.includes('equipped_profile_badge')) {
            logger.info('Adding users.equipped_profile_badge column for cosmetic system...');
            exec(`ALTER TABLE users ADD COLUMN equipped_profile_badge TEXT DEFAULT NULL`);
        }
        if (!usersCols.includes('equipped_home_theme')) {
            logger.info('Adding users.equipped_home_theme column for cosmetic system...');
            exec(`ALTER TABLE users ADD COLUMN equipped_home_theme TEXT DEFAULT NULL`);
        }
    } catch (e) {
        logger.error('Failed to add cosmetic columns to users table', { error: e.message });
    }

    // Migration: Extend items table CHECK constraint to include 'COSMETIC' if missing
    try {
        const itemsCheckRow = db.exec(`SELECT sql FROM sqlite_master WHERE type='table' AND name='items'`);
        const itemsCheckSql = itemsCheckRow && itemsCheckRow[0] && itemsCheckRow[0].values && itemsCheckRow[0].values[0] && itemsCheckRow[0].values[0][0] ? itemsCheckRow[0].values[0][0] : '';
        if (itemsCheckSql && !itemsCheckSql.includes("'COSMETIC'")) {
            logger.info('Migrating items CHECK constraint to include COSMETIC...');
            exec('PRAGMA foreign_keys=OFF');
            exec('BEGIN TRANSACTION');
            exec(`
                CREATE TABLE items_cosmetic_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    rarity TEXT CHECK(rarity IN ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY')),
                    type TEXT CHECK(type IN ('CONSUMABLE', 'COLLECTIBLE', 'EQUIPMENT', 'CURRENCY', 'BOOSTER', 'MATERIAL', 'COSMETIC')),
                    image_url TEXT,
                    base_value INTEGER DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            `);
            exec(`INSERT INTO items_cosmetic_new SELECT * FROM items`);
            exec(`DROP TABLE items`);
            exec(`ALTER TABLE items_cosmetic_new RENAME TO items`);
            exec(`CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity)`);
            exec(`CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)`);
            exec('COMMIT');
            exec('PRAGMA foreign_keys=ON');
            logger.info('Items table COSMETIC migration completed.');
        }
    } catch (e) {
        logger.error('Failed to migrate items table for COSMETIC', { error: e.message });
        try { exec('ROLLBACK'); } catch (_) { }
        exec('PRAGMA foreign_keys=ON');
    }

    logger.info('Database migrations completed successfully');
}

module.exports = { runMigrations };
