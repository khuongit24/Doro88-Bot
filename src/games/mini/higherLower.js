const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Store active games
const activeGames = new Map();

// Cooldowns
const cooldowns = new Map();
const COOLDOWN_MS = 30000; // 30 seconds - cân bằng với reward cao hơn

// Game balance settings - ENTERTAINMENT MODE v3.0
// Mục tiêu: Game vui, reward đủ để hấp dẫn nhưng không exploit được
const MAX_STREAK = 7;           // Tăng lên 7 - cho phép streak dài hơn
const BASE_REWARD = 15;         // Tăng từ 5 - cơ bản rewarding hơn
const STREAK_MULTIPLIER = 1.4;  // Tăng từ 1.2 - streak có giá trị hơn

/**
 * Create new Higher/Lower game
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

    const currentNumber = randomInt(2, 12); // Avoid 1 and 13 for first card
    const game = {
        discordId,
        currentNumber,
        streak: 0,
        currentReward: BASE_REWARD,
        history: [currentNumber],
        status: 'playing',
        startTime: Date.now()
    };

    activeGames.set(discordId, game);
    logger.info('Higher/Lower game started', { discordId, firstNumber: currentNumber });

    return game;
}

/**
 * Make a guess (higher or lower)
 * @param {string} discordId 
 * @param {string} choice - 'higher' or 'lower'
 * @returns {Object}
 */
function makeGuess(discordId, choice) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    const newNumber = randomInt(1, 13);
    const wasHigher = newNumber > game.currentNumber;
    const wasLower = newNumber < game.currentNumber;
    const wasSame = newNumber === game.currentNumber;

    let won = false;
    if (wasSame) {
        // Tie - player wins by default
        won = true;
    } else if (choice === 'higher' && wasHigher) {
        won = true;
    } else if (choice === 'lower' && wasLower) {
        won = true;
    }

    game.history.push(newNumber);

    if (won) {
        game.streak++;
        // Cap streak at MAX_STREAK to prevent exponential inflation
        const effectiveStreak = Math.min(game.streak, MAX_STREAK);
        game.currentReward = Math.floor(BASE_REWARD * Math.pow(STREAK_MULTIPLIER, effectiveStreak));
        game.currentNumber = newNumber;

        // Force cash out at max streak (anti-inflation)
        const maxedOut = game.streak >= MAX_STREAK;

        return {
            game,
            previousNumber: game.history[game.history.length - 2],
            newNumber,
            choice,
            won: true,
            streak: game.streak,
            currentReward: game.currentReward,
            canContinue: !maxedOut,
            maxedOut
        };
    } else {
        // Lost - game over
        game.status = 'lost';
        
        // Award XP for playing
        const xpResult = levelManager.awardXP(discordId, 'HIGHER_LOWER_PLAY');
        
        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        logger.info('Higher/Lower lost', { discordId, streak: game.streak });

        return {
            game,
            previousNumber: game.history[game.history.length - 2],
            newNumber,
            choice,
            won: false,
            streak: game.streak,
            reward: 0,
            xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
            levelUp: xpResult.leveledUp || false,
            newLevel: xpResult.newLevel || null
        };
    }
}

/**
 * Cash out current winnings
 * @param {string} discordId 
 * @returns {Object}
 */
function cashOut(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (game.streak === 0) {
        return { error: 'no_winnings' };
    }

    const reward = game.currentReward;
    economyManager.addDCoin(discordId, reward, TRANSACTION_TYPES.GAME_WIN, `Higher/Lower (${game.streak} streak)`);

    // Award XP for winning
    const xpResult = levelManager.awardXP(discordId, 'HIGHER_LOWER_WIN');

    cooldowns.set(discordId, Date.now());
    activeGames.delete(discordId);

    logger.info('Higher/Lower cash out', { discordId, streak: game.streak, reward });

    return {
        success: true,
        reward,
        streak: game.streak,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };
}

/**
 * V2: Double or Nothing - risk current winnings for 2x
 * Must have streak >= 3 to use
 * @param {string} discordId
 * @returns {Object}
 */
function doubleOrNothing(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (game.streak < 3) {
        return { error: 'min_streak_required', minStreak: 3 };
    }

    // Generate random outcome (50/50)
    const won = Math.random() < 0.5;
    const previousReward = game.currentReward;

    if (won) {
        // Double the reward!
        game.currentReward = Math.floor(previousReward * 2);
        game.doubleOrNothingWins = (game.doubleOrNothingWins || 0) + 1;

        logger.info('Higher/Lower double or nothing WIN', {
            discordId,
            previousReward,
            newReward: game.currentReward
        });

        return {
            success: true,
            won: true,
            previousReward,
            newReward: game.currentReward,
            streak: game.streak,
            doubleOrNothingWins: game.doubleOrNothingWins,
            canContinue: true
        };
    } else {
        // Lost everything!
        game.status = 'lost';
        
        // Award XP for playing (even though lost on double or nothing)
        const xpResult = levelManager.awardXP(discordId, 'HIGHER_LOWER_PLAY');
        
        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        logger.info('Higher/Lower double or nothing LOST', {
            discordId,
            lostReward: previousReward
        });

        return {
            success: true,
            won: false,
            previousReward,
            newReward: 0,
            lostAll: true,
            xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0
        };
    }
}

/**
 * Get card display name
 * @param {number} number 
 * @returns {string}
 */
function getCardDisplay(number) {
    const cards = {
        1: 'A', 2: '2', 3: '3', 4: '4', 5: '5',
        6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
        11: 'J', 12: 'Q', 13: 'K'
    };
    return cards[number] || number.toString();
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
 * @returns {number}
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
    cashOut,
    getGame,
    cancelGame,
    getCooldown,
    getCardDisplay,
    // V2 exports
    doubleOrNothing
};
