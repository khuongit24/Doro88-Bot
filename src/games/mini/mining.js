const economyManager = require('../../managers/economyManager');
const inventoryManager = require('../../managers/inventoryManager');
const levelManager = require('../../managers/levelManager');
const userManager = require('../../managers/userManager');
const { get, all } = require('../../database/connection');
const { TRANSACTION_TYPES, DEFAULT_TOOLS } = require('../../utils/constants');
const { weightedRandom, randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * MINING - Interactive Mining Game
 * 
 * Gameplay:
 * 1. Choose Location - Chọn mỏ (ảnh hưởng loại quặng)
 * 2. Dig - Đào nhiều lần với combo system
 * 3. Find Vein - Tìm thấy mạch quặng, bonus multiplier
 * 4. Extract - Mini-game timing để lấy quặng
 * 5. Collect - Nhận phần thưởng với combo bonus!
 */

// Cooldown ngắn để gameplay nhanh hơn
const COOLDOWN_MS = 10000; // 10 giây (giảm từ 20s)
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
        logger.debug('Mining cooldowns cleanup', { cleaned, remaining: cooldowns.size });
    }
}, COOLDOWN_CLEANUP_INTERVAL);

// Active mining sessions
const activeSessions = new Map();

// Mining locations - ảnh hưởng loại quặng
// CẢI TIẾ0N: Tăng combo windows để dễ chơi hơn
const MINING_LOCATIONS = {
    CAVE: {
        name: '🕳️ Hang động',
        description: 'Nơi an toàn cho người mới',
        difficulty: 1,
        rarityBonus: 0,
        oreTypes: ['COMMON', 'UNCOMMON'],
        digCount: 3, // Số lần đào mỗi session
        comboWindow: 10000 // 10 giây để combo (tăng từ 5s)
    },
    DEEP_MINE: {
        name: '⛏️ Mỏ sâu',
        description: 'Quặng quý hơn nhưng nguy hiểm',
        difficulty: 2,
        rarityBonus: 0.15,
        oreTypes: ['UNCOMMON', 'RARE', 'EPIC'],
        digCount: 4,
        comboWindow: 8000 // 8 giây (tăng từ 4s)
    },
    VOLCANO: {
        name: '🌋 Núi lửa',
        description: 'Quặng huyền thoại ẩn sâu',
        difficulty: 3,
        rarityBonus: 0.30,
        oreTypes: ['RARE', 'EPIC', 'LEGENDARY'],
        digCount: 5,
        comboWindow: 6000 // 6 giây (tăng từ 3s)
    }
};

// Loại cuốc
const PICKAXE_TYPES = {
    COMMON: { name: 'Cuốc Gỗ', bonusRate: 0, bonusRarity: 0, comboBonus: 0 },
    UNCOMMON: { name: 'Cuốc Đá', bonusRate: 0.05, bonusRarity: 0.05, comboBonus: 100 },
    RARE: { name: 'Cuốc Sắt', bonusRate: 0.10, bonusRarity: 0.10, comboBonus: 200 },
    EPIC: { name: 'Cuốc Vàng', bonusRate: 0.20, bonusRarity: 0.20, comboBonus: 300 },
    LEGENDARY: { name: 'Cuốc Kim Cương', bonusRate: 0.35, bonusRarity: 0.35, comboBonus: 500 }
};

// Loại quặng với giá trị - ĐỒNG BỘ VỚI DATABASE (seeders.js)
const ORE_TYPES = {
    COAL: { name: 'Than đá', rarity: 'COMMON', baseValue: 5, emoji: '⚫', extractDifficulty: 1 },
    COPPER: { name: 'Quặng đồng', rarity: 'COMMON', baseValue: 10, emoji: '🟤', extractDifficulty: 1 },
    IRON: { name: 'Quặng sắt', rarity: 'UNCOMMON', baseValue: 25, emoji: '⚙️', extractDifficulty: 2 },
    SILVER: { name: 'Quặng bạc', rarity: 'UNCOMMON', baseValue: 50, emoji: '⚪', extractDifficulty: 2 },
    GOLD: { name: 'Quặng vàng', rarity: 'RARE', baseValue: 100, emoji: '🟡', extractDifficulty: 3 },
    RUBY: { name: 'Hồng ngọc', rarity: 'RARE', baseValue: 200, emoji: '🔴', extractDifficulty: 3 },
    EMERALD: { name: 'Ngọc lục bảo', rarity: 'EPIC', baseValue: 400, emoji: '🟢', extractDifficulty: 4 },
    DIAMOND: { name: 'Kim cương', rarity: 'EPIC', baseValue: 800, emoji: '💎', extractDifficulty: 4 },
    MYTHRIL: { name: 'Quặng Mythril', rarity: 'LEGENDARY', baseValue: 1500, emoji: '🔮', extractDifficulty: 5 },
    ADAMANTITE: { name: 'Quặng Adamantite', rarity: 'LEGENDARY', baseValue: 3000, emoji: '✨', extractDifficulty: 5 }
};

// Tỉ lệ drop cơ bản - Tăng tỉ lệ common để dễ chơi hơn
const BASE_DROP_RATES = {
    COMMON: 0.55,     // 55% (tăng từ 50%)
    UNCOMMON: 0.28,   // 28% (giảm từ 30%)
    RARE: 0.12,       // 12% (giảm từ 15%)
    EPIC: 0.04,       // 4% (giữ nguyên)
    LEGENDARY: 0.01   // 1% (giữ nguyên)
};

// Dig patterns - combo patterns
const DIG_PATTERNS = ['⬆️', '⬇️', '⬅️', '➡️', '⛏️'];

// Extract patterns theo difficulty - ĐƠN GIẢN HÓA để dễ chơi hơn
// Chỉ dùng ⛏️ và 💪, bỏ 🔥 phức tạp
const EXTRACT_PATTERNS = {
    1: ['⛏️'],                           // 1 bước
    2: ['⛏️', '⛏️'],                     // 2 bước
    3: ['⛏️', '⛏️', '⛏️'],               // 3 bước (đơn giản hóa)
    4: ['⛏️', '⛏️', '💪', '⛏️'],         // 4 bước (đơn giản hóa)
    5: ['⛏️', '💪', '⛏️', '💪', '⛏️']    // 5 bước (bỏ 🔥)
};

/**
 * Lấy cuốc tốt nhất
 */
function getBestPickaxe(discordId) {
    userManager.ensureDefaultTools(discordId);

    const pickaxeItems = all(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.type = 'EQUIPMENT'
        AND i.name LIKE '%Cuốc%'
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

    if (!pickaxeItems || pickaxeItems.length === 0) return null;

    const pickaxe = pickaxeItems[0];
    return {
        ...pickaxe,
        bonus: PICKAXE_TYPES[pickaxe.rarity] || PICKAXE_TYPES.COMMON
    };
}

/**
 * Lấy tất cả cuốc
 */
function getAllPickaxes(discordId) {
    userManager.ensureDefaultTools(discordId);

    const pickaxeItems = all(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.type = 'EQUIPMENT'
        AND i.name LIKE '%Cuốc%'
        ORDER BY 
            CASE i.rarity 
                WHEN 'LEGENDARY' THEN 5
                WHEN 'EPIC' THEN 4
                WHEN 'RARE' THEN 3
                WHEN 'UNCOMMON' THEN 2
                WHEN 'COMMON' THEN 1
            END DESC
    `, [discordId]);

    return pickaxeItems.map(pickaxe => ({
        ...pickaxe,
        bonus: PICKAXE_TYPES[pickaxe.rarity] || PICKAXE_TYPES.COMMON
    }));
}

/**
 * Lấy cuốc theo ID
 */
function getPickaxeById(discordId, itemId) {
    const pickaxe = get(`
        SELECT i.*, inv.quantity
        FROM inventories inv
        JOIN items i ON inv.item_id = i.id
        WHERE inv.user_id = (SELECT id FROM users WHERE discord_id = ?)
        AND i.id = ?
        AND i.type = 'EQUIPMENT'
        AND i.name LIKE '%Cuốc%'
    `, [discordId, itemId]);

    if (!pickaxe) return null;

    return {
        ...pickaxe,
        bonus: PICKAXE_TYPES[pickaxe.rarity] || PICKAXE_TYPES.COMMON
    };
}

/**
 * Kiểm tra có cuốc không
 */
function hasPickaxe(discordId) {
    return getBestPickaxe(discordId) !== null;
}

/**
 * PHASE 1: Bắt đầu đào mỏ - Chọn vị trí
 */
function startMining(discordId, pickaxeId = null) {
    let pickaxe = pickaxeId ? getPickaxeById(discordId, pickaxeId) : getBestPickaxe(discordId);

    if (!pickaxe) {
        return { error: 'no_pickaxe' };
    }

    // Kiểm tra cooldown
    const lastMine = cooldowns.get(discordId);
    if (lastMine && Date.now() - lastMine < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastMine)) / 1000);
        return { error: 'cooldown', remaining };
    }

    // Tạo session mới
    const session = {
        discordId,
        pickaxe,
        phase: 'SELECT_LOCATION',
        location: null,
        currentDig: 0,
        maxDigs: 0,
        combo: 0,
        maxCombo: 0,
        lastDigTime: null,
        oresFound: [],
        currentOre: null,
        extractPattern: [],
        extractCurrentIndex: 0,
        startTime: Date.now(),
        bonusMultiplier: 1,
        criticalHit: false
    };

    activeSessions.set(discordId, session);

    logger.info('Mining session started', { discordId, pickaxe: pickaxe.name });

    return {
        success: true,
        phase: 'SELECT_LOCATION',
        pickaxe: { name: pickaxe.name, rarity: pickaxe.rarity },
        locations: MINING_LOCATIONS
    };
}

/**
 * PHASE 2: Chọn vị trí và bắt đầu đào
 */
function selectLocation(discordId, locationKey) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'SELECT_LOCATION') {
        return { error: 'invalid_session' };
    }

    const location = MINING_LOCATIONS[locationKey.toUpperCase()];
    if (!location) {
        return { error: 'invalid_location' };
    }

    session.location = { key: locationKey.toUpperCase(), ...location };
    session.maxDigs = location.digCount;
    session.phase = 'DIGGING';

    // Generate first dig pattern
    session.nextDigPattern = generateDigPattern();
    session.digStartTime = Date.now();
    session.digDeadline = Date.now() + location.comboWindow + (session.pickaxe.bonus.comboBonus || 0);

    logger.info('Mining location selected', { discordId, location: locationKey });

    return {
        success: true,
        phase: 'DIGGING',
        location: session.location,
        currentDig: 1,
        maxDigs: session.maxDigs,
        nextPattern: session.nextDigPattern,
        comboWindow: location.comboWindow + (session.pickaxe.bonus.comboBonus || 0),
        message: `⛏️ Bắt đầu đào tại ${location.name}!`
    };
}

/**
 * Generate random dig pattern
 */
function generateDigPattern() {
    return DIG_PATTERNS[randomInt(0, DIG_PATTERNS.length - 1)];
}

/**
 * PHASE 3: Dig action - Đào với combo system
 */
function digAction(discordId, action) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'DIGGING') {
        return { error: 'invalid_session' };
    }

    const now = Date.now();
    const location = session.location;
    const comboWindow = location.comboWindow + (session.pickaxe.bonus.comboBonus || 0);

    // Kiểm tra thời gian (nếu quá deadline)
    if (session.digDeadline && now > session.digDeadline) {
        // Reset combo
        session.combo = 0;
    }

    // Kiểm tra action có đúng pattern không
    const expectedPattern = session.nextDigPattern;
    const isCorrect = action === expectedPattern;

    // Critical hit chance (10% base + pickaxe bonus)
    const critChance = 0.10 + (session.pickaxe.bonus.bonusRate * 0.5);
    const isCritical = isCorrect && Math.random() < critChance;

    if (isCorrect) {
        session.combo++;
        session.maxCombo = Math.max(session.maxCombo, session.combo);

        if (isCritical) {
            session.criticalHit = true;
            session.bonusMultiplier += 0.25;
        }
    } else {
        session.combo = Math.max(0, session.combo - 1);
    }

    session.currentDig++;
    session.lastDigTime = now;

    // Tìm quặng sau mỗi lần đào
    if (isCorrect) {
        const ore = selectOre(session);
        session.oresFound.push({
            ...ore,
            critical: isCritical
        });
    }

    // Kiểm tra đã đủ số lần đào chưa
    if (session.currentDig >= session.maxDigs) {
        // Chuyển sang phase extract nếu tìm được quặng
        if (session.oresFound.length > 0) {
            // Chọn quặng tốt nhất để extract
            const bestOre = session.oresFound.reduce((best, ore) => {
                const rarityOrder = { 'LEGENDARY': 5, 'EPIC': 4, 'RARE': 3, 'UNCOMMON': 2, 'COMMON': 1 };
                return rarityOrder[ore.rarity] > rarityOrder[best.rarity] ? ore : best;
            });

            session.currentOre = bestOre;
            session.phase = 'EXTRACT';

            // Setup extract pattern
            const difficulty = Math.min(bestOre.extractDifficulty, 5);
            const pattern = EXTRACT_PATTERNS[difficulty] || EXTRACT_PATTERNS[1];
            session.extractPattern = pattern;
            session.extractCurrentIndex = 0;
            session.extractStartTime = Date.now();
            // Tăng thời gian extract để dễ chơi hơn
            session.extractTimeLimit = 8000 + (pattern.length * 2000); // Tăng từ 4000 + 1500/step

            // Combo bonus
            const comboBonus = 1 + (session.maxCombo * 0.1);
            session.bonusMultiplier *= comboBonus;

            return {
                success: true,
                phase: 'EXTRACT',
                oresFound: session.oresFound,
                bestOre: {
                    name: bestOre.name,
                    emoji: bestOre.emoji,
                    rarity: bestOre.rarity
                },
                combo: session.combo,
                maxCombo: session.maxCombo,
                bonusMultiplier: session.bonusMultiplier,
                extractPattern: pattern,
                message: `💎 Tìm thấy mạch quặng! ${bestOre.emoji} **${bestOre.name}**!`,
                timeLimit: session.extractTimeLimit
            };
        } else {
            // Không tìm thấy quặng nào
            activeSessions.delete(discordId);
            cooldowns.set(discordId, Date.now());

            return {
                success: false,
                phase: 'COMPLETE',
                message: '😔 Không tìm thấy quặng nào lần này...',
                oresFound: []
            };
        }
    }

    // Tạo pattern mới cho lần đào tiếp theo
    session.nextDigPattern = generateDigPattern();
    session.digStartTime = now;
    session.digDeadline = now + comboWindow;

    return {
        success: isCorrect,
        phase: 'DIGGING',
        isCorrect,
        isCritical,
        combo: session.combo,
        currentDig: session.currentDig,
        maxDigs: session.maxDigs,
        nextPattern: session.nextDigPattern,
        comboWindow,
        oresFound: session.oresFound.length,
        message: isCritical
            ? `💥 CRITICAL HIT! Combo x${session.combo}!`
            : (isCorrect ? `✅ Đào thành công! Combo x${session.combo}` : `❌ Sai nhịp! Combo reset...`)
    };
}

/**
 * PHASE 4: Extract action - Khai thác quặng
 */
function extractAction(discordId, action) {
    const session = activeSessions.get(discordId);
    if (!session || session.phase !== 'EXTRACT') {
        return { error: 'invalid_session' };
    }

    const now = Date.now();

    // Kiểm tra timeout
    if (now > session.extractStartTime + session.extractTimeLimit) {
        // Timeout - vẫn nhận được 50% quặng
        return completeMining(discordId, false);
    }

    const expectedAction = session.extractPattern[session.extractCurrentIndex];

    // Kiểm tra action có đúng không
    if (action !== expectedAction) {
        // Sai action - giảm bonus
        session.bonusMultiplier = Math.max(1, session.bonusMultiplier - 0.15);

        return {
            success: false,
            message: `❌ Sai nút! Cần nhấn: ${expectedAction}`,
            progress: session.extractCurrentIndex,
            total: session.extractPattern.length,
            currentExpected: expectedAction
        };
    }

    // Action đúng!
    session.extractCurrentIndex++;

    // Kiểm tra hoàn thành
    if (session.extractCurrentIndex >= session.extractPattern.length) {
        return completeMining(discordId, true);
    }

    const nextAction = session.extractPattern[session.extractCurrentIndex];
    const timeRemaining = Math.ceil((session.extractStartTime + session.extractTimeLimit - now) / 1000);

    return {
        success: true,
        phase: 'EXTRACT',
        message: `✅ Tốt lắm! Tiếp tục khai thác...`,
        progress: session.extractCurrentIndex,
        total: session.extractPattern.length,
        nextAction,
        timeRemaining
    };
}

/**
 * PHASE 5: Hoàn thành đào mỏ
 */
function completeMining(discordId, perfectExtract = true) {
    const session = activeSessions.get(discordId);
    if (!session) {
        return { error: 'no_session' };
    }

    const ore = session.currentOre;
    const pickaxe = session.pickaxe;
    let bonusMultiplier = session.bonusMultiplier;

    // Perfect extract bonus
    if (perfectExtract) {
        bonusMultiplier *= 1.5;
    } else {
        bonusMultiplier *= 0.75; // Penalty cho timeout
    }

    // Tính số lượng
    const bonusRate = pickaxe.bonus.bonusRate;
    const baseQuantity = 1;
    const comboQuantity = Math.floor(session.maxCombo / 3); // Bonus từ combo
    const criticalQuantity = session.criticalHit ? 1 : 0;
    const quantity = Math.max(1, baseQuantity + comboQuantity + criticalQuantity);

    // Thêm tất cả quặng tìm được
    let totalValue = 0;
    let totalOres = [];

    for (const foundOre of session.oresFound) {
        const oreItem = get(`SELECT * FROM items WHERE name = ? AND type = 'MATERIAL'`, [foundOre.name]);

        if (oreItem) {
            inventoryManager.addItem(discordId, oreItem.id, 1);
            totalOres.push({ ...foundOre, quantity: 1 });
        } else {
            // Fallback: DCoin
            const dcoinValue = Math.floor(foundOre.baseValue * bonusMultiplier);
            economyManager.addDCoin(discordId, dcoinValue, TRANSACTION_TYPES.GAME_WIN, `Đào mỏ: ${foundOre.name}`);
            totalValue += dcoinValue;
        }
    }

    // Bonus quantity cho best ore nếu perfect extract
    if (perfectExtract && quantity > 1) {
        const bestOreItem = get(`SELECT * FROM items WHERE name = ? AND type = 'MATERIAL'`, [ore.name]);
        if (bestOreItem) {
            inventoryManager.addItem(discordId, bestOreItem.id, quantity - 1);
            const existingOre = totalOres.find(o => o.name === ore.name);
            if (existingOre) {
                existingOre.quantity += quantity - 1;
            }
        }
    }

    // Award XP - bonus cho quặng hiếm
    let xpResult = levelManager.awardXP(discordId, 'MINING');

    // Bonus XP nếu tìm thấy quặng RARE trở lên
    const hasRareOre = session.oresFound.some(ore =>
        ore.rarity === 'RARE' || ore.rarity === 'EPIC' || ore.rarity === 'LEGENDARY'
    );
    if (hasRareOre) {
        const bonusXp = levelManager.awardXP(discordId, 'MINING_RARE');
        if (bonusXp.success) {
            xpResult = bonusXp; // Use latest XP state
        }
    }

    // Set cooldown và cleanup
    cooldowns.set(discordId, Date.now());
    activeSessions.delete(discordId);

    logger.info('Mining completed', {
        discordId,
        oresFound: session.oresFound.length,
        maxCombo: session.maxCombo,
        bonusMultiplier,
        perfectExtract,
        pickaxe: pickaxe.name
    });

    return {
        success: true,
        phase: 'COMPLETE',
        ores: totalOres,
        totalOresCount: session.oresFound.length,
        bonusMultiplier,
        maxCombo: session.maxCombo,
        perfectExtract,
        criticalHits: session.criticalHit,
        dcoinReward: totalValue,
        pickaxe: { name: pickaxe.name, rarity: pickaxe.rarity },
        location: session.location,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null,
        message: perfectExtract
            ? `🎉 PERFECT! Khai thác thành công ${session.oresFound.length} quặng!`
            : `⛏️ Khai thác được ${session.oresFound.length} quặng!`
    };
}

/**
 * Chọn quặng dựa trên location và pickaxe
 */
function selectOre(session) {
    const location = session.location;
    const pickaxe = session.pickaxe;
    const bonusRarity = pickaxe.bonus.bonusRarity + location.rarityBonus;

    // Combo bonus cho rarity
    const comboRarityBonus = session.combo * 0.02; // +2% mỗi combo

    // Điều chỉnh tỉ lệ drop
    const adjustedRates = {};
    let remaining = 1.0;

    for (const rarity of ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']) {
        if (!location.oreTypes.includes(rarity)) {
            adjustedRates[rarity] = 0;
            continue;
        }

        let rate = BASE_DROP_RATES[rarity];
        if (rarity !== 'COMMON') {
            rate = rate * (1 + bonusRarity + comboRarityBonus);
        }
        adjustedRates[rarity] = Math.min(rate, remaining);
        remaining -= adjustedRates[rarity];
    }

    if (location.oreTypes.includes('COMMON')) {
        adjustedRates['COMMON'] = Math.max(0.1, remaining);
    }

    // Roll rarity
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

    // Chọn quặng theo rarity
    const oresOfRarity = Object.values(ORE_TYPES).filter(ore => ore.rarity === selectedRarity);
    return oresOfRarity[Math.floor(Math.random() * oresOfRarity.length)];
}

/**
 * Lấy session hiện tại
 */
function getSession(discordId) {
    return activeSessions.get(discordId) || null;
}

/**
 * Reset combo to 0 (used by timeout in handler)
 */
function resetCombo(discordId) {
    const session = activeSessions.get(discordId);
    if (session && session.phase === 'DIGGING') {
        session.combo = 0;
        return true;
    }
    return false;
}

/**
 * Hủy session
 */
function cancelSession(discordId) {
    activeSessions.delete(discordId);
}

/**
 * Lấy thông tin mining
 */
function getMiningInfo(discordId) {
    const pickaxe = getBestPickaxe(discordId);
    const cooldownRemaining = getCooldown(discordId);
    const session = getSession(discordId);

    return {
        hasPickaxe: pickaxe !== null,
        pickaxe: pickaxe ? {
            name: pickaxe.name,
            rarity: pickaxe.rarity,
            bonus: pickaxe.bonus
        } : null,
        cooldown: cooldownRemaining,
        activeSession: session !== null,
        sessionPhase: session?.phase || null,
        locations: MINING_LOCATIONS,
        oreTypes: Object.entries(ORE_TYPES).map(([key, ore]) => ({
            key,
            ...ore
        }))
    };
}

/**
 * Lấy cooldown còn lại
 */
function getCooldown(discordId) {
    const lastMine = cooldowns.get(discordId);
    if (!lastMine) return 0;

    const remaining = COOLDOWN_MS - (Date.now() - lastMine);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

module.exports = {
    // Core functions
    startMining,
    selectLocation,
    digAction,
    extractAction,
    completeMining,

    // Session management
    getSession,
    cancelSession,
    resetCombo,

    // Info functions
    hasPickaxe,
    getBestPickaxe,
    getAllPickaxes,
    getPickaxeById,
    getMiningInfo,
    getCooldown,

    // Constants
    MINING_LOCATIONS,
    ORE_TYPES,
    PICKAXE_TYPES,
    DIG_PATTERNS,
    EXTRACT_PATTERNS
};
