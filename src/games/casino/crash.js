const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');

// Store active crash games
const activeGames = new Map();

// Store player sessions for stats
const playerSessions = new Map();

// Global crash history for analysis
const crashHistory = [];
const MAX_CRASH_HISTORY = 50;

// Game settings for balance
const CRASH_CONFIG = {
    minBet: 10,
    maxBet: 1000000,
    houseEdge: 0.04, // 4% house edge
    maxMultiplier: 10, // Cap at x10 to prevent inflation
    stepTime: 500, // ms between multiplier increases
    startMultiplier: 1.00,
    multiplierIncrement: 0.05
};

/**
 * Multiplier visual thresholds with emojis and colors
 */
const MULTIPLIER_TIERS = [
    { min: 1.00, max: 1.49, emoji: '🟢', color: 'green', name: 'An toàn', risk: 'LOW' },
    { min: 1.50, max: 1.99, emoji: '🟡', color: 'yellow', name: 'Cẩn thận', risk: 'MEDIUM' },
    { min: 2.00, max: 2.99, emoji: '🟠', color: 'orange', name: 'Nguy hiểm', risk: 'HIGH' },
    { min: 3.00, max: 4.99, emoji: '🔴', color: 'red', name: 'Rất nguy', risk: 'VERY_HIGH' },
    { min: 5.00, max: 9.99, emoji: '💀', color: 'black', name: 'TỬ THẦN', risk: 'EXTREME' },
    { min: 10.00, max: 999, emoji: '🌟', color: 'gold', name: 'HUYỀN THOẠI', risk: 'LEGENDARY' }
];

/**
 * Tension messages during multiplier climb
 */
const TENSION_MESSAGES = {
    LOW: ['📈 Đang lên...', '🚀 Cất cánh!', '✨ Khởi đầu tốt!'],
    MEDIUM: ['😰 Hơi căng...', '🔥 Nóng dần!', '👀 Để ý nha!'],
    HIGH: ['😱 NGUY HIỂM!', '💨 Nhanh quá!', '🎢 Điên rồi!'],
    VERY_HIGH: ['🚨 CỰC KỲ NGUY!', '💀 CHẠY ĐI!', '🔥🔥🔥 QUÁ NÓNG!'],
    EXTREME: ['☠️ TỬ THẦN GỌI!', '🌋 BÙNG NỔ SẮP TỚI!', '👻 RIP incoming...']
};

/**
 * Get current multiplier tier info
 * @param {number} multiplier
 * @returns {Object}
 */
function getMultiplierTier(multiplier) {
    for (const tier of MULTIPLIER_TIERS) {
        if (multiplier >= tier.min && multiplier < tier.max) {
            return tier;
        }
    }
    return MULTIPLIER_TIERS[MULTIPLIER_TIERS.length - 1];
}

/**
 * Get or create player session
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerSession(discordId) {
    if (!playerSessions.has(discordId)) {
        playerSessions.set(discordId, {
            totalGames: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            biggestMultiplier: 0,
            avgCashout: 0,
            cashoutHistory: [],
            autoCashout: null, // Player's preferred auto-cashout
            favoriteTarget: 2.0 // Most used target
        });
    }
    return playerSessions.get(discordId);
}

/**
 * Analyze crash history for patterns
 * @returns {Object}
 */
function analyzeCrashHistory() {
    if (crashHistory.length < 5) {
        return {
            avgCrash: 0,
            recentTrend: 'unknown',
            safeCashout: 1.5,
            dangerZone: 3.0,
            patterns: []
        };
    }

    const recent = crashHistory.slice(0, 20);
    const avg = recent.reduce((sum, c) => sum + c, 0) / recent.length;
    
    // Detect patterns
    const patterns = [];
    
    // Count instant crashes (x1.00)
    const instantCrashes = recent.filter(c => c === 1.00).length;
    if (instantCrashes >= 3) {
        patterns.push({ type: 'many_instant', message: '⚠️ Nhiều crash tức thì gần đây!' });
    }
    
    // Count high multipliers
    const highCrashes = recent.filter(c => c >= 5).length;
    if (highCrashes >= 3) {
        patterns.push({ type: 'high_recent', message: '🌟 Có nhiều x cao gần đây!' });
    }
    
    // Trend analysis
    const first5 = recent.slice(0, 5).reduce((s, c) => s + c, 0) / 5;
    const last5 = recent.slice(-5).reduce((s, c) => s + c, 0) / 5;
    const trend = first5 > last5 ? 'decreasing' : first5 < last5 ? 'increasing' : 'stable';
    
    if (trend === 'decreasing') {
        patterns.push({ type: 'trend_down', message: '📉 Xu hướng giảm' });
    } else if (trend === 'increasing') {
        patterns.push({ type: 'trend_up', message: '📈 Xu hướng tăng' });
    }

    return {
        avgCrash: Math.round(avg * 100) / 100,
        recentTrend: trend,
        safeCashout: Math.min(avg * 0.7, 2.0),
        dangerZone: avg * 1.2,
        patterns,
        lastCrashes: recent.slice(0, 10)
    };
}

/**
 * Generate crash point using provably fair algorithm
 * Uses house edge to ensure long-term profitability
 * @returns {number} - The multiplier at which the game crashes
 */
function generateCrashPoint() {
    const random = Math.random();
    const houseEdge = CRASH_CONFIG.houseEdge;
    
    // Probability-based crash point
    // Higher crash points are less likely
    if (random < houseEdge) {
        // Instant crash (4% chance)
        return 1.00;
    }
    
    // Formula ensures expected value slightly favors house
    // Lower bound is 1.01, upper bound is maxMultiplier
    const e = Math.random();
    const crashPoint = Math.max(1.00, (1 / (1 - e * (1 - houseEdge))));
    
    return Math.min(CRASH_CONFIG.maxMultiplier, Math.floor(crashPoint * 100) / 100);
}

/**
 * Generate multiplier progression frames for animation
 * @param {number} crashPoint
 * @param {number} targetMultiplier
 * @returns {Array}
 */
function generateProgressionFrames(crashPoint, targetMultiplier) {
    const frames = [];
    let current = CRASH_CONFIG.startMultiplier;
    
    while (current < crashPoint && current < targetMultiplier) {
        const tier = getMultiplierTier(current);
        frames.push({
            multiplier: current,
            tier,
            tensionMessage: TENSION_MESSAGES[tier.risk][Math.floor(Math.random() * 3)]
        });
        current = Math.round((current + CRASH_CONFIG.multiplierIncrement) * 100) / 100;
    }
    
    // Final frame
    const finalMultiplier = Math.min(crashPoint, targetMultiplier);
    const finalTier = getMultiplierTier(finalMultiplier);
    frames.push({
        multiplier: finalMultiplier,
        tier: finalTier,
        isFinal: true
    });
    
    return frames;
}

/**
 * Create a new crash game with enhanced features
 * @param {string} discordId
 * @param {number} betAmount
 * @returns {Object}
 */
function createGame(discordId, betAmount) {
    if (betAmount < CRASH_CONFIG.minBet) {
        return { error: 'bet_too_low', minBet: CRASH_CONFIG.minBet };
    }
    if (betAmount > CRASH_CONFIG.maxBet) {
        return { error: 'bet_too_high', maxBet: CRASH_CONFIG.maxBet };
    }
    if (!economyManager.canAfford(discordId, betAmount)) {
        return { error: 'insufficient_balance' };
    }

    // Deduct bet amount
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Crash: Đặt cược');

    const crashPoint = generateCrashPoint();
    const session = getPlayerSession(discordId);
    const analysis = analyzeCrashHistory();
    
    const game = {
        discordId,
        betAmount,
        crashPoint,
        currentMultiplier: CRASH_CONFIG.startMultiplier,
        status: 'running', // running, crashed, cashed_out
        cashedOutAt: null,
        winnings: 0,
        startTime: Date.now(),
        // Enhanced features
        autoCashout: session.autoCashout,
        session,
        analysis,
        progressionFrames: [],
        currentFrame: 0,
        tensionLevel: 'LOW'
    };

    activeGames.set(discordId, game);
    return game;
}

/**
 * Get current game state
 * @param {string} discordId
 * @returns {Object|null}
 */
function getGame(discordId) {
    return activeGames.get(discordId) || null;
}

/**
 * Simulate multiplier progress (for display)
 * @param {Object} game
 * @returns {Object}
 */
function tickGame(game) {
    if (game.status !== 'running') {
        return game;
    }

    // Increase multiplier
    game.currentMultiplier = Math.min(
        game.crashPoint,
        Math.round((game.currentMultiplier + CRASH_CONFIG.multiplierIncrement) * 100) / 100
    );

    // Update tension level
    const tier = getMultiplierTier(game.currentMultiplier);
    game.tensionLevel = tier.risk;
    game.currentTier = tier;

    // Check if crashed
    if (game.currentMultiplier >= game.crashPoint) {
        game.status = 'crashed';
        game.currentMultiplier = game.crashPoint;
    }

    // Check auto-cashout
    if (game.autoCashout && game.currentMultiplier >= game.autoCashout && game.status === 'running') {
        return cashoutAt(game, game.autoCashout);
    }

    return game;
}

/**
 * Cashout at current multiplier
 * @param {Object} game
 * @param {number} multiplier
 * @returns {Object}
 */
function cashoutAt(game, multiplier) {
    if (game.status !== 'running') {
        return { error: 'game_not_running' };
    }

    if (multiplier > game.crashPoint) {
        // Would have crashed
        game.status = 'crashed';
        game.currentMultiplier = game.crashPoint;
        return game;
    }

    game.status = 'cashed_out';
    game.cashedOutAt = multiplier;
    game.winnings = Math.floor(game.betAmount * multiplier);
    
    // Add winnings
    economyManager.addDCoin(game.discordId, game.winnings, TRANSACTION_TYPES.GAME_WIN, `Crash: Thắng x${multiplier}`);
    
    // Update session
    const session = getPlayerSession(game.discordId);
    session.wins++;
    session.totalWon += game.winnings;
    session.biggestWin = Math.max(session.biggestWin, game.winnings);
    session.biggestMultiplier = Math.max(session.biggestMultiplier, multiplier);
    session.cashoutHistory.push(multiplier);
    if (session.cashoutHistory.length > 20) session.cashoutHistory.shift();
    session.avgCashout = session.cashoutHistory.reduce((s, c) => s + c, 0) / session.cashoutHistory.length;
    
    // Award XP
    levelManager.awardXP(game.discordId, 'CRASH_WIN');
    
    return game;
}

/**
 * Auto-run game to determine final state
 * @param {Object} game
 * @param {number} targetMultiplier - The multiplier player wants to cash out at
 * @returns {Object}
 */
function runGameToTarget(game, targetMultiplier) {
    if (game.status !== 'running') {
        return game;
    }

    // Validate target multiplier
    targetMultiplier = Math.max(1.01, Math.min(targetMultiplier, CRASH_CONFIG.maxMultiplier));
    
    const session = getPlayerSession(game.discordId);
    session.totalGames++;
    session.totalWagered += game.betAmount;

    // Generate progression frames for animation
    game.progressionFrames = generateProgressionFrames(game.crashPoint, targetMultiplier);

    // Determine outcome
    if (targetMultiplier <= game.crashPoint) {
        // Player wins - they cashed out before crash
        game.status = 'cashed_out';
        game.cashedOutAt = targetMultiplier;
        game.winnings = Math.floor(game.betAmount * targetMultiplier);
        game.currentMultiplier = targetMultiplier;
        game.profit = game.winnings - game.betAmount;
        
        // Add winnings
        economyManager.addDCoin(game.discordId, game.winnings, TRANSACTION_TYPES.GAME_WIN, `Crash: Thắng x${targetMultiplier}`);
        
        // Update session stats
        session.wins++;
        session.totalWon += game.winnings;
        session.biggestWin = Math.max(session.biggestWin, game.winnings);
        session.biggestMultiplier = Math.max(session.biggestMultiplier, targetMultiplier);
        session.cashoutHistory.push(targetMultiplier);
        if (session.cashoutHistory.length > 20) session.cashoutHistory.shift();
        session.avgCashout = session.cashoutHistory.reduce((s, c) => s + c, 0) / session.cashoutHistory.length;
        
        // Award XP
        levelManager.awardXP(game.discordId, 'CRASH_WIN');
        
        // Result message
        const tier = getMultiplierTier(targetMultiplier);
        if (targetMultiplier >= 5) {
            game.resultMessage = `🌟 INCREDIBLE! Rút tại x${targetMultiplier}!`;
        } else if (targetMultiplier >= 3) {
            game.resultMessage = `🔥 Xuất sắc! Rút tại x${targetMultiplier}!`;
        } else if (targetMultiplier >= 2) {
            game.resultMessage = `✨ Thắng đẹp! x${targetMultiplier}`;
        } else {
            game.resultMessage = `✅ An toàn! x${targetMultiplier}`;
        }
    } else {
        // Player loses - crash happened before target
        game.status = 'crashed';
        game.currentMultiplier = game.crashPoint;
        game.cashedOutAt = null;
        game.winnings = 0;
        game.profit = -game.betAmount;
        
        // Update session
        session.losses++;
        
        // Award participation XP
        levelManager.awardXP(game.discordId, 'CRASH_PLAY');
        
        // Result message based on how close they were
        const diff = targetMultiplier - game.crashPoint;
        if (diff < 0.3) {
            game.resultMessage = `💔 Suýt chút! Crash x${game.crashPoint}, bạn muốn x${targetMultiplier}`;
        } else if (game.crashPoint === 1.00) {
            game.resultMessage = `💥 Instant crash! Xui quá...`;
        } else {
            game.resultMessage = `💥 Crash tại x${game.crashPoint}! Mục tiêu x${targetMultiplier} quá xa`;
        }
    }

    // Update crash history
    crashHistory.unshift(game.crashPoint);
    if (crashHistory.length > MAX_CRASH_HISTORY) {
        crashHistory.pop();
    }

    // Update game with analysis
    game.analysis = analyzeCrashHistory();
    game.session = session;

    // Remove from active games
    activeGames.delete(game.discordId);
    
    return game;
}

/**
 * Set auto-cashout preference
 * @param {string} discordId
 * @param {number} multiplier
 * @returns {Object}
 */
function setAutoCashout(discordId, multiplier) {
    const session = getPlayerSession(discordId);
    
    if (multiplier === null || multiplier === 0) {
        session.autoCashout = null;
        return { success: true, message: '🔕 Auto-cashout đã tắt' };
    }
    
    if (multiplier < 1.1 || multiplier > CRASH_CONFIG.maxMultiplier) {
        return { error: 'invalid_multiplier', min: 1.1, max: CRASH_CONFIG.maxMultiplier };
    }
    
    session.autoCashout = multiplier;
    return { success: true, message: `✅ Auto-cashout đặt tại x${multiplier}` };
}

/**
 * Quick crash game - instant result
 * Player selects multiplier target, game resolves immediately
 * @param {string} discordId
 * @param {number} betAmount
 * @param {number} targetMultiplier
 * @returns {Object}
 */
function playCrash(discordId, betAmount, targetMultiplier) {
    // Create game
    const game = createGame(discordId, betAmount);
    if (game.error) return game;

    // Run to target and get result
    return runGameToTarget(game, targetMultiplier);
}

/**
 * Cancel active game (refund)
 * @param {string} discordId
 * @returns {boolean}
 */
function cancelGame(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'running') return false;

    // Refund bet
    economyManager.addDCoin(discordId, game.betAmount, TRANSACTION_TYPES.EARN, 'Crash: Hoàn cược');
    activeGames.delete(discordId);
    return true;
}

/**
 * Get multiplier display with visual
 * @param {number} multiplier
 * @returns {string}
 */
function formatMultiplier(multiplier) {
    const tier = getMultiplierTier(multiplier);
    return `${tier.emoji} x${multiplier.toFixed(2)}`;
}

/**
 * Get risk indicator for target multiplier
 * @param {number} multiplier
 * @returns {Object}
 */
function getRiskInfo(multiplier) {
    // Approximate win chance based on house edge formula
    const winChance = Math.min(95, Math.floor((1 / multiplier) * 100 * (1 - CRASH_CONFIG.houseEdge)));
    const tier = getMultiplierTier(multiplier);

    return { 
        winChance, 
        riskLevel: tier.name, 
        emoji: tier.emoji,
        color: tier.color
    };
}

/**
 * Get crash history display
 * @returns {string}
 */
function formatCrashHistory() {
    if (crashHistory.length === 0) return 'Chưa có lịch sử';
    
    return crashHistory.slice(0, 10).map(crash => {
        const tier = getMultiplierTier(crash);
        return `${tier.emoji}x${crash.toFixed(2)}`;
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
        winRate: session.totalGames > 0 
            ? Math.round((session.wins / session.totalGames) * 100) 
            : 0
    };
}

/**
 * Get visual progress bar for multiplier
 * @param {number} current
 * @param {number} target
 * @returns {string}
 */
function getProgressBar(current, target) {
    const progress = Math.min(current / target, 1);
    const filled = Math.floor(progress * 10);
    const empty = 10 - filled;
    
    const tier = getMultiplierTier(current);
    const fillChar = tier.emoji || '🟩';
    
    return `[${fillChar.repeat(filled)}${'⬜'.repeat(empty)}] ${Math.floor(progress * 100)}%`;
}

module.exports = {
    CRASH_CONFIG,
    MULTIPLIER_TIERS,
    createGame,
    getGame,
    tickGame,
    runGameToTarget,
    playCrash,
    cancelGame,
    formatMultiplier,
    getRiskInfo,
    formatCrashHistory,
    getSessionStats,
    getProgressBar,
    setAutoCashout,
    analyzeCrashHistory,
    getMultiplierTier
};
