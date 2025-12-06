const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { weightedRandom } = require('../../utils/helpers');

/**
 * Store player session data for interactive features
 */
const playerSessions = new Map();

/**
 * Spinning animation frames - tạo hiệu ứng quay hấp dẫn
 */
const SPIN_FRAMES = [
    ['❓', '❓', '❓'],
    ['🔄', '❓', '❓'],
    ['🎰', '🔄', '❓'],
    ['🎰', '🎰', '🔄']
];

/**
 * Near-miss symbols - những symbol "suýt trúng"
 */
const NEAR_MISS_MESSAGES = [
    '😱 Suýt nữa thôi!',
    '🔥 Gần lắm rồi!',
    '💫 Sắp trúng rồi đấy!',
    '👀 Wow, xíu nữa thì!',
    '✨ Lần sau sẽ trúng, hứa luôn!',
    '🎯 Gần như vậy mà!',
    '💡 Chỉ thiếu chút nữa thôi!',
    '👏 Cố lên, lần sau nhé!'
];

/**
 * Jackpot celebration messages
 */
const JACKPOT_MESSAGES = [
    '🎰🎰🎰 JACKPOT!!!',
    '💰💰💰 TRÚNG LỚN!!!',
    '🔥🔥🔥 CHÁY BÙNG!!!',
    '⭐⭐⭐ SIÊU PHẨM!!!',
    '🎉🎉🎉 NỔ RỒI CÁC CHÁU ƠI!!!'
];

/**
 * Win tier messages
 */
const WIN_MESSAGES = {
    JACKPOT: JACKPOT_MESSAGES,
    BIG_WIN: ['🎊 THẮNG LỚN!', '💎 BIG WIN!', '🌟 TUYỆT VỜI!'],
    NICE_WIN: ['✨ Tốt lắm!', '😄 Ngon!', '👏 Hay đấy!'],
    SMALL_WIN: ['😊 Có thêm ít!', '👍 Được đấy!', '💫 Lãi nhẹ!'],
    TWO_MATCH: ['🎯 2 khớp!', '👀 Gần gần!', '💡 Có điểm!']
};

/**
 * Get slot symbols from config
 * @returns {Object}
 */
function getSymbols() {
    return config.casino.slots.symbols;
}

/**
 * Get or create player session
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerSession(discordId) {
    if (!playerSessions.has(discordId)) {
        playerSessions.set(discordId, {
            spins: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastJackpot: null,
            bonusSpins: 0, // Free spins earned
            luckyMeter: 0, // Builds up for bonus
            nearMisses: 0, // Track near misses for excitement
            lastSpinTime: null
        });
    }
    return playerSessions.get(discordId);
}

/**
 * Spin single reel
 * @returns {string}
 */
function spinReel() {
    const symbols = getSymbols();
    const weights = {};

    for (const [symbol, data] of Object.entries(symbols)) {
        weights[symbol] = data.weight;
    }

    return weightedRandom(weights);
}

/**
 * Spin all reels with near-miss detection
 * @param {number} reelCount
 * @returns {Object} - Contains reels and nearMiss info
 */
function spinAllReels(reelCount = 3) {
    const reels = [];
    for (let i = 0; i < reelCount; i++) {
        reels.push(spinReel());
    }
    
    // Detect near-miss situations
    const nearMissInfo = detectNearMiss(reels);
    
    return { reels, nearMissInfo };
}

/**
 * Detect near-miss situations for excitement
 * @param {Array} reels
 * @returns {Object}
 */
function detectNearMiss(reels) {
    const symbols = getSymbols();
    
    // Check if 2 symbols match and 3rd is different
    if (reels[0] === reels[1] && reels[2] !== reels[0]) {
        const missedSymbol = reels[0];
        return {
            isNearMiss: true,
            type: 'TWO_LEFT_MATCH',
            missedSymbol,
            missedMultiplier: symbols[missedSymbol].value,
            message: NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)]
        };
    }
    if (reels[1] === reels[2] && reels[0] !== reels[1]) {
        const missedSymbol = reels[1];
        return {
            isNearMiss: true,
            type: 'TWO_RIGHT_MATCH',
            missedSymbol,
            missedMultiplier: symbols[missedSymbol].value,
            message: NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)]
        };
    }
    if (reels[0] === reels[2] && reels[1] !== reels[0]) {
        const missedSymbol = reels[0];
        return {
            isNearMiss: true,
            type: 'OUTER_MATCH',
            missedSymbol,
            missedMultiplier: symbols[missedSymbol].value,
            message: NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)]
        };
    }
    
    return { isNearMiss: false };
}

/**
 * Check if all symbols match
 * @param {Array} reels
 * @returns {boolean}
 */
function isWinningCombination(reels) {
    return reels.every(symbol => symbol === reels[0]);
}

/**
 * Check if 2 symbols match
 * @param {Array} reels
 * @returns {boolean}
 */
function isTwoMatch(reels) {
    return reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2];
}

/**
 * Calculate multiplier based on result
 * CÂN BẰNG KINH TẾ v3.0: Giảm 2-match bonus để đạt ~90% RTP
 * @param {Array} reels
 * @returns {number}
 */
function calculateMultiplier(reels) {
    const symbols = getSymbols();

    if (isWinningCombination(reels)) {
        return symbols[reels[0]].value;
    }

    if (isTwoMatch(reels)) {
        // Find matching symbol
        // BALANCE v3.0: Giảm từ /4 xuống /5 để RTP ~90%
        const matchSymbol = reels[0] === reels[1] ? reels[0] :
            reels[1] === reels[2] ? reels[1] : reels[0];
        return Math.floor(symbols[matchSymbol].value / 5);
    }

    return 0;
}

/**
 * Categorize win for appropriate message
 * @param {number} multiplier
 * @param {boolean} isJackpot
 * @returns {string}
 */
function categorizeWin(multiplier, isJackpot) {
    if (isJackpot) return 'JACKPOT';
    if (multiplier >= 50) return 'BIG_WIN';
    if (multiplier >= 10) return 'NICE_WIN';
    if (multiplier >= 2) return 'SMALL_WIN';
    if (multiplier > 0) return 'TWO_MATCH';
    return 'LOSS';
}

/**
 * Calculate lucky meter bonus (builds excitement)
 * @param {Object} session
 * @param {boolean} isWin
 * @returns {number}
 */
function updateLuckyMeter(session, isWin) {
    if (isWin) {
        session.luckyMeter = Math.max(0, session.luckyMeter - 20);
    } else {
        session.luckyMeter = Math.min(100, session.luckyMeter + 5);
    }
    
    // Award bonus spin when meter fills
    if (session.luckyMeter >= 100) {
        session.luckyMeter = 0;
        session.bonusSpins++;
        return 1; // Bonus spin awarded
    }
    return 0;
}

/**
 * Play slots - Main enhanced game function
 * @param {string} discordId
 * @param {number} betAmount
 * @param {boolean} useBonusSpin - Use free spin if available
 * @returns {Object}
 */
function play(discordId, betAmount, useBonusSpin = false) {
    const { minBet, maxBet } = config.casino;
    const session = getPlayerSession(discordId);

    // Track if bonus spin was actually used
    let actuallyUsedBonusSpin = false;

    // Check if using bonus spin
    if (useBonusSpin && session.bonusSpins > 0) {
        session.bonusSpins--;
        betAmount = Math.min(betAmount, 1000); // Cap bonus spin bet
        actuallyUsedBonusSpin = true;
    } else {
        // Normal bet validation
        if (betAmount < minBet) {
            return { error: 'bet_too_low', minBet };
        }
        if (betAmount > maxBet) {
            return { error: 'bet_too_high', maxBet };
        }
        if (!economyManager.canAfford(discordId, betAmount)) {
            return { error: 'insufficient_balance' };
        }

        // Deduct bet
        economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Slots cược');
    }

    // Perform spin
    const { reels, nearMissInfo } = spinAllReels(3);
    const multiplier = calculateMultiplier(reels);
    const isJackpot = isWinningCombination(reels) && reels[0] === '🎰';
    const isWin = multiplier > 0;
    
    // Calculate winnings with streak bonus
    let winnings = betAmount * multiplier;
    let streakBonus = 0;
    
    // Apply streak bonus (max 15% extra)
    if (isWin && session.currentStreak > 0) {
        const bonusPercent = Math.min(session.currentStreak * 0.03, 0.15);
        streakBonus = Math.floor(winnings * bonusPercent);
        winnings += streakBonus;
    }

    if (winnings > 0) {
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, `Slots x${multiplier}`);
    }

    // Update session stats
    session.spins++;
    session.totalWagered += betAmount;
    session.lastSpinTime = Date.now();
    
    if (isWin) {
        session.wins++;
        session.totalWon += winnings;
        session.currentStreak++;
        session.maxStreak = Math.max(session.maxStreak, session.currentStreak);
        if (isJackpot) {
            session.lastJackpot = {
                time: Date.now(),
                amount: winnings,
                reels: [...reels]
            };
        }
    } else {
        session.losses++;
        session.currentStreak = 0;
        if (nearMissInfo.isNearMiss) {
            session.nearMisses++;
        }
    }
    
    // Update lucky meter
    const bonusSpinAwarded = updateLuckyMeter(session, isWin);

    // Award XP
    let xpAction = 'SLOTS_PLAY';
    if (isJackpot) {
        xpAction = 'SLOTS_JACKPOT';
    } else if (multiplier > 0) {
        xpAction = 'SLOTS_WIN';
    }
    
    const xpResult = levelManager.awardXP(discordId, xpAction);

    // Get appropriate win message
    const winCategory = categorizeWin(multiplier, isJackpot);
    const messages = WIN_MESSAGES[winCategory];
    const resultMessage = messages ? messages[Math.floor(Math.random() * messages.length)] : '';

    return {
        reels,
        multiplier,
        betAmount,
        winnings,
        streakBonus,
        isJackpot,
        isWin,
        // Near miss info
        nearMiss: nearMissInfo,
        // Win categorization
        winCategory,
        resultMessage,
        // Session stats
        session: {
            spins: session.spins,
            wins: session.wins,
            currentStreak: session.currentStreak,
            maxStreak: session.maxStreak,
            luckyMeter: session.luckyMeter,
            bonusSpins: session.bonusSpins,
            totalWagered: session.totalWagered,
            totalWon: session.totalWon,
            profit: session.totalWon - session.totalWagered,
            totalSpins: session.spins,
            winRate: session.spins > 0 ? Math.round((session.wins / session.spins) * 100) : 0
        },
        bonusSpinAwarded: bonusSpinAwarded > 0,
        usedBonusSpin: actuallyUsedBonusSpin,
        // XP info
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };
}

/**
 * Format reels for display (with animation frames)
 * @param {Array} reels
 * @returns {string}
 */
function formatReels(reels) {
    return `[ ${reels.join(' | ')} ]`;
}

/**
 * Get spinning animation frame
 * @param {number} frameIndex
 * @returns {string}
 */
function getSpinFrame(frameIndex) {
    const frame = SPIN_FRAMES[frameIndex % SPIN_FRAMES.length];
    return formatReels(frame);
}

/**
 * Get result message
 * @param {Object} result
 * @returns {string}
 */
function getResultMessage(result) {
    let message = '';
    
    if (result.isJackpot) {
        message = `${result.resultMessage || JACKPOT_MESSAGES[0]} x${result.multiplier}`;
    } else if (result.isWin) {
        message = `${result.resultMessage || '✨ Thắng!'} x${result.multiplier}`;
        if (result.streakBonus > 0) {
            message += `\n🔥 Streak Bonus: +${result.streakBonus.toLocaleString()}`;
        }
    } else {
        if (result.nearMiss?.isNearMiss) {
            message = result.nearMiss.message;
        } else {
            message = '😔 Chưa trúng, thử lại nhé!';
        }
    }
    
    // Add bonus spin notification
    if (result.bonusSpinAwarded) {
        message += '\n\n🎁 **BONUS!** Bạn được 1 lượt quay miễn phí!';
    }
    
    return message;
}

/**
 * Get paytable
 * @returns {Array}
 */
function getPaytable() {
    const symbols = getSymbols();
    const table = [];

    for (const [symbol, data] of Object.entries(symbols)) {
        table.push({
            symbol,
            threeMatch: `x${data.value}`,
            twoMatch: `x${Math.floor(data.value / 5)}`
        });
    }

    return table.sort((a, b) => {
        const aVal = parseInt(a.threeMatch.slice(1));
        const bVal = parseInt(b.threeMatch.slice(1));
        return bVal - aVal;
    });
}

/**
 * Format paytable for display
 * @returns {string}
 */
function formatPaytable() {
    const table = getPaytable();
    let text = '**Bảng thưởng:**\n';

    for (const row of table.slice(0, 5)) {
        text += `${row.symbol}${row.symbol}${row.symbol} = ${row.threeMatch}\n`;
    }

    return text;
}

/**
 * Get session stats for display
 * @param {string} discordId
 * @returns {Object}
 */
function getSessionStats(discordId) {
    const session = getPlayerSession(discordId);
    return {
        ...session,
        winRate: session.spins > 0 ? Math.round((session.wins / session.spins) * 100) : 0,
        profit: session.totalWon - session.totalWagered,
        avgBet: session.spins > 0 ? Math.round(session.totalWagered / session.spins) : 0
    };
}

/**
 * Get lucky meter display
 * @param {number} meter
 * @returns {string}
 */
function getLuckyMeterDisplay(meter) {
    const filled = Math.floor(meter / 10);
    const empty = 10 - filled;
    return `[${'🟩'.repeat(filled)}${'⬜'.repeat(empty)}] ${meter}%`;
}

/**
 * Check if player has bonus spins
 * @param {string} discordId
 * @returns {number}
 */
function getBonusSpins(discordId) {
    const session = getPlayerSession(discordId);
    return session.bonusSpins;
}

module.exports = {
    spinReel,
    spinAllReels,
    isWinningCombination,
    isTwoMatch,
    calculateMultiplier,
    play,
    formatReels,
    getSpinFrame,
    getResultMessage,
    getPaytable,
    formatPaytable,
    getSessionStats,
    getLuckyMeterDisplay,
    getBonusSpins,
    SPIN_FRAMES
};
