const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES, ROULETTE_REDS, ROULETTE_BLACKS } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');

/**
 * Bet types
 */
const BET_TYPES = {
    STRAIGHT: 'STRAIGHT',    // Single number
    RED: 'RED',
    BLACK: 'BLACK',
    ODD: 'ODD',
    EVEN: 'EVEN',
    LOW: 'LOW',              // 1-18
    HIGH: 'HIGH',            // 19-36
    DOZEN_1: 'DOZEN_1',      // 1-12
    DOZEN_2: 'DOZEN_2',      // 13-24
    DOZEN_3: 'DOZEN_3'       // 25-36
};

/**
 * Store player sessions for analytics
 */
const playerSessions = new Map();

/**
 * Global spin history for hot/cold analysis (shared across all players)
 */
const globalSpinHistory = [];
const MAX_GLOBAL_HISTORY = 100;

/**
 * Visual roulette wheel display positions
 * Theo thứ tự thực tế của bánh xe Roulette châu Âu
 */
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

/**
 * Animation frames cho hiệu ứng quay
 */
const SPIN_PHASES = [
    { phase: 'START', message: '🎡 Bi đang lăn...', emoji: '🔄' },
    { phase: 'SPINNING', message: '🌀 Tốc độ cao!', emoji: '💨' },
    { phase: 'SLOWING', message: '⏱️ Đang chậm lại...', emoji: '🎯' },
    { phase: 'LANDING', message: '📍 Bi sắp dừng!', emoji: '👀' },
    { phase: 'RESULT', message: '🎲 Kết quả!', emoji: '✨' }
];

/**
 * Lucky messages for wins - Enhanced for beginners
 * Tiếng Việt thân thiện, khuyến khích người chơi mới
 */
const WIN_MESSAGES = {
    STRAIGHT: [
        '🎯 PERFECT! Đoán đúng số! Bạn quá giỏi!',
        '💎 SIÊU SAO! Thắng x36 cơ mà!',
        '🔥 INCREDIBLE! Xác suất 1/37, bạn làm được!',
        '⭐ THẦN BÀI! Đúng chính xác số!'
    ],
    COLOR: [
        '🎨 Tuyệt vời! Đúng màu rồi!',
        '✨ Mắt tinh đây! Chọn đúng màu!',
        '👏 Giỏi lắm! Tiếp tục nhé!',
        '🌟 Đỏ/Đen quá dễ với bạn!'
    ],
    EVEN_ODD: [
        '🔢 Đúng chẵn/lẻ rồi!',
        '✅ Chính xác! Bạn thật may mắn!',
        '💫 Hay quá! Tiếp tục chiến thắng!',
        '🎰 Số học của bạn chuẩn lắm!'
    ],
    HALF: [
        '📊 Đúng khoảng số! Giỏi!',
        '📈 Nhỏ hay lớn, bạn đoán chính xác!',
        '🎯 1-18 hay 19-36, bạn biết hết!'
    ],
    DOZEN: [
        '📊 Đúng cột! Nice pick!',
        '🎯 Thắng cột 12 số!',
        '💰 Cột vàng cột bạc!'
    ],
    FIRST_WIN: [
        '🎉 CHIẾN THẮNG ĐẦU TIÊN! Chúc mừng bạn!',
        '🌟 Thắng rồi! Cảm giác tuyệt vời nhỉ?',
        '🎊 Lần đầu mà thắng luôn! Quá may!'
    ],
    STREAK: [
        '🔥 STREAK x{n}! Đang hot!',
        '⚡ {n} thắng liên tiếp! Không dừng lại được!',
        '💪 Win streak! {n} lần THẮNG!'
    ],
    BIG_WIN: [
        '💰 THẮNG LỚN! Giàu rồi!',
        '🤑 Jackpot vibes! Thắng đậm!',
        '💎 BIG WIN! Số tiền khủng!'
    ]
};

/**
 * Get beginner tips based on player experience
 * @param {number} spinCount - Number of spins player has done
 * @returns {string}
 */
function getBeginnerTip(spinCount) {
    const tips = [
        '💡 Đỏ/Đen có tỷ lệ thắng cao nhất (~48.6%)',
        '💡 Số 0 là màu xanh - không thuộc Đỏ hay Đen!',
        '💡 Có thể đặt nhiều cược cùng lúc để tăng cơ hội',
        '💡 Đặt cược nhỏ để chơi lâu hơn, vui hơn!',
        '💡 Chẵn/Lẻ cũng dễ thắng như Đỏ/Đen',
        '💡 1-18 nghĩa là số nhỏ, 19-36 là số lớn',
        '💡 Đoán đúng số thưởng x36 - rất khó nhưng thưởng lớn!',
        '💡 Hãy đặt mức cược phù hợp với số dư của bạn'
    ];
    return tips[spinCount % tips.length];
}

/**
 * Get or create player session
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerSession(discordId) {
    if (!playerSessions.has(discordId)) {
        playerSessions.set(discordId, {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            favoriteNumbers: {},
            lastWinningNumbers: [],
            predictions: { correct: 0, total: 0 }
        });
    }
    return playerSessions.get(discordId);
}

/**
 * Analyze hot and cold numbers from history
 * @returns {Object}
 */
function analyzeHotColdNumbers() {
    if (globalSpinHistory.length < 10) {
        return {
            hot: [],
            cold: [],
            streakNumber: null,
            streakCount: 0
        };
    }

    // Count frequency
    const frequency = {};
    for (let i = 0; i <= 36; i++) {
        frequency[i] = 0;
    }

    globalSpinHistory.slice(0, 50).forEach(num => {
        frequency[num]++;
    });

    // Sort by frequency
    const sorted = Object.entries(frequency)
        .map(([num, count]) => ({ num: parseInt(num), count }))
        .sort((a, b) => b.count - a.count);

    // Detect streak (same number appearing consecutively)
    let streakNumber = null;
    let streakCount = 1;
    for (let i = 0; i < globalSpinHistory.length - 1; i++) {
        if (globalSpinHistory[i] === globalSpinHistory[i + 1]) {
            if (!streakNumber) {
                streakNumber = globalSpinHistory[i];
                streakCount = 2;
            } else if (globalSpinHistory[i] === streakNumber) {
                streakCount++;
            }
        } else if (streakNumber) {
            break;
        }
    }

    return {
        hot: sorted.slice(0, 5).map(x => x.num), // Top 5 hot
        cold: sorted.slice(-5).reverse().map(x => x.num), // Bottom 5 cold
        streakNumber: streakCount >= 2 ? streakNumber : null,
        streakCount
    };
}

/**
 * Get betting suggestions based on patterns
 * @param {Array} history
 * @returns {Object}
 */
function getBettingSuggestions(history) {
    if (history.length < 5) {
        return {
            suggestion: '🎲 Chưa đủ dữ liệu phân tích',
            confidence: 'low',
            patterns: []
        };
    }

    const patterns = [];
    const recent = history.slice(0, 10);

    // Check color pattern
    const recentColors = recent.map(n =>
        n === 0 ? 'G' : ROULETTE_REDS.includes(n) ? 'R' : 'B'
    );
    const redCount = recentColors.filter(c => c === 'R').length;
    const blackCount = recentColors.filter(c => c === 'B').length;

    if (redCount >= 7) {
        patterns.push({ type: 'color_bias', detail: 'Đỏ đang hot! Cân nhắc Đen?', emoji: '⚫' });
    } else if (blackCount >= 7) {
        patterns.push({ type: 'color_bias', detail: 'Đen đang hot! Cân nhắc Đỏ?', emoji: '🔴' });
    }

    // Check odd/even pattern
    const oddCount = recent.filter(n => n > 0 && n % 2 === 1).length;
    if (oddCount >= 8) {
        patterns.push({ type: 'odd_even', detail: 'Lẻ đang thắng nhiều!', emoji: '🔢' });
    } else if (oddCount <= 2) {
        patterns.push({ type: 'odd_even', detail: 'Chẵn đang thắng nhiều!', emoji: '🔢' });
    }

    // Check high/low pattern
    const lowCount = recent.filter(n => n >= 1 && n <= 18).length;
    if (lowCount >= 8) {
        patterns.push({ type: 'high_low', detail: 'Số nhỏ (1-18) đang hot!', emoji: '📉' });
    } else if (lowCount <= 2) {
        patterns.push({ type: 'high_low', detail: 'Số lớn (19-36) đang hot!', emoji: '📈' });
    }

    // Check dozen pattern
    const dozen1 = recent.filter(n => n >= 1 && n <= 12).length;
    const dozen2 = recent.filter(n => n >= 13 && n <= 24).length;
    const dozen3 = recent.filter(n => n >= 25 && n <= 36).length;

    const coldDozen = [
        { d: 1, count: dozen1 },
        { d: 2, count: dozen2 },
        { d: 3, count: dozen3 }
    ].sort((a, b) => a.count - b.count)[0];

    if (coldDozen.count <= 1) {
        patterns.push({
            type: 'dozen',
            detail: `Cột ${coldDozen.d} chưa xuất hiện nhiều`,
            emoji: '📊'
        });
    }

    return {
        suggestion: patterns.length > 0 ? patterns[0].detail : '🎰 Vận may bình thường',
        confidence: patterns.length >= 2 ? 'high' : patterns.length === 1 ? 'medium' : 'low',
        patterns
    };
}

/**
 * Create new roulette game with enhanced features
 * @param {string} discordId
 * @returns {Object}
 */
function createGame(discordId) {
    const session = getPlayerSession(discordId);
    const analysis = analyzeHotColdNumbers();
    const suggestions = getBettingSuggestions(globalSpinHistory);

    return {
        discordId,
        bets: [],
        lastResult: null,
        spinHistory: globalSpinHistory.slice(0, 20),
        // Enhanced features
        session,
        hotNumbers: analysis.hot,
        coldNumbers: analysis.cold,
        streakInfo: analysis.streakNumber ? {
            number: analysis.streakNumber,
            count: analysis.streakCount
        } : null,
        suggestions,
        currentPhase: null,
        quickBets: [], // For favorite/quick bet feature
        betAmount: 50 // Default bet amount
    };
}

/**
 * Place a bet with enhanced tracking
 * @param {Object} game
 * @param {string} betType
 * @param {number} amount
 * @param {number} number - For straight bets
 * @returns {Object}
 */
function placeBet(game, betType, amount, number = null) {
    const { minBet, maxBet } = config.casino;

    if (amount < minBet) {
        return { error: 'bet_too_low', minBet };
    }
    if (amount > maxBet) {
        return { error: 'bet_too_high', maxBet };
    }
    if (!economyManager.canAfford(game.discordId, amount)) {
        return { error: 'insufficient_balance' };
    }

    if (betType === BET_TYPES.STRAIGHT && (number === null || number < 0 || number > 36)) {
        return { error: 'invalid_number' };
    }

    // Deduct bet amount
    economyManager.deductDCoin(game.discordId, amount, TRANSACTION_TYPES.GAME_LOSS, `Roulette: ${betType}`);

    // Track favorite numbers for session
    if (betType === BET_TYPES.STRAIGHT) {
        const session = getPlayerSession(game.discordId);
        session.favoriteNumbers[number] = (session.favoriteNumbers[number] || 0) + 1;
    }

    game.bets.push({
        type: betType,
        amount,
        number,
        timestamp: Date.now()
    });

    return game;
}

/**
 * Add quick bet (repeat last bet pattern)
 * @param {Object} game
 * @returns {Object}
 */
function repeatLastBets(game) {
    if (!game.lastResult || game.lastResult.betResults.length === 0) {
        return { error: 'no_previous_bets' };
    }

    let totalNeeded = 0;
    const betsToPlace = [];

    for (const bet of game.lastResult.betResults) {
        totalNeeded += bet.amount;
        betsToPlace.push({
            type: bet.type,
            amount: bet.amount,
            number: bet.number
        });
    }

    if (!economyManager.canAfford(game.discordId, totalNeeded)) {
        return { error: 'insufficient_balance' };
    }

    // Place all bets
    for (const bet of betsToPlace) {
        placeBet(game, bet.type, bet.amount, bet.number);
    }

    return game;
}

/**
 * Clear all bets
 * @param {Object} game
 * @returns {Object}
 */
function clearBets(game) {
    // Refund all bets
    for (const bet of game.bets) {
        economyManager.addDCoin(game.discordId, bet.amount, TRANSACTION_TYPES.EARN, 'Roulette hoàn cược');
    }
    game.bets = [];
    return game;
}

/**
 * Generate wheel position animation
 * @param {number} winningNumber
 * @returns {Array}
 */
function generateWheelAnimation(winningNumber) {
    const finalPos = WHEEL_ORDER.indexOf(winningNumber);
    const frames = [];

    // Generate 5 animation frames showing the ball's journey
    for (let i = 0; i < 5; i++) {
        const nearbyNumbers = [];
        for (let j = -2; j <= 2; j++) {
            const pos = (finalPos + (5 - i) * 3 + j + WHEEL_ORDER.length) % WHEEL_ORDER.length;
            nearbyNumbers.push(WHEEL_ORDER[pos]);
        }
        frames.push({
            phase: SPIN_PHASES[i],
            nearbyNumbers,
            pointer: 2 // Middle position
        });
    }

    return frames;
}

/**
 * Spin the wheel with enhanced analytics
 * @param {Object} game
 * @returns {Object}
 */
function spin(game) {
    if (game.bets.length === 0) {
        return { error: 'no_bets' };
    }

    const winningNumber = randomInt(0, 36);
    const winningColor = getNumberColor(winningNumber);
    const session = getPlayerSession(game.discordId);

    // Update global history
    globalSpinHistory.unshift(winningNumber);
    if (globalSpinHistory.length > MAX_GLOBAL_HISTORY) {
        globalSpinHistory.pop();
    }

    // Generate animation frames
    const animation = generateWheelAnimation(winningNumber);

    let totalWinnings = 0;
    const betResults = [];
    let biggestSingleWin = 0;
    let winTypes = [];

    for (const bet of game.bets) {
        const result = checkBet(bet, winningNumber);
        betResults.push({
            ...bet,
            won: result.won,
            payout: result.payout,
            winType: result.winType
        });

        if (result.won) {
            winTypes.push(result.winType);
            if (result.payout > biggestSingleWin) {
                biggestSingleWin = result.payout;
            }
        }

        totalWinnings += result.payout;
    }

    if (totalWinnings > 0) {
        economyManager.addDCoin(game.discordId, totalWinnings, TRANSACTION_TYPES.GAME_WIN, `Roulette thắng`);
    }

    // Update session stats
    const totalBet = game.bets.reduce((sum, b) => sum + b.amount, 0);
    session.totalSpins++;
    session.totalWagered += totalBet;
    session.totalWon += totalWinnings;
    session.biggestWin = Math.max(session.biggestWin, totalWinnings);
    session.lastWinningNumbers.unshift(winningNumber);
    if (session.lastWinningNumbers.length > 10) {
        session.lastWinningNumbers.pop();
    }

    // Award XP
    const anyWin = betResults.some(r => r.won);
    const xpResult = levelManager.awardXP(game.discordId, anyWin ? 'ROULETTE_WIN' : 'ROULETTE_PLAY');

    // Generate win message - Enhanced for beginners
    let winMessage = '';
    if (anyWin) {
        // Check for first win ever (special celebration!)
        const isFirstWin = session.totalWon === totalWinnings && session.totalSpins === 1;

        // Check for big win (more than 3x bet)
        const isBigWin = totalWinnings >= totalBet * 3;

        // Pick appropriate message based on context
        if (isFirstWin && WIN_MESSAGES.FIRST_WIN) {
            winMessage = WIN_MESSAGES.FIRST_WIN[Math.floor(Math.random() * WIN_MESSAGES.FIRST_WIN.length)];
        } else if (isBigWin && WIN_MESSAGES.BIG_WIN) {
            winMessage = WIN_MESSAGES.BIG_WIN[Math.floor(Math.random() * WIN_MESSAGES.BIG_WIN.length)];
        } else if (winTypes.includes('STRAIGHT')) {
            winMessage = WIN_MESSAGES.STRAIGHT[Math.floor(Math.random() * WIN_MESSAGES.STRAIGHT.length)];
        } else if (winTypes.includes('COLOR')) {
            winMessage = WIN_MESSAGES.COLOR[Math.floor(Math.random() * WIN_MESSAGES.COLOR.length)];
        } else if (winTypes.includes('HALF') && WIN_MESSAGES.HALF) {
            winMessage = WIN_MESSAGES.HALF[Math.floor(Math.random() * WIN_MESSAGES.HALF.length)];
        } else if (winTypes.includes('DOZEN')) {
            winMessage = WIN_MESSAGES.DOZEN[Math.floor(Math.random() * WIN_MESSAGES.DOZEN.length)];
        } else {
            winMessage = WIN_MESSAGES.EVEN_ODD[Math.floor(Math.random() * WIN_MESSAGES.EVEN_ODD.length)];
        }
    } else {
        // Encouraging message for losses - help beginners stay positive
        const lossMessages = [
            '😅 Chưa may mắn! Thử lại nhé!',
            '🎲 Roulette là may rủi, lần sau sẽ thắng!',
            '💪 Đừng nản! Luck is coming!',
            '🍀 Tiếp tục chơi, vận may sẽ đến!'
        ];
        winMessage = lossMessages[Math.floor(Math.random() * lossMessages.length)];
    }

    // Analyze updated patterns
    const newAnalysis = analyzeHotColdNumbers();
    const newSuggestions = getBettingSuggestions(globalSpinHistory);

    game.lastResult = {
        number: winningNumber,
        color: winningColor,
        betResults,
        totalWinnings,
        totalBet,
        profit: totalWinnings - totalBet,
        animation,
        winMessage,
        // Analytics
        hotNumbers: newAnalysis.hot,
        coldNumbers: newAnalysis.cold,
        streakInfo: newAnalysis.streakNumber ? {
            number: newAnalysis.streakNumber,
            count: newAnalysis.streakCount
        } : null,
        suggestions: newSuggestions,
        // Stats
        sessionStats: {
            spins: session.totalSpins,
            profit: session.totalWon - session.totalWagered,
            biggestWin: session.biggestWin
        },
        // XP
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };

    // Update game state
    game.spinHistory = globalSpinHistory.slice(0, 20);
    game.hotNumbers = newAnalysis.hot;
    game.coldNumbers = newAnalysis.cold;
    game.suggestions = newSuggestions;
    game.bets = [];

    return game;
}

/**
 * Check if bet wins with type tracking
 * @param {Object} bet
 * @param {number} winningNumber
 * @returns {Object}
 */
function checkBet(bet, winningNumber) {
    const { payouts } = config.casino.roulette;
    let won = false;
    let payout = 0;
    let winType = '';

    switch (bet.type) {
        case BET_TYPES.STRAIGHT:
            won = bet.number === winningNumber;
            if (won) {
                payout = bet.amount * (payouts.straight + 1);
                winType = 'STRAIGHT';
            }
            break;

        case BET_TYPES.RED:
            won = ROULETTE_REDS.includes(winningNumber);
            if (won) {
                payout = bet.amount * (payouts.color + 1);
                winType = 'COLOR';
            }
            break;

        case BET_TYPES.BLACK:
            won = ROULETTE_BLACKS.includes(winningNumber);
            if (won) {
                payout = bet.amount * (payouts.color + 1);
                winType = 'COLOR';
            }
            break;

        case BET_TYPES.ODD:
            won = winningNumber > 0 && winningNumber % 2 === 1;
            if (won) {
                payout = bet.amount * (payouts.oddEven + 1);
                winType = 'EVEN_ODD';
            }
            break;

        case BET_TYPES.EVEN:
            won = winningNumber > 0 && winningNumber % 2 === 0;
            if (won) {
                payout = bet.amount * (payouts.oddEven + 1);
                winType = 'EVEN_ODD';
            }
            break;

        case BET_TYPES.LOW:
            won = winningNumber >= 1 && winningNumber <= 18;
            if (won) {
                payout = bet.amount * (payouts.half + 1);
                winType = 'HALF';
            }
            break;

        case BET_TYPES.HIGH:
            won = winningNumber >= 19 && winningNumber <= 36;
            if (won) {
                payout = bet.amount * (payouts.half + 1);
                winType = 'HALF';
            }
            break;

        case BET_TYPES.DOZEN_1:
            won = winningNumber >= 1 && winningNumber <= 12;
            if (won) {
                payout = bet.amount * (payouts.dozen + 1);
                winType = 'DOZEN';
            }
            break;

        case BET_TYPES.DOZEN_2:
            won = winningNumber >= 13 && winningNumber <= 24;
            if (won) {
                payout = bet.amount * (payouts.dozen + 1);
                winType = 'DOZEN';
            }
            break;

        case BET_TYPES.DOZEN_3:
            won = winningNumber >= 25 && winningNumber <= 36;
            if (won) {
                payout = bet.amount * (payouts.dozen + 1);
                winType = 'DOZEN';
            }
            break;
    }

    return { won, payout, winType };
}

/**
 * Get number color
 * @param {number} number
 * @returns {string}
 */
function getNumberColor(number) {
    if (number === 0) return 'GREEN';
    if (ROULETTE_REDS.includes(number)) return 'RED';
    return 'BLACK';
}

/**
 * Get color emoji
 * @param {string} color
 * @returns {string}
 */
function getColorEmoji(color) {
    switch (color) {
        case 'RED': return '🔴';
        case 'BLACK': return '⚫';
        case 'GREEN': return '🟢';
        default: return '⚪';
    }
}

/**
 * Get total current bets
 * @param {Object} game
 * @returns {number}
 */
function getTotalBets(game) {
    return game.bets.reduce((sum, bet) => sum + bet.amount, 0);
}

/**
 * Format bet for display - Enhanced with emojis for beginners
 * @param {Object} bet
 * @returns {string}
 */
function formatBet(bet) {
    const betTypeNames = {
        [BET_TYPES.STRAIGHT]: `🎯 Số ${bet.number}`,
        [BET_TYPES.RED]: '🔴 Đỏ',
        [BET_TYPES.BLACK]: '⚫ Đen',
        [BET_TYPES.ODD]: '🔢 Lẻ',
        [BET_TYPES.EVEN]: '🔢 Chẵn',
        [BET_TYPES.LOW]: '📉 Nhỏ 1-18',
        [BET_TYPES.HIGH]: '📈 Lớn 19-36',
        [BET_TYPES.DOZEN_1]: '📊 Cột 1-12',
        [BET_TYPES.DOZEN_2]: '📊 Cột 13-24',
        [BET_TYPES.DOZEN_3]: '📊 Cột 25-36'
    };

    return `${betTypeNames[bet.type]}: ${bet.amount.toLocaleString()} DCoin`;
}

/**
 * Format spin history with visual display
 * @param {Array} history
 * @returns {string}
 */
function formatHistory(history) {
    if (history.length === 0) return 'Chưa có lịch sử';

    return history.map(n => {
        const color = getNumberColor(n);
        const emoji = getColorEmoji(color);
        return `${emoji}${n}`;
    }).join(' ');
}

/**
 * Get hot/cold numbers display
 * @param {Object} game
 * @returns {string}
 */
function formatHotColdNumbers(game) {
    if (!game.hotNumbers || game.hotNumbers.length === 0) {
        return 'Chưa đủ dữ liệu';
    }

    const hotDisplay = game.hotNumbers.map(n => `${getColorEmoji(getNumberColor(n))}${n}`).join(' ');
    const coldDisplay = game.coldNumbers.map(n => `${getColorEmoji(getNumberColor(n))}${n}`).join(' ');

    return `🔥 Hot: ${hotDisplay}\n❄️ Cold: ${coldDisplay}`;
}

/**
 * Get wheel section display (visual)
 * @param {number} centerNumber
 * @returns {string}
 */
function getWheelSection(centerNumber) {
    const pos = WHEEL_ORDER.indexOf(centerNumber);
    const display = [];

    for (let i = -3; i <= 3; i++) {
        const idx = (pos + i + WHEEL_ORDER.length) % WHEEL_ORDER.length;
        const num = WHEEL_ORDER[idx];
        const emoji = getColorEmoji(getNumberColor(num));

        if (i === 0) {
            display.push(`【${emoji}${num}】`);
        } else {
            display.push(`${emoji}${num}`);
        }
    }

    return display.join(' ');
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
        winRate: session.totalSpins > 0
            ? Math.round((session.totalWon / session.totalWagered) * 100)
            : 0
    };
}

module.exports = {
    BET_TYPES,
    createGame,
    placeBet,
    repeatLastBets,
    clearBets,
    spin,
    getNumberColor,
    getColorEmoji,
    getTotalBets,
    formatBet,
    formatHistory,
    formatHotColdNumbers,
    getWheelSection,
    analyzeHotColdNumbers,
    getBettingSuggestions,
    getSessionStats,
    getBeginnerTip,
    SPIN_PHASES,
    WHEEL_ORDER
};
