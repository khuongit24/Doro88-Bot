const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');

// Store player sessions
const playerSessions = new Map();

// Global spin history for pattern display
const spinHistory = [];
const MAX_SPIN_HISTORY = 50;

// Wheel segments configuration
// Balanced for ~96% RTP (return to player) - 4% house edge
// EV = Σ (probability × multiplier) ≈ 0.96
const WHEEL_SEGMENTS = [
    { id: 1, label: '💀 Mất hết', multiplier: 0, color: '⬛', probability: 26, tier: 'LOSE', sound: '💔' },
    { id: 2, label: '😢 x0.5', multiplier: 0.5, color: '🟫', probability: 25, tier: 'LOSE', sound: '😢' },
    { id: 3, label: '😐 x1', multiplier: 1, color: '⬜', probability: 25, tier: 'SAFE', sound: '😐' },
    { id: 4, label: '😊 x1.5', multiplier: 1.5, color: '🟩', probability: 11, tier: 'WIN', sound: '✨' },
    { id: 5, label: '😄 x2', multiplier: 2, color: '🟦', probability: 7, tier: 'WIN', sound: '🎊' },
    { id: 6, label: '🤩 x3', multiplier: 3, color: '🟪', probability: 3.5, tier: 'BIG_WIN', sound: '🔔' },
    { id: 7, label: '🎉 x5', multiplier: 5, color: '🟨', probability: 1.5, tier: 'MEGA_WIN', sound: '🎺' },
    { id: 8, label: '🔥 x10', multiplier: 10, color: '🟧', probability: 0.7, tier: 'JACKPOT', sound: '🎆' },
    { id: 9, label: '💎 JACKPOT x20', multiplier: 20, color: '💎', probability: 0.3, tier: 'SUPER_JACKPOT', sound: '🎇' }
];

// Spinning animation frames (slowdown effect)
const SPIN_ANIMATION = {
    FAST: ['🔄', '🔃', '🔄', '🔃'],
    MEDIUM: ['🌀', '💫', '🌀', '💫'],
    SLOW: ['⭐', '✨', '⭐', '✨'],
    STOP: ['🎯', '🎯', '🎯', '🎯']
};

// Win messages by tier
const WIN_MESSAGES = {
    LOSE: [
        '💀 Xui quá!',
        '😢 Lần sau sẽ may mắn hơn!',
        '🍀 Cố gắng lên!'
    ],
    SAFE: [
        '😐 Hoà vốn!',
        '🔄 Chơi lại nào!',
        '🤞 Suýt chút tạch!'
    ],
    WIN: [
        '😊 Quá đẹp!',
        '✨ Tốt lắm!',
        '🎊 Thắng rồi!'
    ],
    BIG_WIN: [
        '🤩 WOW! Thắng lớn!',
        '🔔 DING DING! x3!',
        '💰 Giàu rồi!'
    ],
    MEGA_WIN: [
        '🎉🎉 MEGA WIN!',
        '🎺 INCREDIBLE!',
        '💵 x5 BABY!'
    ],
    JACKPOT: [
        '🔥🔥🔥 JACKPOT!!!',
        '🎆 x10 OÁCH VÔ CÙNG!',
        '💎 ĐỈNH CỦA ĐỈNH!'
    ],
    SUPER_JACKPOT: [
        '💎✨💎 SUPER JACKPOT ✨💎✨',
        '🎇🎇🎇 x20 HUYỀN THOẠI!!! 🎇🎇🎇',
        '👑👑👑 VUA MAY MẮN!!! 👑👑👑'
    ]
};

// Near-miss excitement messages
const NEAR_MISS_MESSAGES = [
    '😱 Suýt trúng jackpot!',
    '🔥 Gần lắm rồi!',
    '💨 Vuột mất x10!',
    '😤 Thiếu một chút thôi!'
];

// Game settings
// CÂN BẰNG KINH TẾ v2.0: Tăng cooldown
const WHEEL_CONFIG = {
    minBet: 50,
    maxBet: 1000000,
    cooldown: 15000, // 15 seconds - user request
    streakBonusMax: 0.10, // Max 10% streak bonus
    luckyStreakThreshold: 3 // Consecutive wins for streak bonus
};

// Cooldown tracking
const cooldowns = new Map();

/**
 * Get or create player session
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerSession(discordId) {
    if (!playerSessions.has(discordId)) {
        playerSessions.set(discordId, {
            totalSpins: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            biggestMultiplier: 0,
            currentStreak: 0,
            bestStreak: 0,
            jackpotCount: 0,
            segmentHits: new Map(), // Track which segments hit how many times
            lastResults: [] // Last 10 results
        });
    }
    return playerSessions.get(discordId);
}

/**
 * Detect if this is a near-miss (adjacent to jackpot)
 * @param {Object} segment
 * @returns {boolean}
 */
function isNearMiss(segment) {
    // Adjacent segments to jackpot (x10, x20)
    const jackpotIds = [8, 9]; // x10, x20
    const nearMissIds = [7]; // x5 is adjacent
    return nearMissIds.includes(segment.id) ||
        (segment.multiplier === 0 && Math.random() < 0.2); // Sometimes losing is "almost winning"
}

/**
 * Generate spinning animation frames
 * @param {Object} targetSegment
 * @returns {Array}
 */
function generateSpinFrames(targetSegment) {
    const frames = [];
    const targetIdx = WHEEL_SEGMENTS.findIndex(s => s.id === targetSegment.id);

    // Fast spinning phase (random segments)
    for (let i = 0; i < 8; i++) {
        const randomIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
        frames.push({
            phase: 'FAST',
            segment: WHEEL_SEGMENTS[randomIdx],
            emoji: SPIN_ANIMATION.FAST[i % 4],
            message: '🔄 Đang quay...'
        });
    }

    // Medium spinning (getting closer)
    const nearSegments = [
        (targetIdx - 2 + WHEEL_SEGMENTS.length) % WHEEL_SEGMENTS.length,
        (targetIdx - 1 + WHEEL_SEGMENTS.length) % WHEEL_SEGMENTS.length
    ];
    for (let i = 0; i < 4; i++) {
        const idx = i < 2 ? nearSegments[0] : nearSegments[1];
        frames.push({
            phase: 'MEDIUM',
            segment: WHEEL_SEGMENTS[idx],
            emoji: SPIN_ANIMATION.MEDIUM[i % 4],
            message: '💫 Chậm lại...'
        });
    }

    // Slow spinning (almost there)
    frames.push({
        phase: 'SLOW',
        segment: WHEEL_SEGMENTS[(targetIdx - 1 + WHEEL_SEGMENTS.length) % WHEEL_SEGMENTS.length],
        emoji: SPIN_ANIMATION.SLOW[0],
        message: '⭐ Sắp tới...'
    });

    // Final stop
    frames.push({
        phase: 'STOP',
        segment: targetSegment,
        emoji: '🎯',
        message: targetSegment.sound + ' ' + targetSegment.label,
        isFinal: true
    });

    return frames;
}

/**
 * Get streak bonus multiplier
 * @param {number} streak
 * @returns {number}
 */
function getStreakBonus(streak) {
    if (streak < WHEEL_CONFIG.luckyStreakThreshold) return 0;
    // 1% bonus per win after threshold, max 10%
    return Math.min((streak - WHEEL_CONFIG.luckyStreakThreshold + 1) * 0.01, WHEEL_CONFIG.streakBonusMax);
}

/**
 * Analyze spin history for hot/cold segments
 * @returns {Object}
 */
function analyzeSpinHistory() {
    if (spinHistory.length < 10) {
        return { hot: [], cold: [], patterns: [] };
    }

    const recent = spinHistory.slice(0, 30);
    const counts = new Map();

    WHEEL_SEGMENTS.forEach(s => counts.set(s.id, 0));
    recent.forEach(s => counts.set(s.id, (counts.get(s.id) || 0) + 1));

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    return {
        hot: sorted.slice(0, 3).map(([id, count]) => ({
            segment: WHEEL_SEGMENTS.find(s => s.id === id),
            count,
            frequency: Math.round((count / recent.length) * 100)
        })),
        cold: sorted.slice(-3).reverse().map(([id, count]) => ({
            segment: WHEEL_SEGMENTS.find(s => s.id === id),
            count,
            frequency: Math.round((count / recent.length) * 100)
        })),
        totalSpins: spinHistory.length,
        avgMultiplier: recent.reduce((sum, s) => sum + s.multiplier, 0) / recent.length
    };
}

/**
 * Spin the wheel with enhanced features
 * @param {string} discordId
 * @param {number} betAmount
 * @returns {Object}
 */
function spin(discordId, betAmount) {
    // Check cooldown
    const lastSpin = cooldowns.get(discordId) || 0;
    const now = Date.now();
    if (now - lastSpin < WHEEL_CONFIG.cooldown) {
        const remaining = Math.ceil((WHEEL_CONFIG.cooldown - (now - lastSpin)) / 1000);
        return { error: 'cooldown', remaining };
    }

    // Validate bet
    if (betAmount < WHEEL_CONFIG.minBet) {
        return { error: 'bet_too_low', minBet: WHEEL_CONFIG.minBet };
    }
    if (betAmount > WHEEL_CONFIG.maxBet) {
        return { error: 'bet_too_high', maxBet: WHEEL_CONFIG.maxBet };
    }
    if (!economyManager.canAfford(discordId, betAmount)) {
        return { error: 'insufficient_balance' };
    }

    // Get session for stats
    const session = getPlayerSession(discordId);
    session.totalSpins++;
    session.totalWagered += betAmount;

    // Deduct bet
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Wheel: Đặt cược');

    // Determine result using weighted random
    const segment = selectSegment();

    // Generate spin animation frames
    const spinFrames = generateSpinFrames(segment);

    // Calculate base winnings
    let winnings = Math.floor(betAmount * segment.multiplier);

    // Apply streak bonus for wins
    const isWin = segment.multiplier > 1;
    let streakBonus = 0;

    if (isWin) {
        session.currentStreak++;
        session.wins++;
        const bonusMultiplier = getStreakBonus(session.currentStreak);
        if (bonusMultiplier > 0) {
            streakBonus = Math.floor(winnings * bonusMultiplier);
            winnings += streakBonus;
        }
        session.bestStreak = Math.max(session.bestStreak, session.currentStreak);
    } else if (segment.multiplier < 1) {
        session.currentStreak = 0;
        session.losses++;
    }

    const profit = winnings - betAmount;

    // Update session stats
    if (winnings > 0) {
        session.totalWon += winnings;
        session.biggestWin = Math.max(session.biggestWin, winnings);
        session.biggestMultiplier = Math.max(session.biggestMultiplier, segment.multiplier);
    }

    // Track segment hits
    session.segmentHits.set(segment.id, (session.segmentHits.get(segment.id) || 0) + 1);

    // Track last results
    session.lastResults.unshift({
        segment,
        winnings,
        profit,
        timestamp: now
    });
    if (session.lastResults.length > 10) session.lastResults.pop();

    // Add winnings if any
    if (winnings > 0) {
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, `Wheel: ${segment.label}`);
    }

    // Check for jackpot
    const isJackpot = segment.multiplier >= 10;
    if (isJackpot) {
        session.jackpotCount++;
    }

    // Award XP
    const xpResult = levelManager.awardXP(discordId, isJackpot ? 'WHEEL_JACKPOT' : (isWin ? 'WHEEL_WIN' : 'WHEEL_PLAY'));

    // Set cooldown ONLY for winners (losers can play again immediately)
    if (isWin) {
        cooldowns.set(discordId, now);
    }

    // Update global spin history
    spinHistory.unshift(segment);
    if (spinHistory.length > MAX_SPIN_HISTORY) spinHistory.pop();

    // Get win message
    const winMessage = WIN_MESSAGES[segment.tier][Math.floor(Math.random() * WIN_MESSAGES[segment.tier].length)];

    // Check for near-miss
    const nearMiss = isNearMiss(segment);
    const nearMissMessage = nearMiss ? NEAR_MISS_MESSAGES[Math.floor(Math.random() * NEAR_MISS_MESSAGES.length)] : null;

    // Analyze history for display
    const analysis = analyzeSpinHistory();

    return {
        success: true,
        segment,
        betAmount,
        winnings,
        profit,
        isWin,
        isJackpot,
        newBalance: economyManager.getBalance(discordId),
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null,
        // Enhanced features
        spinFrames,
        winMessage,
        streakBonus,
        currentStreak: session.currentStreak,
        nearMiss,
        nearMissMessage,
        session: {
            totalSpins: session.totalSpins,
            wins: session.wins,
            losses: session.losses,
            winRate: session.totalSpins > 0 ? Math.round((session.wins / session.totalSpins) * 100) : 0,
            profit: session.totalWon - session.totalWagered,
            biggestWin: session.biggestWin,
            jackpotCount: session.jackpotCount,
            bestStreak: session.bestStreak
        },
        analysis
    };
}

/**
 * Select a segment using weighted random
 * @returns {Object}
 */
function selectSegment() {
    const totalProbability = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.probability, 0);
    let random = Math.random() * totalProbability;

    for (const segment of WHEEL_SEGMENTS) {
        random -= segment.probability;
        if (random <= 0) {
            return segment;
        }
    }

    // Fallback to first segment
    return WHEEL_SEGMENTS[0];
}

/**
 * Get wheel display string (visual representation)
 * @param {Object} result - Spin result with selected segment
 * @returns {string}
 */
function getWheelDisplay(result) {
    const segments = WHEEL_SEGMENTS;
    const selectedIdx = segments.findIndex(s => s.id === result.segment.id);

    // Create a simple visual representation
    let display = '```\n';
    display += '    🎯 VÒNG QUAY MAY MẮN 🎯\n';
    display += '╔══════════════════════════╗\n';

    segments.forEach((seg, idx) => {
        const pointer = idx === selectedIdx ? ' ◀◀ ' : '    ';
        const bar = idx === selectedIdx ? '████' : '░░░░';
        display += `║ ${seg.color} ${bar} ${seg.label.padEnd(15)}${pointer}║\n`;
    });

    display += '╚══════════════════════════╝\n';
    display += '```';

    return display;
}

/**
 * Get animated wheel display for a specific frame
 * @param {Object} frame
 * @returns {string}
 */
function getAnimatedWheelDisplay(frame) {
    const segments = WHEEL_SEGMENTS;
    const selectedIdx = segments.findIndex(s => s.id === frame.segment.id);

    let display = '```\n';
    display += `    ${frame.emoji} ${frame.message}\n`;
    display += '╔══════════════════════════╗\n';

    segments.forEach((seg, idx) => {
        const isSelected = idx === selectedIdx;
        let pointer = '    ';
        let bar = '░░░░';

        if (frame.phase === 'FAST') {
            // Blur effect
            pointer = isSelected ? ' >> ' : '    ';
            bar = isSelected ? '▓▓▓▓' : '░░░░';
        } else if (frame.phase === 'MEDIUM') {
            pointer = isSelected ? ' >  ' : '    ';
            bar = isSelected ? '▓▓░░' : '░░░░';
        } else if (frame.phase === 'SLOW') {
            pointer = isSelected ? ' ◀  ' : '    ';
            bar = isSelected ? '███░' : '░░░░';
        } else if (frame.phase === 'STOP') {
            pointer = isSelected ? ' ◀◀ ' : '    ';
            bar = isSelected ? '████' : '░░░░';
        }

        display += `║ ${seg.color} ${bar} ${seg.label.padEnd(15)}${pointer}║\n`;
    });

    display += '╚══════════════════════════╝\n';
    display += '```';

    return display;
}

/**
 * Get segments info for display
 * @returns {string}
 */
function getSegmentsInfo() {
    return WHEEL_SEGMENTS.map(s => {
        return `${s.color} **${s.label}** - ${s.probability}%`;
    }).join('\n');
}

/**
 * Get segments with win chance info
 * @returns {string}
 */
function getSegmentsWithOdds() {
    return WHEEL_SEGMENTS.map(s => {
        const chance = s.probability.toFixed(1);
        const ev = (s.multiplier * s.probability / 100).toFixed(3);
        return `${s.color} ${s.label} | ${chance}% | EV: ${ev}`;
    }).join('\n');
}

/**
 * Get cooldown remaining
 * @param {string} discordId
 * @returns {number} - Seconds remaining, 0 if no cooldown
 */
function getCooldown(discordId) {
    const lastSpin = cooldowns.get(discordId) || 0;
    const now = Date.now();
    const diff = now - lastSpin;
    if (diff >= WHEEL_CONFIG.cooldown) return 0;
    return Math.ceil((WHEEL_CONFIG.cooldown - diff) / 1000);
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
            ? Math.round((session.wins / session.totalSpins) * 100)
            : 0,
        segmentHits: Object.fromEntries(session.segmentHits)
    };
}

/**
 * Format spin history for display
 * @returns {string}
 */
function formatSpinHistory() {
    if (spinHistory.length === 0) return 'Chưa có lịch sử';

    return spinHistory.slice(0, 15).map(s => s.color).join('');
}

/**
 * Get hot/cold analysis display
 * @returns {string}
 */
function getHotColdDisplay() {
    const analysis = analyzeSpinHistory();
    if (analysis.hot.length === 0) return 'Chưa đủ dữ liệu phân tích';

    let display = '🔥 **Hot:**\n';
    analysis.hot.forEach(h => {
        display += `${h.segment.color} ${h.segment.label} (${h.frequency}%)\n`;
    });

    display += '\n❄️ **Cold:**\n';
    analysis.cold.forEach(c => {
        display += `${c.segment.color} ${c.segment.label} (${c.frequency}%)\n`;
    });

    return display;
}

module.exports = {
    WHEEL_CONFIG,
    WHEEL_SEGMENTS,
    spin,
    getWheelDisplay,
    getAnimatedWheelDisplay,
    getSegmentsInfo,
    getSegmentsWithOdds,
    getCooldown,
    getSessionStats,
    formatSpinHistory,
    getHotColdDisplay,
    analyzeSpinHistory,
    generateSpinFrames
};
