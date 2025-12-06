const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomChoice } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * RPS - Rock Paper Scissors Game
 * 
 * Modes:
 * - Single: 1 ván (x1.9 nếu thắng, refund nếu hòa)
 * - Bo3: Best of 3 vans (x2.8 nếu thắng - cần thắng 2)
 * - Bo5: Best of 5 vans (x4.5 nếu thắng - cần thắng 3)
 */

const CHOICES = ['rock', 'paper', 'scissors'];

const EMOJIS = {
    rock: '🪨',
    paper: '📄',
    scissors: '✂️'
};

const NAMES_VI = {
    rock: 'Đá',
    paper: 'Bao',
    scissors: 'Kéo'
};

// Game modes with multipliers - FIXED: Match displayed UI values
const GAME_MODES = {
    single: {
        name: 'Ván đơn',
        maxRounds: 1,
        winsNeeded: 1,
        multiplier: 2.0  // x2 for single win (fair odds)
    },
    bo3: {
        name: 'Best of 3',
        maxRounds: 3,
        winsNeeded: 2,
        multiplier: 3.0  // x3 for Bo3 (harder to win 2)
    },
    bo5: {
        name: 'Best of 5',
        maxRounds: 5,
        winsNeeded: 3,
        multiplier: 5.0  // x5 for Bo5 (hardest to win 3)
    }
};

// Active game sessions
const activeSessions = new Map();

// Cooldowns (optional, short because betting is the main limit)
const cooldowns = new Map();
const COOLDOWN_MS = 5000; // 5 seconds

/**
 * Determine winner for a single round
 * @param {string} player
 * @param {string} bot
 * @returns {string} 'win', 'lose', 'draw'
 */
function getResult(player, bot) {
    if (player === bot) return 'draw';

    const winConditions = {
        rock: 'scissors',
        paper: 'rock',
        scissors: 'paper'
    };

    return winConditions[player] === bot ? 'win' : 'lose';
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

/**
 * Start a new RPS game session
 * @param {string} discordId 
 * @param {number} betAmount 
 * @param {string} mode - 'single', 'bo3', 'bo5'
 * @returns {Object}
 */
function createGame(discordId, betAmount, mode = 'single') {
    const { minBet, maxBet } = config.casino;

    // Validate mode
    const gameMode = GAME_MODES[mode];
    if (!gameMode) {
        return { error: 'invalid_mode', validModes: Object.keys(GAME_MODES) };
    }

    // Validate bet
    if (betAmount < minBet) {
        return { error: 'bet_too_low', minBet };
    }
    if (betAmount > maxBet) {
        return { error: 'bet_too_high', maxBet };
    }
    if (!economyManager.canAfford(discordId, betAmount)) {
        return { error: 'insufficient_balance' };
    }

    // Check cooldown
    const cooldownRemaining = getCooldown(discordId);
    if (cooldownRemaining > 0) {
        return { error: 'cooldown', remaining: cooldownRemaining };
    }

    // Cancel any existing session
    cancelSession(discordId);

    // Deduct bet upfront
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, `RPS ${gameMode.name} cược`);

    // Create session
    const session = {
        discordId,
        betAmount,
        mode,
        modeName: gameMode.name,
        maxRounds: gameMode.maxRounds,
        winsNeeded: gameMode.winsNeeded,
        multiplier: gameMode.multiplier,
        playerScore: 0,
        botScore: 0,
        round: 1,
        rounds: [],  // History of rounds
        status: 'playing',
        startTime: Date.now()
    };

    activeSessions.set(discordId, session);

    logger.info('RPS game started', { discordId, mode, betAmount });

    return {
        success: true,
        session: getSessionInfo(session)
    };
}

/**
 * Get public session info (safe to expose)
 * @param {Object} session 
 * @returns {Object}
 */
function getSessionInfo(session) {
    return {
        mode: session.mode,
        modeName: session.modeName,
        betAmount: session.betAmount,
        maxRounds: session.maxRounds,
        winsNeeded: session.winsNeeded,
        multiplier: session.multiplier,
        playerScore: session.playerScore,
        botScore: session.botScore,
        round: session.round,
        rounds: session.rounds,
        status: session.status
    };
}

/**
 * Play a round in the current session
 * @param {string} discordId 
 * @param {string} playerChoice - 'rock', 'paper', 'scissors'
 * @returns {Object}
 */
function playRound(discordId, playerChoice) {
    const session = activeSessions.get(discordId);
    if (!session || session.status !== 'playing') {
        return { error: 'no_session' };
    }

    const choice = playerChoice.toLowerCase();
    if (!CHOICES.includes(choice)) {
        return { error: 'invalid_choice', validChoices: CHOICES };
    }

    // Bot makes a choice
    const botChoice = randomChoice(CHOICES);
    const result = getResult(choice, botChoice);

    // Update scores
    if (result === 'win') {
        session.playerScore++;
    } else if (result === 'lose') {
        session.botScore++;
    }
    // Draw = no score change

    // Record round
    const roundInfo = {
        round: session.round,
        playerChoice: choice,
        botChoice,
        result,
        playerEmoji: EMOJIS[choice],
        botEmoji: EMOJIS[botChoice]
    };
    session.rounds.push(roundInfo);
    session.round++;

    // Check if game is over
    const gameOver = checkGameOver(session);

    if (gameOver) {
        return finishGame(discordId, roundInfo);
    }

    // Game continues
    return {
        success: true,
        roundResult: result,
        roundInfo,
        session: getSessionInfo(session),
        gameOver: false
    };
}

/**
 * Check if game is over
 * @param {Object} session 
 * @returns {boolean}
 */
function checkGameOver(session) {
    // Someone reached wins needed?
    if (session.playerScore >= session.winsNeeded) return true;
    if (session.botScore >= session.winsNeeded) return true;

    // For single mode, any non-draw ends the game
    if (session.mode === 'single' && session.rounds.length > 0) {
        const lastRound = session.rounds[session.rounds.length - 1];
        if (lastRound.result !== 'draw') return true;
    }

    // Max rounds reached?
    if (session.round > session.maxRounds) return true;

    return false;
}

/**
 * Finish the game and calculate rewards
 * @param {string} discordId 
 * @param {Object} lastRoundInfo 
 * @returns {Object}
 */
function finishGame(discordId, lastRoundInfo = null) {
    const session = activeSessions.get(discordId);
    if (!session) {
        return { error: 'no_session' };
    }

    session.status = 'finished';

    // Determine winner
    let finalResult = 'lose';
    let winnings = 0;

    if (session.playerScore > session.botScore) {
        finalResult = 'win';
        winnings = Math.floor(session.betAmount * session.multiplier);
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, `RPS ${session.modeName} thắng`);
    } else if (session.playerScore === session.botScore) {
        // Draw in Bo3/Bo5 is rare but possible if time runs out or disconnect
        // In Single mode, draw means refund
        finalResult = 'draw';
        winnings = session.betAmount;
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.EARN, `RPS ${session.modeName} hòa`);
    }
    // Loss = bet already deducted

    // Award XP
    const xpAction = finalResult === 'win' ? 'RPS_WIN' : 'RPS_PLAY';
    const xpResult = levelManager.awardXP(discordId, xpAction);

    // Set cooldown ONLY for winners (losers can play again immediately)
    if (finalResult === 'win') {
        cooldowns.set(discordId, Date.now());
    }

    // Cleanup
    activeSessions.delete(discordId);

    logger.info('RPS game finished', {
        discordId,
        mode: session.mode,
        playerScore: session.playerScore,
        botScore: session.botScore,
        result: finalResult,
        winnings
    });

    return {
        success: true,
        gameOver: true,
        finalResult,
        playerScore: session.playerScore,
        botScore: session.botScore,
        betAmount: session.betAmount,
        winnings,
        multiplier: session.multiplier,
        modeName: session.modeName,
        rounds: session.rounds,
        lastRoundInfo,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };
}

/**
 * Get current session
 * @param {string} discordId 
 * @returns {Object|null}
 */
function getSession(discordId) {
    const session = activeSessions.get(discordId);
    if (!session) return null;
    return getSessionInfo(session);
}

/**
 * Cancel current session (forfeit - no refund)
 * @param {string} discordId 
 */
function cancelSession(discordId) {
    const session = activeSessions.get(discordId);
    if (session) {
        logger.info('RPS session cancelled', { discordId, mode: session.mode });
        activeSessions.delete(discordId);
    }
}

/**
 * Play single round (legacy compatibility for basic RPS)
 * @param {string} discordId
 * @param {number} betAmount
 * @param {string} playerChoice
 * @returns {Object}
 */
function play(discordId, betAmount, playerChoice) {
    // Create single-round game
    const createResult = createGame(discordId, betAmount, 'single');
    if (createResult.error) {
        return createResult;
    }

    // Immediately play the round
    return playRound(discordId, playerChoice);
}

/**
 * Get result message (legacy compatibility)
 * @param {Object} result
 * @returns {string}
 */
function getResultMessage(result) {
    if (!result.lastRoundInfo) return '';

    const r = result.lastRoundInfo;
    const playerName = NAMES_VI[r.playerChoice];
    const botName = NAMES_VI[r.botChoice];

    let message = `${r.playerEmoji} vs ${r.botEmoji}\n`;
    message += `**${playerName}** vs **${botName}**\n\n`;

    switch (result.finalResult) {
        case 'win':
            message += `🎉 Bạn thắng! +**${result.winnings.toLocaleString()} DCoin**`;
            break;
        case 'draw':
            message += `🤝 Hòa! Hoàn lại **${result.winnings.toLocaleString()} DCoin**`;
            break;
        case 'lose':
            message += `😔 Bạn thua! -**${result.betAmount.toLocaleString()} DCoin**`;
            break;
    }

    return message;
}

module.exports = {
    // Constants
    CHOICES,
    EMOJIS,
    NAMES_VI,
    GAME_MODES,

    // Core game functions
    getResult,
    getCooldown,

    // Session-based gameplay (Bo3/Bo5)
    createGame,
    playRound,
    finishGame,
    getSession,
    cancelSession,

    // Legacy single-round play
    play,
    getResultMessage
};
