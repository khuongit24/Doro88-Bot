/**
 * GACHA MANAGER - Hệ thống quản lý Gacha
 * 
 * CƠ CHẾ GACHA:
 * 1. PITY SYSTEM (Soft Pity + Hard Pity)
 *    - 5★: Base rate 0.6%, Soft pity từ pull 74, Hard pity tại pull 90
 *    - 4★: Base rate 5.1%, Hard pity tại pull 10
 * 
 * 2. UP SYSTEM (50/50 hoặc 75/25)
 *    - Standard/Limited/Premium/Luxury: 50/50
 *    - Tool & Kit: 75/25 (ưu đãi)
 * 
 * 3. BẢO HIỂM GACHA
 *    - Nếu thua UP → Lần 5★/4★ tiếp theo ĐẢM BẢO là UP item
 * 
 * 4. BANNER-SPECIFIC ITEMS
 *    - Mỗi banner có pool vật phẩm riêng biệt từ file tương ứng
 */

const { transaction, all, get, run } = require('../../database/connection');
const userManager = require('../../managers/userManager');
const economyManager = require('../../managers/economyManager');
const inventoryManager = require('../../managers/inventoryManager');
const levelManager = require('../../managers/levelManager');
const logger = require('../../utils/logger');
const { TRANSACTION_TYPES } = require('../../utils/constants');

// Import banner items từ thư mục gachaitems
const gachaItems = require('./gachaitems');

// ============= GACHA PITY SYSTEM CONSTANTS =============
const BASE_5_STAR_RATE = 0.006;     // 0.6%
const BASE_4_STAR_RATE = 0.051;     // 5.1%
const HARD_PITY_5_STAR = 90;        // Guaranteed 5-star at 90 pulls
const HARD_PITY_4_STAR = 10;        // Guaranteed 4-star at 10 pulls
const SOFT_PITY_START = 74;         // Soft pity begins at pull 74
const SOFT_PITY_RATE_INCREASE = 0.06;  // ~6% increase per pull after 74

// ============= BANNER COST CONSTANTS =============
// ENTERTAINMENT MODE v3.0 - Giảm giá để chơi vui hơn
// Target: Đạt pity trong ~15-30 ngày thay vì 44-176 ngày
const BANNER_COSTS = {
    'STANDARD': 150,    // Giảm để dễ pull hơn (~15 ngày đến pity)
    'LIMITED': 200,     // Giảm (~20 ngày đến pity)
    'PREMIUM': 300,     // Giảm (~30 ngày đến pity)
    'LUXURY': 500,      // Giảm (~50 ngày đến pity)
    'TOOL_KIT': 120     // Giảm (~12 ngày đến pity)
};

// ============= PER-BANNER GUARANTEE HELPERS =============

/**
 * Get per-banner guarantee status for a user
 * @param {number} userId - Database user ID
 * @param {string} bannerType - Banner type (STANDARD, LIMITED, TOOL_KIT, etc.)
 * @returns {Object} - { guarantee5Star: boolean, guarantee4Star: boolean }
 */
function getBannerGuarantee(userId, bannerType) {
    const row = get(`
        SELECT guarantee_5star, guarantee_4star 
        FROM banner_guarantees 
        WHERE user_id = ? AND banner_type = ?
    `, [userId, bannerType]);

    return {
        guarantee5Star: row?.guarantee_5star === 1,
        guarantee4Star: row?.guarantee_4star === 1
    };
}

/**
 * Set per-banner guarantee status for a user
 * @param {number} userId - Database user ID
 * @param {string} bannerType - Banner type
 * @param {string} rarity - 'LEGENDARY' or 'EPIC'
 * @param {boolean} value - true to set guarantee, false to reset
 */
function setBannerGuarantee(userId, bannerType, rarity, value) {
    const field = rarity === 'LEGENDARY' ? 'guarantee_5star' : 'guarantee_4star';
    const intValue = value ? 1 : 0;

    // Upsert: Insert or update on conflict
    run(`
        INSERT INTO banner_guarantees (user_id, banner_type, ${field}, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, banner_type) 
        DO UPDATE SET ${field} = ?, updated_at = CURRENT_TIMESTAMP
    `, [userId, bannerType, intValue, intValue]);
}

/**
 * Get all active banners
 * @returns {Array}
 */
function getActiveBanners() {
    const now = new Date().toISOString();

    const banners = all(`
        SELECT * FROM gacha_banners
        WHERE is_active = 1
        AND (start_date IS NULL OR start_date <= ?)
        AND (end_date IS NULL OR end_date >= ?)
    `, [now, now]);

    return banners.map(b => ({
        ...b,
        cost_per_pull: BANNER_COSTS[b.banner_type] || 160
    }));
}

/**
 * Get banner by ID
 * @param {number} bannerId
 * @returns {Object|null}
 */
function getBannerById(bannerId) {
    const b = get('SELECT * FROM gacha_banners WHERE id = ?', [bannerId]);
    if (!b) return null;

    return {
        ...b,
        cost_per_pull: BANNER_COSTS[b.banner_type] || 160
    };
}

/**
 * Get banner pool from file-based system
 * MỖI BANNER LẤY VẬT PHẨM TỪ FILE RIÊNG CỦA NÓ
 * @param {number} bannerId
 * @returns {Array}
 */
function getBannerPool(bannerId) {
    const banner = getBannerById(bannerId);
    if (!banner) return [];

    // Lấy items từ file tương ứng với banner type
    return gachaItems.getAllItems(banner.banner_type);
}

/**
 * Calculate the actual 5-star rate based on pity counter
 * Implements soft pity system like Genshin Impact
 * @param {number} pity5 - Current 5-star pity counter (0-89)
 * @returns {number} - Probability (0-1) of getting a 5-star
 */
function calculate5StarRate(pity5) {
    // Hard pity: guaranteed at 90 (counter = 89 means this is the 90th pull)
    if (pity5 >= HARD_PITY_5_STAR - 1) {
        return 1.0;
    }

    // Before soft pity: base rate only
    if (pity5 < SOFT_PITY_START - 1) {
        return BASE_5_STAR_RATE;
    }

    // Soft pity zone (pull 74-89): rate increases progressively
    // Formula: base_rate + (pulls_into_soft_pity * rate_increase)
    // At pull 74 (pity5=73): base + 0*increase = 0.6%
    // At pull 75 (pity5=74): base + 1*increase = ~6.6%
    // ... continues to increase
    const pullsIntoSoftPity = pity5 - (SOFT_PITY_START - 2);
    const boostedRate = BASE_5_STAR_RATE + (pullsIntoSoftPity * SOFT_PITY_RATE_INCREASE);

    // Cap at 100%
    return Math.min(boostedRate, 1.0);
}

/**
 * Calculate the actual 4-star rate based on pity counter
 * @param {number} pity4 - Current 4-star pity counter (0-9)
 * @returns {number} - Probability (0-1) of getting a 4-star
 */
function calculate4StarRate(pity4) {
    // Hard pity: guaranteed at 10 (counter = 9 means this is the 10th pull)
    if (pity4 >= HARD_PITY_4_STAR - 1) {
        return 1.0;
    }

    // Base rate with slight increase as approaching pity
    // Soft pity for 4-star starts around pull 8-9
    if (pity4 >= 7) {
        // Increase rate from ~5.1% to ~50% at pull 9
        const boost = (pity4 - 6) * 0.15;
        return Math.min(BASE_4_STAR_RATE + boost, 1.0);
    }

    return BASE_4_STAR_RATE;
}

/**
 * Decide rarity tier using base rates and pity guarantees
 * @param {number} pity4 - Current 4-star pity counter
 * @param {number} pity5 - Current 5-star pity counter
 * @param {string} bannerType - Banner type for custom rates
 * @returns {('LEGENDARY'|'EPIC'|'RARE'|'UNCOMMON'|'COMMON')} target rarity
 */
function decideRarityTier(pity4, pity5, bannerType) {
    const rate5Star = calculate5StarRate(pity5);
    const rate4Star = calculate4StarRate(pity4);

    // Get banner-specific rates
    const bannerRates = gachaItems.getRarityRates(bannerType);

    const roll = Math.random();

    // Check for 5-star first (LEGENDARY)
    if (roll < rate5Star) {
        return 'LEGENDARY';
    }

    // Check for 4-star (EPIC)
    if (roll < rate5Star + rate4Star) {
        return 'EPIC';
    }

    // For lower tiers, use banner-specific rates
    const remainingRoll = Math.random();
    const normalizedTotal = bannerRates.RARE + bannerRates.UNCOMMON + bannerRates.COMMON;
    const rareRate = bannerRates.RARE / normalizedTotal;
    const uncommonRate = bannerRates.UNCOMMON / normalizedTotal;

    if (remainingRoll < rareRate) {
        return 'RARE';
    } else if (remainingRoll < rareRate + uncommonRate) {
        return 'UNCOMMON';
    }

    return 'COMMON';
}

/**
 * Select an item from candidates using weighted random based on drop_rate
 * @param {Array} candidates - Array of items to choose from
 * @returns {Object} - Selected item
 */
function selectWeightedItem(candidates) {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return { ...candidates[0] };

    const total = candidates.reduce((sum, it) => sum + (Number(it.drop_rate) || 1), 0);
    let rnd = Math.random() * total;

    for (const item of candidates) {
        const weight = Number(item.drop_rate) || 1;
        rnd -= weight;
        if (rnd <= 0) return { ...item };
    }

    return { ...candidates[0] };
}

/**
 * Handle UP system selection for high rarity items
 * QUAN TRỌNG: Đây là core logic của hệ thống UP và bảo hiểm gacha
 * 
 * @param {string} bannerType - Banner type
 * @param {string} rarity - Target rarity ('LEGENDARY' or 'EPIC')
 * @param {Object} user - User object for guarantee tracking
 * @returns {Object} - The selected item with metadata
 */
function selectItemWithUpSystem(bannerType, rarity, user) {
    const featuredItems = gachaItems.getFeaturedItems(bannerType, rarity);
    const nonFeaturedItems = gachaItems.getNonFeaturedItems(bannerType, rarity);

    // Nếu không có featured items, chọn trực tiếp từ pool
    if (featuredItems.length === 0) {
        const allItems = gachaItems.getItemsByRarity(bannerType, rarity);
        return selectWeightedItem(allItems);
    }

    // Nếu không có non-featured, trả về featured (luôn thắng UP)
    if (nonFeaturedItems.length === 0) {
        const selected = selectWeightedItem(featuredItems);
        return { ...selected, wonUp: true };
    }

    // ============= LOGIC BẢO HIỂM GACHA (PER-BANNER) =============
    // Mỗi banner có guarantee riêng biệt
    const bannerGuarantee = getBannerGuarantee(user.id, bannerType);
    const hasGuarantee = rarity === 'LEGENDARY' ? bannerGuarantee.guarantee5Star : bannerGuarantee.guarantee4Star;

    if (hasGuarantee) {
        // User đã thua UP lần trước → ĐẢM BẢO UP lần này!
        logger.info('Banner guarantee activated!', {
            discordId: user.discord_id,
            rarity,
            bannerType
        });
        const selected = selectWeightedItem(featuredItems);
        return { ...selected, wonUp: true, guaranteeUsed: true };
    }

    // ============= LOGIC UP RATE (50/50 hoặc 75/25) =============
    const upRate = gachaItems.getUpRate(bannerType);
    const roll = Math.random();

    if (roll < upRate) {
        // Thắng UP!
        const selected = selectWeightedItem(featuredItems);
        return { ...selected, wonUp: true };
    } else {
        // Thua UP → Lần sau đảm bảo UP
        const selected = selectWeightedItem(nonFeaturedItems);
        return { ...selected, wonUp: false, lostUp: true };
    }
}

/**
 * Roll for an item from banner's pool
 * @param {string} bannerType - Banner type
 * @param {number} pity4 - User's 4-star pity counter
 * @param {number} pity5 - User's 5-star pity counter
 * @param {Object} user - User object for UP tracking
 * @returns {Object} - Selected item with metadata
 */
function rollItem(bannerType, pity4, pity5, user) {
    const rarity = decideRarityTier(pity4, pity5, bannerType);

    let selectedItem;

    if (rarity === 'LEGENDARY' || rarity === 'EPIC') {
        // High rarity: apply UP system
        selectedItem = selectItemWithUpSystem(bannerType, rarity, user);
    } else {
        // Lower rarity: select directly from pool
        const candidates = gachaItems.getItemsByRarity(bannerType, rarity);
        selectedItem = selectWeightedItem(candidates);
    }

    if (!selectedItem) {
        // Ultimate fallback
        const allItems = gachaItems.getAllItems(bannerType);
        selectedItem = allItems[Math.floor(Math.random() * allItems.length)];
    }

    return { ...selectedItem, rarity };
}

/**
 * Ensure item exists in database and return its ID
 * @param {Object} item - Item object from banner file
 * @returns {number|null} - Item ID or null if failed
 */
function ensureItemInDatabase(item) {
    // Tìm item theo tên
    let dbItem = get('SELECT id FROM items WHERE name = ?', [item.name]);

    if (dbItem) {
        return dbItem.id;
    }

    // Nếu chưa có, tạo mới
    try {
        const result = run(`
            INSERT INTO items (name, description, rarity, type, base_value, metadata)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            item.name,
            item.description,
            item.rarity,
            item.type || 'COLLECTIBLE',
            item.base_value || 0,
            item.metadata ? JSON.stringify(item.metadata) : null
        ]);

        return result.lastInsertRowid;
    } catch (error) {
        logger.error('Failed to insert item', { item: item.name, error: error.message });
        return null;
    }
}

/**
 * Execute single pull
 * @param {string} discordId
 * @param {number} bannerId
 * @returns {Object|null}
 */
function pull(discordId, bannerId) {
    const banner = getBannerById(bannerId);
    const user = userManager.getUser(discordId);

    if (!banner || !user) return null;

    const costPerPull = banner.cost_per_pull;

    // Check balance
    if (!economyManager.canAfford(discordId, costPerPull)) {
        return { error: 'insufficient_balance', required: costPerPull };
    }

    const pool = getBannerPool(bannerId);
    if (pool.length === 0) return { error: 'empty_pool' };

    try {
        const result = transaction(() => {
            // Deduct cost
            economyManager.deductDCoin(discordId, costPerPull, TRANSACTION_TYPES.SPEND, `Gacha: ${banner.name}`);

            // Get current pity counters
            const pity4 = Number(user.pity4_counter || 0);
            const pity5 = Number(user.pity5_counter || 0);

            // Roll item using file-based system
            const item = rollItem(banner.banner_type, pity4, pity5, user);

            // Calculate new pity values
            let newPity4 = pity4 + 1;
            let newPity5 = pity5 + 1;
            let updates = {};

            if (item.rarity === 'LEGENDARY') {
                // Got 5★: reset BOTH pity counters
                newPity4 = 0;
                newPity5 = 0;

                // Handle per-banner guarantee flag
                if (item.lostUp) {
                    // Thua UP → Set guarantee cho banner này cho lần sau
                    setBannerGuarantee(user.id, banner.banner_type, 'LEGENDARY', true);
                } else {
                    // Thắng UP hoặc dùng guarantee → Reset guarantee của banner này
                    setBannerGuarantee(user.id, banner.banner_type, 'LEGENDARY', false);
                }
            } else if (item.rarity === 'EPIC') {
                // Got 4★: reset only 4★ pity
                newPity4 = 0;

                // Handle 4★ per-banner guarantee
                if (item.lostUp) {
                    setBannerGuarantee(user.id, banner.banner_type, 'EPIC', true);
                } else {
                    setBannerGuarantee(user.id, banner.banner_type, 'EPIC', false);
                }
            }

            // Update pity counters (global, không theo banner)
            updates.pity4_counter = newPity4;
            updates.pity5_counter = newPity5;
            userManager.updateUser(discordId, updates);

            // Tìm hoặc tạo item trong database
            const itemId = ensureItemInDatabase(item);

            if (!itemId) {
                throw new Error(`Failed to ensure item in database: ${item.name}`);
            }

            // Add item to inventory
            const added = inventoryManager.addItem(discordId, itemId, 1);
            if (!added) {
                throw new Error(`Failed to add item ${itemId} to inventory`);
            }

            // Record history
            run(`
                INSERT INTO gacha_history (user_id, banner_id, item_id)
                VALUES (?, ?, ?)
            `, [user.id, bannerId, itemId]);

            // Logging với thông tin UP/guarantee
            logger.info('Gacha pull', {
                discordId,
                bannerId,
                bannerType: banner.banner_type,
                itemId,
                itemName: item.name,
                rarity: item.rarity,
                wonUp: item.wonUp || false,
                lostUp: item.lostUp || false,
                guaranteeUsed: item.guaranteeUsed || false,
                pity4: newPity4,
                pity5: newPity5,
                rate5Star: (calculate5StarRate(pity5) * 100).toFixed(2) + '%'
            });

            // Determine XP action
            let xpAction = 'GACHA_PULL';
            if (item.rarity === 'LEGENDARY') {
                xpAction = 'GACHA_5STAR';
            } else if (item.rarity === 'EPIC') {
                xpAction = 'GACHA_4STAR';
            }

            return {
                item: { ...item, id: itemId },
                newPity4,
                newPity5,
                costPerPull,
                xpAction
            };
        });

        // Award XP outside transaction
        const xpResult = levelManager.awardXP(discordId, result.xpAction);

        return {
            item: result.item,
            pity4Counter: result.newPity4,
            pity5Counter: result.newPity5,
            cost: result.costPerPull,
            xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
            levelUp: xpResult.leveledUp || false,
            newLevel: xpResult.newLevel || null,
            wonUp: result.item.wonUp || false,
            lostUp: result.item.lostUp || false,
            guaranteeUsed: result.item.guaranteeUsed || false
        };
    } catch (error) {
        logger.error('Gacha pull error', { discordId, bannerId, error: error.message });
        return { error: 'invalid_state', message: error.message };
    }
}

/**
 * Execute 10 pulls
 * @param {string} discordId
 * @param {number} bannerId
 * @returns {Object|null}
 */
function pull10(discordId, bannerId) {
    const { startBatch, endBatch } = require('../../database/connection');

    const banner = getBannerById(bannerId);
    const user = userManager.getUser(discordId);

    if (!banner || !user) return null;

    const totalCost = banner.cost_per_pull * 10;

    // Check balance
    if (!economyManager.canAfford(discordId, totalCost)) {
        return { error: 'insufficient_balance', required: totalCost };
    }

    const results = [];
    let wonUpCount = 0;
    let lostUpCount = 0;

    // ============= PERFORMANCE OPTIMIZATION =============
    // Use batch mode to defer database saves until all 10 pulls complete
    // This reduces I/O from 10 separate saves to 1 combined save
    startBatch();

    try {
        for (let i = 0; i < 10; i++) {
            const result = pull(discordId, bannerId);
            if (result && !result.error) {
                results.push(result);
                if (result.wonUp) wonUpCount++;
                if (result.lostUp) lostUpCount++;
            }
        }
    } finally {
        // Always end batch, even if error occurred
        endBatch();
    }

    // Award bonus XP for 10-pull
    const xpResult = levelManager.awardXP(discordId, 'GACHA_PULL_10');

    // Get updated user state
    const updatedUser = userManager.getUser(discordId);

    return {
        items: results.map(r => r.item),
        totalCost,
        pity4Counter: updatedUser?.pity4_counter || 0,
        pity5Counter: updatedUser?.pity5_counter || 0,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null,
        wonUpCount,
        lostUpCount
    };
}

/**
 * Get user's gacha history
 * @param {string} discordId
 * @param {number} limit
 * @returns {Array}
 */
function getHistory(discordId, limit = 20) {
    const user = userManager.getUser(discordId);
    if (!user) return [];

    return all(`
        SELECT gh.*, i.name, i.rarity, gb.name as banner_name
        FROM gacha_history gh
        JOIN items i ON gh.item_id = i.id
        JOIN gacha_banners gb ON gh.banner_id = gb.id
        WHERE gh.user_id = ?
        ORDER BY gh.pulled_at DESC
        LIMIT ?
    `, [user.id, limit]);
}

/**
 * Get user's pity counter
 * @param {string} discordId
 * @returns {Object}
 */
function getPityCounter(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return { pity4: 0, pity5: 0, rate5Star: BASE_5_STAR_RATE, rate4Star: BASE_4_STAR_RATE };

    const pity4 = Number(user.pity4_counter || 0);
    const pity5 = Number(user.pity5_counter || 0);

    return {
        pity4,
        pity5,
        rate5Star: calculate5StarRate(pity5),
        rate4Star: calculate4StarRate(pity4),
        guarantee5Star: user.guarantee_5star === 1,
        guarantee4Star: user.guarantee_4star === 1
    };
}

/**
 * Reset pity counter
 * @param {string} discordId
 * @returns {boolean}
 */
function resetPityCounter(discordId) {
    return userManager.updateUser(discordId, {
        pity4_counter: 0,
        pity5_counter: 0,
        guarantee_5star: 0,
        guarantee_4star: 0
    });
}

/**
 * Get current 5-star rate for display purposes
 * @param {string} discordId
 * @returns {number} - Rate as percentage (e.g., 0.6 for 0.6%)
 */
function getCurrentRate(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return BASE_5_STAR_RATE * 100;

    const pity5 = Number(user.pity5_counter || 0);
    return calculate5StarRate(pity5) * 100;
}

/**
 * Get banner details with UP item information
 * @param {number} bannerId
 * @returns {Object|null}
 */
function getBannerDetails(bannerId) {
    const banner = getBannerById(bannerId);
    if (!banner) return null;

    const bannerInfo = gachaItems.getBannerInfo(banner.banner_type);
    const upItem = gachaItems.getUpItem(banner.banner_type);
    const pool = getBannerPool(bannerId);

    // Count items by rarity
    const itemCounts = {};
    for (const item of pool) {
        itemCounts[item.rarity] = (itemCounts[item.rarity] || 0) + 1;
    }

    return {
        ...banner,
        bannerInfo,
        upItem: Array.isArray(upItem) ? upItem : [upItem],
        upRate: bannerInfo?.up_rate || 0.5,
        rates: bannerInfo?.rates || {},
        itemCounts,
        totalItems: pool.length
    };
}

module.exports = {
    // Main functions
    getActiveBanners,
    getBannerById,
    getBannerPool,
    getBannerDetails,
    pull,
    pull10,
    getHistory,
    getPityCounter,
    resetPityCounter,
    getCurrentRate,
    getBannerGuarantee,

    // Rate calculation exports
    calculate5StarRate,
    calculate4StarRate,

    // Constants exports
    BASE_5_STAR_RATE,
    BASE_4_STAR_RATE,
    SOFT_PITY_START,
    HARD_PITY_5_STAR,
    HARD_PITY_4_STAR,
    BANNER_COSTS
};
