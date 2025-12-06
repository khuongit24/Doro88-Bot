const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Store active games
const activeGames = new Map();

// Cooldowns (userId -> timestamp)
const cooldowns = new Map();
const COOLDOWN_MS = 30000; // 30 seconds - cân bằng với reward cao hơn

/**
 * Create new Lucky Number game
 * @param {string} discordId 
 * @returns {Object}
 */
function createGame(discordId) {
    // Check cooldown
    const lastPlayed = cooldowns.get(discordId);
    if (lastPlayed && Date.now() - lastPlayed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastPlayed)) / 1000);
        return { error: 'cooldown', remaining };
    }

    const targetNumber = randomInt(1, 100);
    const game = {
        discordId,
        targetNumber,
        attempts: 0,
        maxAttempts: 5,
        guesses: [],
        status: 'playing',
        startTime: Date.now()
    };

    activeGames.set(discordId, game);
    logger.info('Lucky Number game started', { discordId, target: targetNumber });

    return game;
}

/**
 * Make a guess
 * @param {string} discordId 
 * @param {number} guess 
 * @returns {Object}
 */
function makeGuess(discordId, guess) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (guess < 1 || guess > 100) {
        return { error: 'invalid_guess' };
    }

    game.attempts++;
    game.guesses.push(guess);

    let hint = '';
    let won = false;

    if (guess === game.targetNumber) {
        won = true;
        game.status = 'won';
        hint = '🎯 CHÍNH XÁC!';
    } else if (guess < game.targetNumber) {
        hint = '📈 Số bí ẩn CAO HƠN ' + guess;
    } else {
        hint = '📉 Số bí ẩn THẤP HƠN ' + guess;
    }

    // Check if out of attempts
    if (!won && game.attempts >= game.maxAttempts) {
        game.status = 'lost';
    }

    // Calculate reward if won
    let reward = 0;
    let xpResult = null;
    if (won) {
        reward = calculateReward(game.attempts);
        economyManager.addDCoin(discordId, reward, TRANSACTION_TYPES.GAME_WIN, `Lucky Number (${game.attempts} lần đoán)`);
        xpResult = levelManager.awardXP(discordId, 'LUCKY_NUMBER_WIN');
        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        logger.info('Lucky Number won', { discordId, attempts: game.attempts, reward });
    } else if (game.status === 'lost') {
        xpResult = levelManager.awardXP(discordId, 'LUCKY_NUMBER_PLAY');
        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        logger.info('Lucky Number lost', { discordId, target: game.targetNumber });
    }

    return {
        game,
        guess,
        hint,
        won,
        reward,
        attemptsLeft: game.maxAttempts - game.attempts,
        xpGained: xpResult?.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult?.leveledUp || false,
        newLevel: xpResult?.newLevel || null
    };
}

/**
 * Calculate reward based on attempts (balanced for anti-inflation)
 * ENTERTAINMENT MODE v3.0 - Tăng reward để vui hơn
 * @param {number} attempts 
 * @returns {number}
 */
function calculateReward(attempts) {
    // ENTERTAINMENT v3.0: Tăng reward - game miễn phí nhưng vui hơn
    // Mục tiêu: Max ~100 DCoin/game, avg ~40 DCoin/game
    const rewards = {
        1: 100,  // Lucky guess - rất hiếm (1%) - jackpot!
        2: 60,   // Very good - hiếm (~5%)
        3: 40,   // Good - uncommon (~15%)
        4: 25,   // Average - phổ biến (~35%)
        5: 15    // Just made it - phổ biến (~44%)
    };
    return rewards[attempts] || 15;
}

/**
 * Get active game
 * @param {string} discordId 
 * @returns {Object|null}
 */
function getGame(discordId) {
    return activeGames.get(discordId) || null;
}

/**
 * Cancel game
 * @param {string} discordId 
 */
function cancelGame(discordId) {
    activeGames.delete(discordId);
}

/**
 * Get cooldown remaining
 * @param {string} discordId 
 * @returns {number} seconds remaining, 0 if ready
 */
function getCooldown(discordId) {
    const lastPlayed = cooldowns.get(discordId);
    if (!lastPlayed) return 0;

    const remaining = COOLDOWN_MS - (Date.now() - lastPlayed);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

module.exports = {
    createGame,
    makeGuess,
    getGame,
    cancelGame,
    getCooldown,
    calculateReward
};
