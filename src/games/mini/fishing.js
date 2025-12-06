const economyManager = require('../../managers/economyManager');
const inventoryManager = require('../../managers/inventoryManager');
const levelManager = require('../../managers/levelManager');
const userManager = require('../../managers/userManager');
const { get, all } = require('../../database/connection');
const { TRANSACTION_TYPES, DEFAULT_TOOLS } = require('../../utils/constants');
const { weightedRandom, randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * FISHING - Interactive Fishing Game
 * 
 * Gameplay:
 * 1. Cast - Chọn vị trí câu (ảnh hưởng loại cá)
 * 2. Wait - Đợi cá cắn câu (random 2-8 giây)
 * 3. Hook - Nhấn nút trong timing window (1-3 giây)
 * 4. Reel - Mini-game kéo cá (nhấn nút đúng nhịp)
 * 5. Catch - Nhận phần thưởng!
 */

// Cooldown ngắn hơn vì game interactive hơn
const COOLDOWN_MS = 20000; // 20 giây
const cooldowns = new Map();

// ============= MEMORY OPTIMIZATION =============
// Cleanup cooldowns every 10 minutes to prevent memory leak
const COOLDOWN_CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, timestamp] of cooldowns.entries()) {
        // Xóa cooldowns đã hết hạn quá 2 lần thời gian cooldown
        if (now - timestamp > COOLDOWN_MS * 2) {
            cooldowns.delete(key);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug('Fishing cooldowns cleanup', { cleaned, remaining: cooldowns.size });
    }
}, COOLDOWN_CLEANUP_INTERVAL);

// Active fishing sessions
const activeSessions = new Map();

// Fishing locations - ảnh hưởng loại cá và độ khó
const FISHING_LOCATIONS = {
    SHORE: {
        name: '🏖️ Bờ biển',
        description: 'Nơi an toàn cho người mới',
        difficulty: 1,
        rarityBonus: 0,
        fishTypes: ['COMMON', 'UNCOMMON'],
        hookWindow: 8000, // 8 giây để hook (tăng từ 4s)
        waitTime: { min: 2000, max: 5000 }
    },
    DEEP_SEA: {
        name: '🌊 Biển sâu',
        description: 'Cá to hơn nhưng khó bắt hơn',
        difficulty: 2,
        rarityBonus: 0.15,
        fishTypes: ['UNCOMMON', 'RARE', 'EPIC'],
        hookWindow: 7000, // 7 giây để hook (tăng từ 3s)
        waitTime: { min: 3000, max: 7000 }
    },
    OCEAN_ABYSS: {
        name: '🦑 Đại dương sâu thẳm',
        description: 'Cá huyền thoại ẩn náu nơi đây',
        difficulty: 3,
        rarityBonus: 0.30,
        fishTypes: ['RARE', 'EPIC', 'LEGENDARY'],
        hookWindow: 6000, // 6 giây để hook (tăng từ 2.5s)
        waitTime: { min: 4000, max: 10000 }
    }
};

// Loại cần câu và hiệu ứng
const ROD_TYPES = {
    COMMON: { name: 'Cần câu Tre', bonusRate: 0, bonusRarity: 0, hookBonus: 500 },
    UNCOMMON: { name: 'Cần câu Gỗ', bonusRate: 0.05, bonusRarity: 0.05, hookBonus: 700 },
    RARE: { name: 'Cần câu Carbon', bonusRate: 0.10, bonusRarity: 0.10, hookBonus: 1000 },
    EPIC: { name: 'Cần câu Titan', bonusRate: 0.20, bonusRarity: 0.20, hookBonus: 1500 },
    LEGENDARY: { name: 'Cần câu Huyền Thoại', bonusRate: 0.35, bonusRarity: 0.35, hookBonus: 2000 }
};

// Loại cá với giá trị
// Synced baseValue with database seeders for consistency
const FISH_TYPES = {
    SMALL_FISH: { name: 'Cá nhỏ', rarity: 'COMMON', baseValue: 5, emoji: '🐟', reelDifficulty: 1 },
    SARDINE: { name: 'Cá mòi', rarity: 'COMMON', baseValue: 8, emoji: '🐟', reelDifficulty: 1 },
    MACKEREL: { name: 'Cá thu', rarity: 'UNCOMMON', baseValue: 20, emoji: '🐠', reelDifficulty: 2 },
    SALMON: { name: 'Cá hồi', rarity: 'UNCOMMON', baseValue: 40, emoji: '🐠', reelDifficulty: 2 },
    TUNA: { name: 'Cá ngừ', rarity: 'RARE', baseValue: 80, emoji: '🐡', reelDifficulty: 3 },
    SWORDFISH: { name: 'Cá kiếm', rarity: 'RARE', baseValue: 150, emoji: '🗡️', reelDifficulty: 3 },
    OCTOPUS: { name: 'Bạch tuộc', rarity: 'EPIC', baseValue: 300, emoji: '🐙', reelDifficulty: 4 },
    GOLDEN_FISH: { name: 'Cá vàng huyền thoại', rarity: 'EPIC', baseValue: 600, emoji: '✨', reelDifficulty: 4 },
    SEA_DRAGON: { name: 'Rồng biển', rarity: 'LEGENDARY', baseValue: 1200, emoji: '🐲', reelDifficulty: 5 },
    KRAKEN: { name: 'Kraken con', rarity: 'LEGENDARY', baseValue: 2500, emoji: '🦑', reelDifficulty: 5 }
};

// Vật phẩm đặc biệt
// Synced baseValue with database seeders for consistency
const SPECIAL_CATCHES = {
    TREASURE_CHEST: { name: 'Rương kho báu', rarity: 'EPIC', baseValue: 500, emoji: '📦', isSpecial: true, reelDifficulty: 4 },
    ANCIENT_RELIC: { name: 'Cổ vật biển', rarity: 'LEGENDARY', baseValue: 2000, emoji: '🏺', isSpecial: true, reelDifficulty: 5 }
};

// Tỉ lệ drop cơ bản
const BASE_DROP_RATES = {
    COMMON: 0.50,
    UNCOMMON: 0.30,
    RARE: 0.15,
    EPIC: 0.04,
    LEGENDARY: 0.01
};

// Reel patterns - người chơi cần nhấn đúng pattern (simplified for easier gameplay)
const REEL_PATTERNS = {
    1: ['🎣'], // Dễ - 1 lần nhấn
    2: ['🎣', '🎣'], // 2 lần
    3: ['🎣', '🎣', '🎣'], // 3 lần đơn giản
    4: ['🎣', '⬆️', '🎣'], // 3 lần với 1 hướng (easier)
    5: ['🎣', '⬆️', '⬇️', '🎣'] // 4 lần cho legendary (easier)
};

/**
 * Lấy cần câu tốt nhất của người chơi
 */
function getBestRod(discordId) {
    userManager.ensureDefaultTools(discordId);

    const rodItems = all(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.type = 'EQUIPMENT'
        AND (i.name LIKE '%Cần câu%' OR i.name LIKE '%cần câu%')
        ORDER BY 
            CASE i.rarity 
                WHEN 'LEGENDARY' THEN 5
                WHEN 'EPIC' THEN 4
                WHEN 'RARE' THEN 3
                WHEN 'UNCOMMON' THEN 2
                WHEN 'COMMON' THEN 1
            END DESC
        LIMIT 1
    `, [discordId]);

    if (!rodItems || rodItems.length === 0) return null;

    const rod = rodItems[0];
    return {
        ...rod,
        bonus: ROD_TYPES[rod.rarity] || ROD_TYPES.COMMON
    };
}

/**
 * Lấy tất cả cần câu
 */
function getAllRods(discordId) {
    userManager.ensureDefaultTools(discordId);

    const rodItems = all(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.type = 'EQUIPMENT'
        AND (i.name LIKE '%Cần câu%' OR i.name LIKE '%cần câu%')
        ORDER BY 
            CASE i.rarity 
                WHEN 'LEGENDARY' THEN 5
                WHEN 'EPIC' THEN 4
                WHEN 'RARE' THEN 3
                WHEN 'UNCOMMON' THEN 2
                WHEN 'COMMON' THEN 1
            END DESC
    `, [discordId]);

    return rodItems.map(rod => ({
        ...rod,
        bonus: ROD_TYPES[rod.rarity] || ROD_TYPES.COMMON
    }));
}

/**
 * Lấy rod theo ID
 */
function getRodById(discordId, itemId) {
    const rod = get(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.id = ?
        AND i.type = 'EQUIPMENT'
        AND (i.name LIKE '%Cần câu%' OR i.name LIKE '%cần câu%')
    `, [discordId, itemId]);

    if (!rod) return null;

    return {
        ...rod,
        bonus: ROD_TYPES[rod.rarity] || ROD_TYPES.COMMON
    };
}

/**
 * Kiểm tra có cần câu không
 */
function hasRod(discordId) {
    return getBestRod(discordId) !== null;
}

/**
 * PHASE 1: Bắt đầu phiên câu cá - Chọn vị trí
 */
function startFishing(discordId, rodId = null) {
    let rod = rodId ? getRodById(discordId, rodId) : getBestRod(discordId);

    if (!rod) {
        return { error: 'no_rod' };
    }

    // Kiểm tra cooldown
    const lastFish = cooldowns.get(discordId);
    if (lastFish && Date.now() - lastFish < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastFish)) / 1000);
        return { error: 'cooldown', remaining };
    }

    // Tạo session mới
    const session = {
        discordId,
        rod,
        phase: 'SELECT_LOCATION',
        location: null,
        fish: null,
        hookStartTime: null,
        hookEndTime: null,
        reelProgress: 0,
        reelPattern: [],
        reelCurrentIndex: 0,
        startTime: Date.now(),
        bonusMultiplier: 1
    };

    activeSessions.set(discordId, session);

    logger.info('Fishing session started', { discordId, rod: rod.name });

    return {
        success: true,
        phase: 'SELECT_LOCATION',
        rod: { name: rod.name, rarity: rod.rarity },
        locations: FISHING_LOCATIONS
    };
}

/**
 * PHASE 2: Chọn vị trí câu và bắt đầu đợi
 */
function selectLocation(discordId, locationKey) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'SELECT_LOCATION') {
        return { error: 'invalid_session' };
    }

    const location = FISHING_LOCATIONS[locationKey.toUpperCase()];
    if (!location) {
        return { error: 'invalid_location' };
    }

    session.location = { key: locationKey.toUpperCase(), ...location };
    session.phase = 'WAITING';

    // Random thời gian đợi cá cắn
    const waitTime = randomInt(location.waitTime.min, location.waitTime.max);
    session.hookStartTime = Date.now() + waitTime;

    // Tính thời gian hook window (có bonus từ rod)
    const hookBonus = session.rod.bonus.hookBonus || 0;
    session.hookEndTime = session.hookStartTime + location.hookWindow + hookBonus;

    logger.info('Fishing location selected', { discordId, location: locationKey, waitTime });

    return {
        success: true,
        phase: 'WAITING',
        location: session.location,
        waitTime,
        message: `🎣 Đã thả câu tại ${location.name}...`
    };
}

/**
 * PHASE 3: Kiểm tra và xử lý Hook
 */
function attemptHook(discordId) {
    const session = activeSessions.get(discordId);
    if (!session) {
        return { error: 'no_session' };
    }

    const now = Date.now();

    if (session.phase === 'WAITING') {
        if (now < session.hookStartTime) {
            const timeLeft = Math.ceil((session.hookStartTime - now) / 1000);
            return {
                error: 'too_early',
                message: `⏳ Chưa có cá cắn! Đợi thêm...`,
                timeLeft
            };
        }
        session.phase = 'HOOK';
    }

    if (session.phase !== 'HOOK') {
        return { error: 'wrong_phase', currentPhase: session.phase };
    }

    if (now > session.hookEndTime) {
        activeSessions.delete(discordId);
        cooldowns.set(discordId, Date.now());

        return {
            error: 'fish_escaped',
            message: '💨 Cá đã thoát! Bạn nhấn quá chậm!'
        };
    }

    // Hook thành công! Chọn cá
    const fish = selectFish(session);
    session.fish = fish;
    session.phase = 'REEL';

    // Setup reel mini-game
    const pattern = REEL_PATTERNS[fish.reelDifficulty] || REEL_PATTERNS[1];
    session.reelPattern = pattern;
    session.reelCurrentIndex = 0;
    session.reelStartTime = Date.now();
    session.reelTimeLimit = 6000 + (pattern.length * 2500); // More time per button for easier gameplay (tăng từ 4000 + 2000)

    // Tính timing bonus
    const hookTiming = session.hookEndTime - now;
    const maxTiming = session.hookEndTime - session.hookStartTime;
    const timingPercent = maxTiming > 0 ? (hookTiming / maxTiming) * 100 : 0;

    // Lowered thresholds for easier bonus achievement
    if (timingPercent > 60) {
        session.bonusMultiplier = 1.5;
    } else if (timingPercent > 40) {
        session.bonusMultiplier = 1.25;
    }

    logger.info('Fish hooked', {
        discordId,
        fish: fish.name,
        timingPercent: timingPercent.toFixed(1),
        bonus: session.bonusMultiplier
    });

    return {
        success: true,
        phase: 'REEL',
        fish: {
            name: fish.name,
            emoji: fish.emoji,
            rarity: fish.rarity
        },
        reelPattern: pattern,
        timingBonus: session.bonusMultiplier > 1,
        bonusMultiplier: session.bonusMultiplier,
        message: `🐟 Có cá cắn! ${fish.emoji} **${fish.name}**!`,
        timeLimit: session.reelTimeLimit
    };
}

/**
 * PHASE 4: Xử lý Reel action
 */
function reelAction(discordId, action) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'REEL') {
        return { error: 'invalid_session' };
    }

    const now = Date.now();

    if (now > session.reelStartTime + session.reelTimeLimit) {
        activeSessions.delete(discordId);
        cooldowns.set(discordId, Date.now());

        return {
            error: 'timeout',
            message: '⏰ Hết thời gian! Cá đã thoát!'
        };
    }

    const expectedAction = session.reelPattern[session.reelCurrentIndex];

    if (action !== expectedAction) {
        session.bonusMultiplier = Math.max(1, session.bonusMultiplier - 0.25);

        return {
            success: false,
            message: `❌ Sai nút! Cần nhấn: ${expectedAction}`,
            progress: session.reelCurrentIndex,
            total: session.reelPattern.length,
            currentExpected: expectedAction
        };
    }

    session.reelCurrentIndex++;

    if (session.reelCurrentIndex >= session.reelPattern.length) {
        return completeFishing(discordId);
    }

    const nextAction = session.reelPattern[session.reelCurrentIndex];
    const timeRemaining = Math.ceil((session.reelStartTime + session.reelTimeLimit - now) / 1000);

    return {
        success: true,
        phase: 'REEL',
        message: `✅ Đúng rồi! Tiếp tục...`,
        progress: session.reelCurrentIndex,
        total: session.reelPattern.length,
        nextAction,
        timeRemaining
    };
}

/**
 * PHASE 5: Hoàn thành câu cá
 */
function completeFishing(discordId) {
    const session = activeSessions.get(discordId);
    if (!session) {
        return { error: 'no_session' };
    }

    const fish = session.fish;
    const rod = session.rod;
    const bonusMultiplier = session.bonusMultiplier;

    // Tính số lượng
    const bonusRate = rod.bonus.bonusRate;
    const baseQuantity = 1;
    const bonusQuantity = Math.random() < bonusRate ? 1 : 0;
    const perfectBonus = bonusMultiplier >= 1.5 ? 1 : 0;
    const quantity = baseQuantity + bonusQuantity + perfectBonus;

    // Tìm item trong database
    const fishItem = get(`SELECT * FROM items WHERE name = ? AND type = 'MATERIAL'`, [fish.name]);

    let dcoinReward = 0;
    if (fishItem) {
        inventoryManager.addItem(discordId, fishItem.id, quantity);
    } else {
        dcoinReward = Math.floor(fish.baseValue * quantity * bonusMultiplier);
        economyManager.addDCoin(discordId, dcoinReward, TRANSACTION_TYPES.GAME_WIN, `Câu cá: ${fish.name}`);
        logger.warn('Fish item not found in database', { fishName: fish.name, dcoinReward });
    }

    // Award XP
    const xpResult = levelManager.awardXP(discordId, 'FISHING');

    // Set cooldown và cleanup
    cooldowns.set(discordId, Date.now());
    activeSessions.delete(discordId);

    logger.info('Fishing completed', {
        discordId,
        fish: fish.name,
        quantity,
        bonusMultiplier,
        rod: rod.name
    });

    return {
        success: true,
        phase: 'COMPLETE',
        catch: {
            ...fish,
            itemId: fishItem?.id
        },
        quantity,
        dcoinReward,
        bonusMultiplier,
        isPerfect: bonusMultiplier >= 1.5,
        rod: { name: rod.name, rarity: rod.rarity },
        location: session.location,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null,
        message: bonusMultiplier >= 1.5
            ? `🎉 PERFECT! Bắt được ${fish.emoji} **${fish.name}** x${quantity}!`
            : `🎣 Bắt được ${fish.emoji} **${fish.name}** x${quantity}!`
    };
}

/**
 * Chọn cá dựa trên location và rod
 */
function selectFish(session) {
    const location = session.location;
    const rod = session.rod;
    const bonusRarity = rod.bonus.bonusRarity + location.rarityBonus;

    const adjustedRates = {};
    let remaining = 1.0;

    for (const rarity of ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']) {
        if (!location.fishTypes.includes(rarity)) {
            adjustedRates[rarity] = 0;
            continue;
        }

        let rate = BASE_DROP_RATES[rarity];
        if (rarity !== 'COMMON') {
            rate = rate * (1 + bonusRarity);
        }
        adjustedRates[rarity] = Math.min(rate, remaining);
        remaining -= adjustedRates[rarity];
    }

    if (location.fishTypes.includes('COMMON')) {
        adjustedRates['COMMON'] = Math.max(0.1, remaining);
    }

    const roll = Math.random();
    let cumulativeRate = 0;
    let selectedRarity = 'COMMON';

    for (const rarity of ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']) {
        if (adjustedRates[rarity] === 0) continue;
        cumulativeRate += adjustedRates[rarity];
        if (roll < cumulativeRate) {
            selectedRarity = rarity;
            break;
        }
    }

    // 5% cơ hội vật phẩm đặc biệt
    const isSpecialCatch = (selectedRarity === 'EPIC' || selectedRarity === 'LEGENDARY');
    const gotSpecial = isSpecialCatch && Math.random() < 0.05;

    if (gotSpecial) {
        const specialItems = Object.values(SPECIAL_CATCHES).filter(item => item.rarity === selectedRarity);
        if (specialItems.length > 0) {
            return specialItems[Math.floor(Math.random() * specialItems.length)];
        }
    }

    const fishOfRarity = Object.values(FISH_TYPES).filter(fish => fish.rarity === selectedRarity);
    return fishOfRarity[Math.floor(Math.random() * fishOfRarity.length)];
}

/**
 * Lấy session hiện tại
 */
function getSession(discordId) {
    return activeSessions.get(discordId) || null;
}

/**
 * Hủy session
 */
function cancelSession(discordId) {
    activeSessions.delete(discordId);
}

/**
 * Lấy thông tin fishing
 */
function getFishingInfo(discordId) {
    const rod = getBestRod(discordId);
    const cooldownRemaining = getCooldown(discordId);
    const session = getSession(discordId);

    return {
        hasRod: rod !== null,
        rod: rod ? {
            name: rod.name,
            rarity: rod.rarity,
            bonus: rod.bonus
        } : null,
        cooldown: cooldownRemaining,
        activeSession: session !== null,
        sessionPhase: session?.phase || null,
        locations: FISHING_LOCATIONS,
        fishTypes: Object.entries(FISH_TYPES).map(([key, fish]) => ({
            key,
            ...fish
        }))
    };
}

/**
 * Lấy cooldown còn lại
 */
function getCooldown(discordId) {
    const lastFish = cooldowns.get(discordId);
    if (!lastFish) return 0;

    const remaining = COOLDOWN_MS - (Date.now() - lastFish);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Kiểm tra trạng thái hook
 */
function checkHookReady(discordId) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'WAITING') {
        return { ready: false };
    }

    const now = Date.now();
    if (now >= session.hookStartTime && now <= session.hookEndTime) {
        return {
            ready: true,
            timeRemaining: Math.ceil((session.hookEndTime - now) / 1000)
        };
    }

    if (now > session.hookEndTime) {
        activeSessions.delete(discordId);
        cooldowns.set(discordId, Date.now());
        return { ready: false, expired: true };
    }

    return {
        ready: false,
        waitTimeRemaining: Math.ceil((session.hookStartTime - now) / 1000)
    };
}

module.exports = {
    // Core functions
    startFishing,
    selectLocation,
    attemptHook,
    reelAction,
    completeFishing,

    // Session management
    getSession,
    cancelSession,
    checkHookReady,

    // Info functions
    hasRod,
    getBestRod,
    getAllRods,
    getRodById,
    getFishingInfo,
    getCooldown,

    // Constants
    FISHING_LOCATIONS,
    FISH_TYPES,
    ROD_TYPES,
    SPECIAL_CATCHES,
    REEL_PATTERNS
};
