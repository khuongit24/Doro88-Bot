const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const inventoryManager = require('../../managers/inventoryManager');
const itemManager = require('../../managers/itemManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt, weightedRandom } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// COOLDOWN REMOVED v3.0: Mystery Box không cần cooldown vì reward đã random
// và không ảnh hưởng đến việc farm tiền (EV âm với house edge ~10-15%)

// Box types with balanced rewards to prevent inflation
// EV should be slightly negative (house edge ~10-15%)
const BOX_TYPES = {
    NORMAL: {
        id: 'normal',
        name: '📦 Hộp Thường',
        cost: 500,
        // EV ≈ 425-450 DCoin (house edge ~10-15%)
        rewards: [
            { type: 'dcoin', min: 0, max: 100, weight: 20 },      // 20% - big loss
            { type: 'dcoin', min: 150, max: 300, weight: 30 },    // 30% - loss
            { type: 'dcoin', min: 400, max: 550, weight: 30 },    // 30% - break even
            { type: 'dcoin', min: 600, max: 800, weight: 15 },    // 15% - small profit
            { type: 'dcoin', min: 900, max: 1200, weight: 4 },    // 4% - good profit
            { type: 'jackpot', amount: 2500, weight: 1 }          // 1% - jackpot (5x)
        ]
    },
    PREMIUM: {
        id: 'premium',
        name: '🎁 Hộp Cao Cấp',
        cost: 1000,
        // EV ≈ 850-900 DCoin (house edge ~10-15%)
        rewards: [
            { type: 'dcoin', min: 0, max: 200, weight: 15 },      // 15% - big loss
            { type: 'dcoin', min: 300, max: 600, weight: 30 },    // 30% - loss
            { type: 'dcoin', min: 800, max: 1100, weight: 30 },   // 30% - break even
            { type: 'dcoin', min: 1200, max: 1600, weight: 15 },  // 15% - profit
            { type: 'dcoin', min: 1800, max: 2500, weight: 7 },   // 7% - big profit
            { type: 'jackpot', amount: 5000, weight: 2 },         // 2% - jackpot (5x)
            { type: 'item', rarity: 'RARE', weight: 1 }           // 1% - rare item
        ]
    },
    LEGENDARY: {
        id: 'legendary',
        name: '👑 Hộp Huyền Thoại',
        cost: 2000,
        // EV ≈ 1700-1800 DCoin (house edge ~10-15%)
        rewards: [
            { type: 'dcoin', min: 0, max: 400, weight: 12 },      // 12% - big loss
            { type: 'dcoin', min: 600, max: 1200, weight: 28 },   // 28% - loss
            { type: 'dcoin', min: 1600, max: 2200, weight: 30 },  // 30% - break even
            { type: 'dcoin', min: 2400, max: 3200, weight: 18 },  // 18% - profit
            { type: 'dcoin', min: 3500, max: 5000, weight: 8 },   // 8% - big profit
            { type: 'jackpot', amount: 10000, weight: 2 },        // 2% - jackpot (5x)
            { type: 'item', rarity: 'EPIC', weight: 1.5 },        // 1.5% - epic item
            { type: 'item', rarity: 'LEGENDARY', weight: 0.5 }    // 0.5% - legendary item
        ]
    }
};

/**
 * Open a mystery box
 * @param {string} discordId 
 * @param {string} boxType - 'normal', 'premium', 'legendary'
 * @returns {Object}
 */
function openBox(discordId, boxType = 'normal') {
    const box = BOX_TYPES[boxType.toUpperCase()];
    if (!box) {
        return { error: 'invalid_box' };
    }

    // COOLDOWN REMOVED: Người chơi có thể mở liên tục

    // Check balance
    if (!economyManager.canAfford(discordId, box.cost)) {
        return { error: 'insufficient_balance', required: box.cost };
    }

    // Deduct cost
    economyManager.deductDCoin(discordId, box.cost, TRANSACTION_TYPES.SPEND, `Mystery Box: ${box.name}`);

    // Roll reward
    const reward = rollReward(box.rewards);

    // Process reward
    let result = {
        box: box,
        cost: box.cost,
        reward: null,
        profit: 0
    };

    if (reward.type === 'dcoin') {
        const amount = randomInt(reward.min, reward.max);
        economyManager.addDCoin(discordId, amount, TRANSACTION_TYPES.GAME_WIN, `Mystery Box thắng`);
        result.reward = { type: 'dcoin', amount };
        result.profit = amount - box.cost;
    } else if (reward.type === 'jackpot') {
        economyManager.addDCoin(discordId, reward.amount, TRANSACTION_TYPES.GAME_WIN, `Mystery Box JACKPOT!`);
        result.reward = { type: 'jackpot', amount: reward.amount };
        result.profit = reward.amount - box.cost;
        result.isJackpot = true;
    } else if (reward.type === 'item') {
        // Get random item of that rarity
        const items = itemManager.getItemsByRarity(reward.rarity);
        if (items && items.length > 0) {
            const item = items[randomInt(0, items.length - 1)];
            inventoryManager.addItem(discordId, item.id, 1);
            result.reward = { type: 'item', item };
            result.profit = item.base_value - box.cost;
        } else {
            // Fallback to DCoin if no items available
            const fallbackAmount = box.cost * 2;
            economyManager.addDCoin(discordId, fallbackAmount, TRANSACTION_TYPES.GAME_WIN, `Mystery Box (item fallback)`);
            result.reward = { type: 'dcoin', amount: fallbackAmount };
            result.profit = fallbackAmount - box.cost;
        }
    }

    // COOLDOWN REMOVED - không set cooldown nữa

    // Award XP for opening box
    const xpResult = levelManager.awardXP(discordId, 'MYSTERY_BOX_OPEN');

    logger.info('Mystery Box opened', {
        discordId,
        boxType: box.id,
        reward: result.reward,
        profit: result.profit
    });

    result.xpGained = xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0;
    result.levelUp = xpResult.leveledUp || false;
    result.newLevel = xpResult.newLevel || null;

    return result;
}

/**
 * Roll a reward from weighted list
 * @param {Array} rewards 
 * @returns {Object}
 */
function rollReward(rewards) {
    const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
    let roll = randomInt(1, totalWeight);

    for (const reward of rewards) {
        roll -= reward.weight;
        if (roll <= 0) {
            return reward;
        }
    }

    return rewards[0];
}

/**
 * Get box types
 * @returns {Object}
 */
function getBoxTypes() {
    return BOX_TYPES;
}

/**
 * Get cooldown remaining (DISABLED - always returns 0)
 * @param {string} discordId 
 * @returns {number}
 */
function getCooldown(discordId) {
    return 0; // Cooldown disabled
}

/**
 * Get reward rarity emoji
 * @param {Object} result 
 * @returns {string}
 */
function getRewardEmoji(result) {
    if (result.isJackpot) return '🎰';
    if (result.reward?.type === 'item') {
        const rarityEmojis = {
            'COMMON': '⚪',
            'UNCOMMON': '🟢',
            'RARE': '🔵',
            'EPIC': '🟣',
            'LEGENDARY': '🟡'
        };
        return rarityEmojis[result.reward.item.rarity] || '📦';
    }
    if (result.profit > result.cost) return '💰';
    if (result.profit > 0) return '✨';
    if (result.profit === 0) return '😐';
    return '💸';
}

module.exports = {
    openBox,
    getBoxTypes,
    getCooldown,
    getRewardEmoji,
    BOX_TYPES
};
