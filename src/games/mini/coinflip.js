const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomChoice } = require('../../utils/helpers');

/**
 * Coin flip - 50/50 chance with x2 payout
 * @param {string} discordId
 * @param {number} betAmount
 * @param {string} choice - 'heads' or 'tails'
 * @returns {Object}
 */
function play(discordId, betAmount, choice) {
    const { minBet, maxBet } = config.casino;
    const PAYOUT_MULTIPLIER = 2.0; // FIXED: Match displayed x2 payout

    if (betAmount < minBet) {
        return { error: 'bet_too_low', minBet };
    }
    if (betAmount > maxBet) {
        return { error: 'bet_too_high', maxBet };
    }
    if (!economyManager.canAfford(discordId, betAmount)) {
        return { error: 'insufficient_balance' };
    }

    const validChoices = ['heads', 'tails'];
    if (!validChoices.includes(choice.toLowerCase())) {
        return { error: 'invalid_choice' };
    }

    // Deduct bet
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Coinflip cược');

    const result = randomChoice(validChoices);
    const won = result === choice.toLowerCase();

    let winnings = 0;
    if (won) {
        winnings = Math.floor(betAmount * PAYOUT_MULTIPLIER);
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, 'Coinflip thắng');
    }

    // Award XP
    const xpResult = levelManager.awardXP(discordId, won ? 'COINFLIP_WIN' : 'COINFLIP_PLAY');

    return {
        choice: choice.toLowerCase(),
        result,
        won,
        betAmount,
        winnings,
        emoji: result === 'heads' ? '🪙' : '💰',
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };
}

/**
 * Get result message
 * @param {Object} result
 * @returns {string}
 */
function getResultMessage(result) {
    const choiceVi = result.choice === 'heads' ? 'Mặt ngửa' : 'Mặt sấp';
    const resultVi = result.result === 'heads' ? 'Mặt ngửa' : 'Mặt sấp';

    if (result.won) {
        return `${result.emoji} Kết quả: **${resultVi}**\n✨ Bạn đã chọn đúng! Thắng **${result.winnings.toLocaleString()} DCoin**`;
    }
    return `${result.emoji} Kết quả: **${resultVi}**\n😔 Bạn đã chọn ${choiceVi}, thua **${result.betAmount.toLocaleString()} DCoin**`;
}

module.exports = {
    play,
    getResultMessage
};
