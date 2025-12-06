const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Cooldowns
// CÂN BẰNG KINH TẾ v2.0: Tăng cooldown để ngăn spam
const cooldowns = new Map();
const COOLDOWN_MS = 15000; // 15 seconds - user request

// Store player sessions
const playerSessions = new Map();

// Global roll history for pattern analysis
const rollHistory = [];
const MAX_ROLL_HISTORY = 100;

/**
 * TÀI XỈU - Trò chơi xúc xắc Việt Nam
 * 
 * Luật chơi:
 * - 3 xúc xắc, tổng từ 3-18
 * - Tài: Tổng 11-17, bộ ba = thua
 * - Xỉu: Tổng 4-10, bộ ba = thua
 * - Chẵn/Lẻ: Như trên, bộ ba = thua
 * - Bộ ba cụ thể: Cả 3 xúc xắc giống (1-1-1, 2-2-2, etc.)
 * - Bất kỳ bộ ba: Bất kỳ bộ ba nào
 * - Tổng cụ thể: Đoán đúng tổng (4-17)
 * 
 * Hệ số được tính toán để có house edge ~2.8-5% (chống lạm phát)
 */

// Dice rolling animation frames
const DICE_ANIMATION = {
    ROLLING: ['🎲', '🎰', '🎲', '🎰', '🎲'],
    BOUNCING: ['⬆️', '↗️', '➡️', '↘️', '⬇️'],
    SETTLING: ['💨', '✨', '💫', '⭐', '🎯']
};

// Exciting win messages by result type
const WIN_MESSAGES = {
    basic: [
        '✨ Đúng rồi!',
        '🎉 Thắng đẹp!',
        '👍 Hay lắm!',
        '🔥 Xuất sắc!'
    ],
    triple: [
        '🎰🎰🎰 TRIPLE!!!',
        '💎💎💎 BỘ BA HOÀN HẢO!',
        '🌟🌟🌟 INCREDIBLE TRIPLE!',
        '👑👑👑 JACKPOT TRIPLE!'
    ],
    exactTotal: [
        '🎯 ĐÚNG TỔNG!',
        '🧠 THÁNH ĐOÁN!',
        '📊 Tính toán chính xác!',
        '💰 Đoán như thần!'
    ]
};

// Lose messages with encouragement
const LOSE_MESSAGES = [
    '😢 Tiếc quá!',
    '💪 Cố lên!',
    '🍀 Lần sau sẽ may mắn hơn!',
    '🔄 Thử lại nào!'
];

// Near-miss excitement
const NEAR_MISS_MESSAGES = [
    '😱 Suýt trúng!',
    '🔥 Gần lắm rồi!',
    '💨 Thiếu 1 chút!',
    '😤 Chỉ thiếu 1!'
];

// Triple excitement messages
const TRIPLE_EXCITEMENT = {
    1: '☠️ TRIPLE 1 - Con số TỬ THẦN!',
    2: '✌️ TRIPLE 2 - ĐÔI HOÀN HẢO!',
    3: '🍀 TRIPLE 3 - MAY MẮN BA!',
    4: '🏆 TRIPLE 4 - TỨ QUÝ!',
    5: '✋ TRIPLE 5 - NGŨ LONG!',
    6: '👑 TRIPLE 6 - LỤC ĐỈNH CAO!'
};

// Bet options với multiplier - FIXED: Match displayed UI values
const BET_OPTIONS = {
    // === CƠ BẢN (x2 như hiển thị trên UI) ===
    TAI: {
        id: 'tai',
        name: '🔴 Tài (11-17)',
        description: 'Tổng 11-17, bộ ba = thua',
        multiplier: 2.0,  // FIXED: x2 as displayed
        category: 'basic'
    },
    XIU: {
        id: 'xiu',
        name: '🔵 Xỉu (4-10)',
        description: 'Tổng 4-10, bộ ba = thua',
        multiplier: 2.0,  // FIXED: x2 as displayed
        category: 'basic'
    },
    CHAN: {
        id: 'chan',
        name: '⚫ Chẵn',
        description: 'Tổng chẵn, bộ ba = thua',
        multiplier: 2.0,  // FIXED: x2 as displayed
        category: 'basic'
    },
    LE: {
        id: 'le',
        name: '⚪ Lẻ',
        description: 'Tổng lẻ, bộ ba = thua',
        multiplier: 2.0,  // FIXED: x2 as displayed
        category: 'basic'
    },

    // === NÂNG CAO (House edge ~5-15%) ===
    ANY_TRIPLE: {
        id: 'any_triple',
        name: '🎰 Bất kỳ Bộ ba',
        description: 'Cả 3 xúc xắc giống nhau (bất kỳ số)',
        multiplier: 28.0,  // True odds 35:1, giảm xuống 28:1 (~20% house edge, cần thiết cho bet hiếm)
        category: 'advanced'
    },
    TRIPLE_1: {
        id: 'triple_1',
        name: '⚀⚀⚀ Bộ ba 1',
        description: 'Cả 3 xúc xắc đều là 1',
        multiplier: 150.0,  // True odds 215:1, giảm xuống 150:1 (~30% house edge)
        category: 'triple'
    },
    TRIPLE_2: {
        id: 'triple_2',
        name: '⚁⚁⚁ Bộ ba 2',
        description: 'Cả 3 xúc xắc đều là 2',
        multiplier: 150.0,
        category: 'triple'
    },
    TRIPLE_3: {
        id: 'triple_3',
        name: '⚂⚂⚂ Bộ ba 3',
        description: 'Cả 3 xúc xắc đều là 3',
        multiplier: 150.0,
        category: 'triple'
    },
    TRIPLE_4: {
        id: 'triple_4',
        name: '⚃⚃⚃ Bộ ba 4',
        description: 'Cả 3 xúc xắc đều là 4',
        multiplier: 150.0,
        category: 'triple'
    },
    TRIPLE_5: {
        id: 'triple_5',
        name: '⚄⚄⚄ Bộ ba 5',
        description: 'Cả 3 xúc xắc đều là 5',
        multiplier: 150.0,
        category: 'triple'
    },
    TRIPLE_6: {
        id: 'triple_6',
        name: '⚅⚅⚅ Bộ ba 6',
        description: 'Cả 3 xúc xắc đều là 6',
        multiplier: 150.0,
        category: 'triple'
    },

    // === TỔNG CỤ THỂ (House edge ~8-15%) ===
    // Xác suất và multiplier dựa trên số cách đạt được tổng đó
    TOTAL_4: {
        id: 'total_4',
        name: '4️⃣ Tổng = 4',
        description: 'Tổng 3 xúc xắc bằng 4',
        multiplier: 50.0,  // 3/216 = 1.39%, true odds ~71:1
        category: 'total'
    },
    TOTAL_5: {
        id: 'total_5',
        name: '5️⃣ Tổng = 5',
        description: 'Tổng 3 xúc xắc bằng 5',
        multiplier: 25.0,  // 6/216 = 2.78%, true odds ~35:1
        category: 'total'
    },
    TOTAL_6: {
        id: 'total_6',
        name: '6️⃣ Tổng = 6',
        description: 'Tổng 3 xúc xắc bằng 6',
        multiplier: 15.0,  // 10/216 = 4.63%, true odds ~20:1
        category: 'total'
    },
    TOTAL_7: {
        id: 'total_7',
        name: '7️⃣ Tổng = 7',
        description: 'Tổng 3 xúc xắc bằng 7',
        multiplier: 10.0,  // 15/216 = 6.94%, true odds ~13:1
        category: 'total'
    },
    TOTAL_8: {
        id: 'total_8',
        name: '8️⃣ Tổng = 8',
        description: 'Tổng 3 xúc xắc bằng 8',
        multiplier: 7.0,   // 21/216 = 9.72%, true odds ~9:1
        category: 'total'
    },
    TOTAL_9: {
        id: 'total_9',
        name: '9️⃣ Tổng = 9',
        description: 'Tổng 3 xúc xắc bằng 9',
        multiplier: 6.0,   // 25/216 = 11.57%, true odds ~7.6:1
        category: 'total'
    },
    TOTAL_10: {
        id: 'total_10',
        name: '🔟 Tổng = 10',
        description: 'Tổng 3 xúc xắc bằng 10',
        multiplier: 5.5,   // 27/216 = 12.5%, true odds ~7:1
        category: 'total'
    },
    TOTAL_11: {
        id: 'total_11',
        name: '1️⃣1️⃣ Tổng = 11',
        description: 'Tổng 3 xúc xắc bằng 11',
        multiplier: 5.5,   // 27/216 = 12.5%
        category: 'total'
    },
    TOTAL_12: {
        id: 'total_12',
        name: '1️⃣2️⃣ Tổng = 12',
        description: 'Tổng 3 xúc xắc bằng 12',
        multiplier: 6.0,   // 25/216 = 11.57%
        category: 'total'
    },
    TOTAL_13: {
        id: 'total_13',
        name: '1️⃣3️⃣ Tổng = 13',
        description: 'Tổng 3 xúc xắc bằng 13',
        multiplier: 7.0,   // 21/216 = 9.72%
        category: 'total'
    },
    TOTAL_14: {
        id: 'total_14',
        name: '1️⃣4️⃣ Tổng = 14',
        description: 'Tổng 3 xúc xắc bằng 14',
        multiplier: 10.0,  // 15/216 = 6.94%
        category: 'total'
    },
    TOTAL_15: {
        id: 'total_15',
        name: '1️⃣5️⃣ Tổng = 15',
        description: 'Tổng 3 xúc xắc bằng 15',
        multiplier: 15.0,  // 10/216 = 4.63%
        category: 'total'
    },
    TOTAL_16: {
        id: 'total_16',
        name: '1️⃣6️⃣ Tổng = 16',
        description: 'Tổng 3 xúc xắc bằng 16',
        multiplier: 25.0,  // 6/216 = 2.78%
        category: 'total'
    },
    TOTAL_17: {
        id: 'total_17',
        name: '1️⃣7️⃣ Tổng = 17',
        description: 'Tổng 3 xúc xắc bằng 17',
        multiplier: 50.0,  // 3/216 = 1.39%
        category: 'total'
    }
};

// Bet categories để dễ hiển thị UI
const BET_CATEGORIES = {
    basic: {
        name: 'Cơ bản',
        description: 'Tỷ lệ thắng cao, thưởng x2',
        bets: ['TAI', 'XIU', 'CHAN', 'LE']
    },
    advanced: {
        name: 'Nâng cao',
        description: 'Rủi ro cao, thưởng lớn',
        bets: ['ANY_TRIPLE']
    },
    triple: {
        name: 'Bộ ba',
        description: 'Cả 3 xúc xắc giống, thưởng x150',
        bets: ['TRIPLE_1', 'TRIPLE_2', 'TRIPLE_3', 'TRIPLE_4', 'TRIPLE_5', 'TRIPLE_6']
    },
    total: {
        name: 'Tổng cụ thể',
        description: 'Đoán đúng tổng 3 xúc xắc',
        bets: ['TOTAL_4', 'TOTAL_5', 'TOTAL_6', 'TOTAL_7', 'TOTAL_8', 'TOTAL_9', 'TOTAL_10', 'TOTAL_11', 'TOTAL_12', 'TOTAL_13', 'TOTAL_14', 'TOTAL_15', 'TOTAL_16', 'TOTAL_17']
    }
};

/**
 * Get or create player session
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerSession(discordId) {
    if (!playerSessions.has(discordId)) {
        playerSessions.set(discordId, {
            totalRolls: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            biggestMultiplier: 0,
            currentStreak: 0,
            bestStreak: 0,
            tripleCount: 0,
            taiCount: 0,
            xiuCount: 0,
            exactTotalWins: 0,
            favoriteNumber: null,
            luckyDice: new Map(), // Track which dice values appear most
            predictions: { correct: 0, total: 0 }, // Prediction accuracy
            lastBets: [] // Last 10 bet types
        });
    }
    return playerSessions.get(discordId);
}

/**
 * Generate dice rolling animation frames
 * @param {Array} finalDice - The final dice values
 * @returns {Array}
 */
function generateDiceAnimation(finalDice) {
    const frames = [];

    // Rolling phase - random dice rapidly
    for (let i = 0; i < 5; i++) {
        frames.push({
            phase: 'ROLLING',
            dice: [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)],
            emoji: DICE_ANIMATION.ROLLING[i],
            message: '🎲 Đang lắc...'
        });
    }

    // Bouncing phase - dice settling
    for (let i = 0; i < 3; i++) {
        const partialDice = [
            i >= 1 ? finalDice[0] : randomInt(1, 6),
            i >= 2 ? finalDice[1] : randomInt(1, 6),
            randomInt(1, 6)
        ];
        frames.push({
            phase: 'BOUNCING',
            dice: partialDice,
            emoji: DICE_ANIMATION.BOUNCING[i],
            message: '💫 Xúc xắc đang lăn...'
        });
    }

    // Settling phase - reveal final dice one by one
    frames.push({
        phase: 'SETTLING',
        dice: [finalDice[0], finalDice[1], randomInt(1, 6)],
        emoji: DICE_ANIMATION.SETTLING[3],
        message: '⭐ Sắp ra kết quả...'
    });

    // Final reveal
    frames.push({
        phase: 'FINAL',
        dice: finalDice,
        emoji: '🎯',
        message: `Tổng: ${finalDice[0] + finalDice[1] + finalDice[2]}`,
        isFinal: true
    });

    return frames;
}

/**
 * Analyze roll history for patterns
 * @returns {Object}
 */
function analyzeRollHistory() {
    if (rollHistory.length < 10) {
        return {
            taiStreak: 0,
            xiuStreak: 0,
            tripleHistory: [],
            hotNumbers: [],
            coldNumbers: [],
            avgTotal: 10.5,
            patterns: []
        };
    }

    const recent = rollHistory.slice(0, 50);

    // Count Tài/Xỉu streaks
    let taiStreak = 0, xiuStreak = 0;
    for (const roll of recent) {
        if (roll.total >= 11 && roll.total <= 17 && !roll.isTriple) {
            taiStreak++;
            if (xiuStreak > 0) break;
        } else if (roll.total >= 4 && roll.total <= 10 && !roll.isTriple) {
            xiuStreak++;
            if (taiStreak > 0) break;
        } else {
            break;
        }
    }

    // Find triple history
    const tripleHistory = recent.filter(r => r.isTriple).slice(0, 5);

    // Count number frequencies
    const numberCounts = new Map();
    for (let i = 1; i <= 6; i++) numberCounts.set(i, 0);
    recent.forEach(r => {
        r.dice.forEach(d => numberCounts.set(d, numberCounts.get(d) + 1));
    });

    const sortedNumbers = [...numberCounts.entries()].sort((a, b) => b[1] - a[1]);
    const hotNumbers = sortedNumbers.slice(0, 2).map(([num]) => num);
    const coldNumbers = sortedNumbers.slice(-2).map(([num]) => num);

    // Calculate average total
    const avgTotal = recent.reduce((sum, r) => sum + r.total, 0) / recent.length;

    // Detect patterns
    const patterns = [];
    if (taiStreak >= 4) patterns.push({ type: 'tai_hot', message: `🔴 Tài streak: ${taiStreak}!` });
    if (xiuStreak >= 4) patterns.push({ type: 'xiu_hot', message: `🔵 Xỉu streak: ${xiuStreak}!` });
    if (avgTotal > 11) patterns.push({ type: 'high_avg', message: '📈 Tổng đang cao' });
    if (avgTotal < 10) patterns.push({ type: 'low_avg', message: '📉 Tổng đang thấp' });

    return {
        taiStreak,
        xiuStreak,
        tripleHistory,
        hotNumbers,
        coldNumbers,
        avgTotal: Math.round(avgTotal * 10) / 10,
        patterns,
        recentResults: recent.slice(0, 10).map(r => ({
            dice: r.dice,
            total: r.total,
            isTriple: r.isTriple,
            isTai: r.total >= 11 && r.total <= 17 && !r.isTriple,
            isXiu: r.total >= 4 && r.total <= 10 && !r.isTriple
        }))
    };
}

/**
 * Check if bet is a near-miss
 * @param {string} betType
 * @param {number} total
 * @param {boolean} isTriple
 * @returns {boolean}
 */
function isNearMiss(betType, total, isTriple) {
    const upper = betType.toUpperCase();

    // Tài/Xỉu near-miss: Lost by 1 or triple killed the win
    if (upper === 'TAI') {
        return total === 10 || (isTriple && total >= 11);
    }
    if (upper === 'XIU') {
        return total === 11 || (isTriple && total <= 10);
    }

    // Total bet near-miss: Off by 1
    if (upper.startsWith('TOTAL_')) {
        const target = parseInt(upper.replace('TOTAL_', ''));
        return Math.abs(total - target) === 1;
    }

    return false;
}

/**
 * Get streak bonus multiplier
 * @param {number} streak
 * @returns {number}
 */
function getStreakBonus(streak) {
    if (streak < 3) return 0;
    // 2% bonus per win after 3, max 15%
    return Math.min((streak - 2) * 0.02, 0.15);
}

/**
 * Roll dice - Main game function with enhanced features
 * @param {string} discordId 
 * @param {string} betType 
 * @param {number} betAmount 
 * @returns {Object}
 */
function rollDice(discordId, betType, betAmount) {
    const bet = BET_OPTIONS[betType.toUpperCase()];
    if (!bet) {
        return { error: 'invalid_bet' };
    }

    // Check cooldown
    const lastRoll = cooldowns.get(discordId);
    if (lastRoll && Date.now() - lastRoll < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastRoll)) / 1000);
        return { error: 'cooldown', remaining };
    }

    // Validate bet amount
    const { minBet, maxBet } = config.casino;
    if (betAmount < minBet) {
        return { error: 'bet_too_low', min: minBet };
    }
    if (betAmount > maxBet) {
        return { error: 'bet_too_high', max: maxBet };
    }

    // Check balance
    if (!economyManager.canAfford(discordId, betAmount)) {
        return { error: 'insufficient_balance' };
    }

    // Get session for tracking
    const session = getPlayerSession(discordId);
    session.totalRolls++;
    session.totalWagered += betAmount;

    // Track bet types
    session.lastBets.unshift(betType.toUpperCase());
    if (session.lastBets.length > 10) session.lastBets.pop();

    // Deduct bet
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, `Tài Xỉu: ${bet.name}`);

    // Roll three dice
    const die1 = randomInt(1, 6);
    const die2 = randomInt(1, 6);
    const die3 = randomInt(1, 6);
    const dice = [die1, die2, die3];
    const total = die1 + die2 + die3;

    // Check for triple (all same)
    const isTriple = die1 === die2 && die2 === die3;
    const tripleValue = isTriple ? die1 : null;

    // Generate dice animation
    const diceAnimation = generateDiceAnimation(dice);

    // Track dice frequency
    dice.forEach(d => {
        session.luckyDice.set(d, (session.luckyDice.get(d) || 0) + 1);
    });

    // Determine win based on bet type
    let won = false;
    let resultDescription = '';
    let winMessageCategory = 'basic';
    let specialEffect = null;

    switch (betType.toUpperCase()) {
        // Basic bets - Triple loses
        case 'TAI':
            session.taiCount++;
            if (isTriple) {
                resultDescription = '❌ Triple! Tài thua khi có Triple.';
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
            } else if (total >= 11 && total <= 17) {
                won = true;
                resultDescription = `✅ Tổng ${total} nằm trong Tài (11-17)!`;
            } else {
                resultDescription = `❌ Tổng ${total} không nằm trong Tài (11-17).`;
            }
            break;

        case 'XIU':
            session.xiuCount++;
            if (isTriple) {
                resultDescription = '❌ Triple! Xỉu thua khi có Triple.';
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
            } else if (total >= 4 && total <= 10) {
                won = true;
                resultDescription = `✅ Tổng ${total} nằm trong Xỉu (4-10)!`;
            } else {
                resultDescription = `❌ Tổng ${total} không nằm trong Xỉu (4-10).`;
            }
            break;

        case 'CHAN':
            if (isTriple) {
                resultDescription = '❌ Triple! Chẵn thua khi có Triple.';
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
            } else if (total % 2 === 0) {
                won = true;
                resultDescription = `✅ Tổng ${total} là số CHẴN!`;
            } else {
                resultDescription = `❌ Tổng ${total} là số LẺ.`;
            }
            break;

        case 'LE':
            if (isTriple) {
                resultDescription = '❌ Triple! Lẻ thua khi có Triple.';
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
            } else if (total % 2 !== 0) {
                won = true;
                resultDescription = `✅ Tổng ${total} là số LẺ!`;
            } else {
                resultDescription = `❌ Tổng ${total} là số CHẴN.`;
            }
            break;

        // Triple bets
        case 'ANY_TRIPLE':
            if (isTriple) {
                won = true;
                winMessageCategory = 'triple';
                resultDescription = `🎰 TRIPLE ${tripleValue}! Bất kỳ Triple thắng!`;
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
                session.tripleCount++;
            } else {
                resultDescription = '❌ Không có Triple.';
            }
            break;

        case 'TRIPLE_1':
        case 'TRIPLE_2':
        case 'TRIPLE_3':
        case 'TRIPLE_4':
        case 'TRIPLE_5':
        case 'TRIPLE_6':
            const targetTriple = parseInt(betType.replace('TRIPLE_', ''));
            if (isTriple && tripleValue === targetTriple) {
                won = true;
                winMessageCategory = 'triple';
                resultDescription = `🎰 TRIPLE ${targetTriple}! Đúng Triple!`;
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
                session.tripleCount++;
            } else if (isTriple) {
                resultDescription = `❌ Triple ${tripleValue}, không phải Triple ${targetTriple}.`;
                specialEffect = TRIPLE_EXCITEMENT[tripleValue];
            } else {
                resultDescription = `❌ Không có Triple (cần Triple ${targetTriple}).`;
            }
            break;

        // Total bets
        default:
            if (betType.toUpperCase().startsWith('TOTAL_')) {
                const targetTotal = parseInt(betType.replace('TOTAL_', '').replace('total_', ''));
                if (total === targetTotal) {
                    won = true;
                    winMessageCategory = 'exactTotal';
                    resultDescription = `🎯 Tổng đúng ${targetTotal}!`;
                    session.exactTotalWins++;
                } else {
                    resultDescription = `❌ Tổng ${total}, không phải ${targetTotal}.`;
                }
            }
            break;
    }

    // Check for near-miss
    const nearMiss = !won && isNearMiss(betType, total, isTriple);
    const nearMissMessage = nearMiss ?
        NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)] : null;

    // Calculate winnings with streak bonus
    let winnings = 0;
    let profit = -betAmount;
    let streakBonus = 0;

    if (won) {
        session.wins++;
        session.currentStreak++;
        session.bestStreak = Math.max(session.bestStreak, session.currentStreak);

        // Apply streak bonus
        const bonusMultiplier = getStreakBonus(session.currentStreak);
        winnings = Math.floor(betAmount * bet.multiplier);

        if (bonusMultiplier > 0) {
            streakBonus = Math.floor(winnings * bonusMultiplier);
            winnings += streakBonus;
        }

        profit = winnings - betAmount;

        session.totalWon += winnings;
        session.biggestWin = Math.max(session.biggestWin, winnings);
        session.biggestMultiplier = Math.max(session.biggestMultiplier, bet.multiplier);

        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, `Tài Xỉu thắng: ${bet.name}`);
    } else {
        session.losses++;
        session.currentStreak = 0;
    }

    // Award XP
    const xpResult = levelManager.awardXP(discordId, won ? 'DICE_WIN' : 'DICE_PLAY');

    // Set cooldown ONLY for winners (losers can play again immediately)
    if (won) {
        cooldowns.set(discordId, Date.now());
    }

    // Update global roll history
    rollHistory.unshift({
        dice,
        total,
        isTriple,
        tripleValue,
        timestamp: Date.now()
    });
    if (rollHistory.length > MAX_ROLL_HISTORY) rollHistory.pop();

    // Get win/lose message
    const winMessage = won ?
        WIN_MESSAGES[winMessageCategory][Math.floor(Math.random() * WIN_MESSAGES[winMessageCategory].length)] :
        LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)];

    // Get analysis
    const analysis = analyzeRollHistory();

    logger.info('Tài Xỉu roll', {
        discordId,
        betType: bet.id,
        betAmount,
        dice,
        total,
        isTriple,
        won,
        winnings
    });

    return {
        dice,          // Array of 3 dice [die1, die2, die3]
        die1,
        die2,
        die3,
        total,
        isTriple,
        tripleValue,
        bet,
        betAmount,
        won,
        winnings,
        profit,
        resultDescription,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null,
        // Enhanced features
        diceAnimation,
        winMessage,
        streakBonus,
        currentStreak: session.currentStreak,
        nearMiss,
        nearMissMessage,
        specialEffect,
        session: {
            totalRolls: session.totalRolls,
            wins: session.wins,
            losses: session.losses,
            winRate: session.totalRolls > 0 ? Math.round((session.wins / session.totalRolls) * 100) : 0,
            profit: session.totalWon - session.totalWagered,
            biggestWin: session.biggestWin,
            tripleCount: session.tripleCount,
            bestStreak: session.bestStreak
        },
        analysis
    };
}

/**
 * Get dice emoji
 * @param {number} value 
 * @returns {string}
 */
function getDiceEmoji(value) {
    const emojis = {
        1: '⚀', 2: '⚁', 3: '⚂',
        4: '⚃', 5: '⚄', 6: '⚅'
    };
    return emojis[value] || '🎲';
}

/**
 * Format dice display (3 dice)
 * @param {Array} dice - Array of 3 dice values
 * @returns {string}
 */
function formatDiceDisplay(dice) {
    return dice.map(d => getDiceEmoji(d)).join(' ');
}

/**
 * Format animated dice frame
 * @param {Object} frame
 * @returns {string}
 */
function formatAnimatedDiceFrame(frame) {
    const diceStr = frame.dice.map(d => getDiceEmoji(d)).join(' ');
    return `${frame.emoji} ${diceStr} ${frame.emoji}\n${frame.message}`;
}

/**
 * Get roll history display
 * @returns {string}
 */
function formatRollHistory() {
    if (rollHistory.length === 0) return 'Chưa có lịch sử';

    return rollHistory.slice(0, 15).map(r => {
        if (r.isTriple) return `🎰${r.total}`;
        if (r.total >= 11) return `🔴${r.total}`;
        return `🔵${r.total}`;
    }).join(' ');
}

/**
 * Get session statistics
 * @param {string} discordId
 * @returns {Object}
 */
function getSessionStats(discordId) {
    const session = getPlayerSession(discordId);
    return {
        ...session,
        profit: session.totalWon - session.totalWagered,
        winRate: session.totalRolls > 0
            ? Math.round((session.wins / session.totalRolls) * 100)
            : 0,
        luckyDice: Object.fromEntries(session.luckyDice)
    };
}

/**
 * Get prediction suggestions based on history
 * @returns {Object}
 */
function getPredictionSuggestions() {
    const analysis = analyzeRollHistory();
    const suggestions = [];

    if (analysis.taiStreak >= 4) {
        suggestions.push({
            bet: 'XIU',
            reason: `Tài đã ra ${analysis.taiStreak} lần liên tiếp, Xỉu có thể sắp ra`,
            confidence: 'low' // Gambler's fallacy warning
        });
    }

    if (analysis.xiuStreak >= 4) {
        suggestions.push({
            bet: 'TAI',
            reason: `Xỉu đã ra ${analysis.xiuStreak} lần liên tiếp, Tài có thể sắp ra`,
            confidence: 'low'
        });
    }

    if (analysis.hotNumbers.length > 0) {
        suggestions.push({
            bet: 'ANY_TRIPLE',
            reason: `Số ${analysis.hotNumbers.join(', ')} đang hot - Triple có thể ra`,
            confidence: 'very_low'
        });
    }

    // Safe suggestion
    suggestions.push({
        bet: analysis.avgTotal > 10.5 ? 'TAI' : 'XIU',
        reason: `Trung bình gần đây: ${analysis.avgTotal}`,
        confidence: 'medium'
    });

    return {
        suggestions,
        warning: '⚠️ Lưu ý: Mỗi lần tung xúc xắc đều độc lập. Quá khứ không ảnh hưởng tương lai!'
    };
}

/**
 * Get hot/cold analysis display
 * @returns {string}
 */
function getHotColdDisplay() {
    const analysis = analyzeRollHistory();
    if (analysis.hotNumbers.length === 0) return 'Chưa đủ dữ liệu';

    let display = '🔥 **Số HOT:** ';
    display += analysis.hotNumbers.map(n => getDiceEmoji(n)).join(' ');
    display += '\n❄️ **Số COLD:** ';
    display += analysis.coldNumbers.map(n => getDiceEmoji(n)).join(' ');
    display += `\n📊 **TB Tổng:** ${analysis.avgTotal}`;

    if (analysis.patterns.length > 0) {
        display += '\n📈 **Xu hướng:** ' + analysis.patterns.map(p => p.message).join(', ');
    }

    return display;
}

/**
 * Get bet options
 * @returns {Object}
 */
function getBetOptions() {
    return BET_OPTIONS;
}

/**
 * Get bet categories
 * @returns {Object}
 */
function getBetCategories() {
    return BET_CATEGORIES;
}

/**
 * Get basic bets only
 * @returns {Array}
 */
function getBasicBets() {
    return BET_CATEGORIES.basic.bets.map(key => BET_OPTIONS[key]);
}

/**
 * Get advanced bets
 * @returns {Array}
 */
function getAdvancedBets() {
    return [...BET_CATEGORIES.advanced.bets, ...BET_CATEGORIES.triple.bets].map(key => BET_OPTIONS[key]);
}

/**
 * Get total bets
 * @returns {Array}
 */
function getTotalBets() {
    return BET_CATEGORIES.total.bets.map(key => BET_OPTIONS[key]);
}

/**
 * Get cooldown remaining
 * @param {string} discordId 
 * @returns {number}
 */
function getCooldown(discordId) {
    const lastRoll = cooldowns.get(discordId);
    if (!lastRoll) return 0;

    const remaining = COOLDOWN_MS - (Date.now() - lastRoll);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Get game info for help display
 * @returns {Object}
 */
function getGameInfo() {
    return {
        name: 'Tài Xỉu',
        description: 'Trò chơi xúc xắc truyền thống với 3 xúc xắc',
        rules: [
            '🎲 Tung 3 xúc xắc, tổng từ 3-18',
            '🔴 Tài: Tổng 11-17 (trừ Triple)',
            '🔵 Xỉu: Tổng 4-10 (trừ Triple)',
            '⚫ Chẵn/Lẻ: Tổng chẵn hoặc lẻ (trừ Triple)',
            '🎰 Triple: Cả 3 xúc xắc giống nhau',
            '🎯 Tổng cụ thể: Đoán đúng tổng (4-17)'
        ],
        tips: [
            '💡 Tài/Xỉu/Chẵn/Lẻ có tỷ lệ thắng ~48.6%',
            '💡 Triple cụ thể có tỷ lệ thắng ~0.46%',
            '💡 Khi có Triple, Tài/Xỉu/Chẵn/Lẻ đều thua!',
            '🔥 Win streak 3+ cho bonus tới 15%!'
        ]
    };
}

module.exports = {
    rollDice,
    getDiceEmoji,
    formatDiceDisplay,
    formatAnimatedDiceFrame,
    formatRollHistory,
    getBetOptions,
    getBetCategories,
    getBasicBets,
    getAdvancedBets,
    getTotalBets,
    getCooldown,
    getGameInfo,
    getSessionStats,
    getPredictionSuggestions,
    getHotColdDisplay,
    analyzeRollHistory,
    generateDiceAnimation,
    BET_OPTIONS,
    BET_CATEGORIES
};
