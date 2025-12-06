const { get, run } = require('../database/connection');
const userManager = require('./userManager');
const mailboxManager = require('./mailboxManager');
const logger = require('../utils/logger');

// Level system constants
const MAX_LEVEL = 100;
const BASE_XP = 100; // XP needed for level 1 -> 2
const XP_MULTIPLIER = 1.15; // Each level requires 15% more XP than previous

// Milestone rewards (DCoin rewards at every 10 levels)
// CÂN BẰNG KINH TẾ v2.0: Giảm ~50% phần thưởng milestone
// Lý do: Milestone là phần thưởng 1 lần, nhưng cần cân đối với tổng DCoin trong hệ thống
const MILESTONE_REWARDS = {
    10: { dcoin: 500, title: 'Người mới bắt đầu' },
    20: { dcoin: 1200, title: 'Người chơi quen thuộc' },
    30: { dcoin: 2500, title: 'Cao thủ đang lên' },
    40: { dcoin: 5000, title: 'Bậc thầy cờ bạc' },
    50: { dcoin: 10000, title: 'Huyền thoại nửa đường' },
    60: { dcoin: 18000, title: 'Đại cao thủ' },
    70: { dcoin: 25000, title: 'Tay chơi thượng thặng' },
    80: { dcoin: 40000, title: 'Vua sòng bài' },
    90: { dcoin: 60000, title: 'Huyền thoại sống' },
    100: { dcoin: 100000, title: 'DORO88 MASTER 👑' }
};

// XP rewards for different actions
const XP_REWARDS = {
    // Gacha
    GACHA_PULL: 10,
    GACHA_PULL_10: 100,
    GACHA_5STAR: 50,
    GACHA_4STAR: 20,

    // Casino
    BLACKJACK_PLAY: 5,
    BLACKJACK_WIN: 15,
    BLACKJACK_BLACKJACK: 30,
    SLOTS_PLAY: 3,
    SLOTS_WIN: 10,
    SLOTS_JACKPOT: 100,
    ROULETTE_PLAY: 5,
    ROULETTE_WIN: 15,
    CRASH_PLAY: 5,
    CRASH_WIN: 12,
    WHEEL_PLAY: 3,
    WHEEL_WIN: 8,
    WHEEL_JACKPOT: 50,

    // Mini games
    COINFLIP_PLAY: 2,
    COINFLIP_WIN: 5,
    RPS_PLAY: 2,
    RPS_WIN: 5,
    DICE_PLAY: 3,
    DICE_WIN: 8,
    LUCKY_NUMBER_PLAY: 5,
    LUCKY_NUMBER_WIN: 20,
    HIGHER_LOWER_PLAY: 3,
    HIGHER_LOWER_WIN: 10,
    QUICK_MATH_PLAY: 5,
    QUICK_MATH_PERFECT: 25,
    MYSTERY_BOX_OPEN: 10,

    // Mining & Fishing - TĂNG XP để đáng chơi hơn
    MINING: 10,            // Tăng từ 5
    MINING_RARE: 25,       // Tăng từ 15
    FISHING: 5,
    FISHING_RARE: 15,

    // Scratch Card
    SCRATCH_PLAY: 2,
    SCRATCH_WIN: 5,
    SCRATCH_JACKPOT: 25,

    // Daily
    DAILY_CLAIM: 20,
    DAILY_STREAK_BONUS: 5 // Bonus per streak day
};

/**
 * Calculate XP required for a specific level
 * @param {number} level 
 * @returns {number}
 */
function getXPForLevel(level) {
    if (level <= 1) return 0;
    if (level > MAX_LEVEL) return getXPForLevel(MAX_LEVEL);

    // Formula: BASE_XP * MULTIPLIER^(level-2)
    // Level 2 needs BASE_XP, Level 3 needs BASE_XP * 1.15, etc.
    return Math.floor(BASE_XP * Math.pow(XP_MULTIPLIER, level - 2));
}

/**
 * Calculate total XP needed to reach a specific level from level 1
 * @param {number} level 
 * @returns {number}
 */
function getTotalXPForLevel(level) {
    if (level <= 1) return 0;

    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

/**
 * Calculate level from total XP
 * @param {number} totalXP 
 * @returns {number}
 */
function getLevelFromXP(totalXP) {
    let level = 1;
    let xpNeeded = 0;

    while (level < MAX_LEVEL) {
        xpNeeded += getXPForLevel(level + 1);
        if (totalXP < xpNeeded) break;
        level++;
    }

    return level;
}

/**
 * Get XP progress within current level
 * @param {number} totalXP 
 * @param {number} level 
 * @returns {Object} { currentXP, requiredXP, percentage }
 */
function getLevelProgress(totalXP, level) {
    if (level >= MAX_LEVEL) {
        return {
            currentXP: 0,
            requiredXP: 0,
            percentage: 100
        };
    }

    const xpAtCurrentLevel = getTotalXPForLevel(level);
    const xpForNextLevel = getXPForLevel(level + 1);
    const currentXP = totalXP - xpAtCurrentLevel;
    const percentage = Math.floor((currentXP / xpForNextLevel) * 100);

    return {
        currentXP,
        requiredXP: xpForNextLevel,
        percentage: Math.min(percentage, 100)
    };
}

/**
 * Add XP to a user
 * @param {string} discordId 
 * @param {number} xpAmount 
 * @param {string} reason 
 * @returns {Object} { success, newXP, newLevel, leveledUp, levelsGained, milestoneRewards }
 */
function addXP(discordId, xpAmount, reason = 'Unknown') {
    const user = userManager.getUser(discordId);
    if (!user) {
        return { success: false, error: 'user_not_found' };
    }

    const oldLevel = user.level || 1;
    const oldXP = user.total_xp || 0;
    const newXP = oldXP + xpAmount;
    const newLevel = Math.min(getLevelFromXP(newXP), MAX_LEVEL);
    const leveledUp = newLevel > oldLevel;
    const levelsGained = newLevel - oldLevel;

    // Update user
    userManager.updateUser(discordId, {
        total_xp: newXP,
        level: newLevel
    });

    // Invalidate cache
    userManager.invalidateCache(discordId);

    logger.info('XP added', {
        discordId,
        xpAmount,
        reason,
        oldLevel,
        newLevel,
        newXP,
        leveledUp
    });

    // Check for milestone rewards
    const milestoneRewards = [];
    if (leveledUp) {
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
            if (MILESTONE_REWARDS[lvl]) {
                const reward = MILESTONE_REWARDS[lvl];
                // Send reward mail
                sendMilestoneReward(discordId, lvl, reward);
                milestoneRewards.push({ level: lvl, ...reward });
            }
        }
    }

    return {
        success: true,
        oldXP,
        newXP,
        oldLevel,
        newLevel,
        leveledUp,
        levelsGained,
        milestoneRewards
    };
}

/**
 * Send milestone reward via mailbox
 * @param {string} discordId 
 * @param {number} level 
 * @param {Object} reward 
 */
function sendMilestoneReward(discordId, level, reward) {
    try {
        mailboxManager.sendMail(discordId, {
            sender_type: 'SYSTEM',
            subject: `🎉 Chúc mừng đạt Level ${level}!`,
            content: `Bạn đã đạt **Level ${level}** - ${reward.title}!\n\n` +
                `Đây là phần thưởng xứng đáng cho nỗ lực của bạn.\n\n` +
                `Tiếp tục chơi để nhận thêm nhiều phần thưởng hấp dẫn!`,
            dcoin_reward: reward.dcoin
        });

        logger.info('Milestone reward sent', {
            discordId,
            level,
            dcoin: reward.dcoin,
            title: reward.title
        });
    } catch (error) {
        logger.error('Failed to send milestone reward', {
            discordId,
            level,
            error: error.message
        });
    }
}

/**
 * Get user level info
 * @param {string} discordId 
 * @returns {Object}
 */
function getUserLevelInfo(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return null;

    const level = user.level || 1;
    const totalXP = user.total_xp || 0;
    const progress = getLevelProgress(totalXP, level);
    const nextMilestone = getNextMilestone(level);

    return {
        level,
        totalXP,
        ...progress,
        maxLevel: MAX_LEVEL,
        isMaxLevel: level >= MAX_LEVEL,
        nextMilestone
    };
}

/**
 * Get next milestone level and reward
 * @param {number} currentLevel 
 * @returns {Object|null}
 */
function getNextMilestone(currentLevel) {
    const milestones = Object.keys(MILESTONE_REWARDS).map(Number).sort((a, b) => a - b);

    for (const milestone of milestones) {
        if (milestone > currentLevel) {
            return {
                level: milestone,
                ...MILESTONE_REWARDS[milestone]
            };
        }
    }

    return null;
}

/**
 * Create XP progress bar
 * @param {number} percentage 
 * @param {number} length 
 * @returns {string}
 */
function createProgressBar(percentage, length = 10) {
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;

    const filledChar = '█';
    const emptyChar = '░';

    return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Award XP for a specific action
 * @param {string} discordId 
 * @param {string} action - One of XP_REWARDS keys
 * @param {Object} options - Additional options like streak
 * @returns {Object}
 */
function awardXP(discordId, action, options = {}) {
    let xpAmount = XP_REWARDS[action];

    if (!xpAmount) {
        logger.warn('Unknown XP action', { action });
        return { success: false, error: 'invalid_action' };
    }

    // Apply bonuses
    if (action === 'DAILY_CLAIM' && options.streak) {
        xpAmount += XP_REWARDS.DAILY_STREAK_BONUS * Math.min(options.streak, 30);
    }

    return addXP(discordId, xpAmount, action);
}

module.exports = {
    MAX_LEVEL,
    XP_REWARDS,
    MILESTONE_REWARDS,
    getXPForLevel,
    getTotalXPForLevel,
    getLevelFromXP,
    getLevelProgress,
    addXP,
    awardXP,
    getUserLevelInfo,
    getNextMilestone,
    createProgressBar
};
