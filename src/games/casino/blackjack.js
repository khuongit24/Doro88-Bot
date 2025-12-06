const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const config = require('../../config');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const cardUtils = require('./cardUtils');

/**
 * Blackjack game states
 */
const GAME_STATES = {
    BETTING: 'BETTING',
    INSURANCE_OFFERED: 'INSURANCE_OFFERED',
    PLAYING: 'PLAYING',
    DEALER_TURN: 'DEALER_TURN',
    FINISHED: 'FINISHED'
};

/**
 * Game results
 */
const RESULTS = {
    WIN: 'WIN',
    LOSE: 'LOSE',
    PUSH: 'PUSH',
    BLACKJACK: 'BLACKJACK',
    SURRENDER: 'SURRENDER',
    INSURANCE_WIN: 'INSURANCE_WIN'
};

/**
 * Interactive Animation Frames for card dealing
 * Mô phỏng cảm giác dealing cards từng lá
 */
const DEALING_FRAMES = [
    '🎴 Đang chia bài...',
    '🃏 Lá 1 cho bạn...',
    '🂠 Lá 1 cho Dealer...',
    '🃏 Lá 2 cho bạn...',
    '🂠 Lá ẩn cho Dealer...'
];

/**
 * Dramatic pause messages for tension building
 */
const TENSION_MESSAGES = {
    PLAYER_HIGH: ['😰 Điểm cao! Cẩn thận...', '🔥 Nguy hiểm! Nên dừng?', '💀 Gần bust rồi!'],
    DEALER_SHOWING_HIGH: ['👀 Dealer có vẻ mạnh...', '🤔 Dealer lá úp nguy hiểm?', '😬 Tình hình khó khăn...'],
    CLOSE_TO_21: ['🎯 Gần 21 rồi!', '✨ Tuyệt vời! Dừng thôi?', '🌟 Vị trí tốt!'],
    BUST_INCOMING: ['💥 BUST!', '😱 Quá 21!', '💔 Hỏng rồi...']
};

/**
 * Card value display với emoji đẹp hơn
 */
const VALUE_EMOJIS = {
    LOW: '🟢', // 2-11: An toàn để hit
    MEDIUM: '🟡', // 12-16: Vùng nguy hiểm
    HIGH: '🟠', // 17-20: Nên dừng
    PERFECT: '⭐', // 21: Perfect!
    BUST: '💥' // >21: Bust
};

/**
 * Get value emoji based on hand value
 */
function getValueEmoji(value) {
    if (value > 21) return VALUE_EMOJIS.BUST;
    if (value === 21) return VALUE_EMOJIS.PERFECT;
    if (value >= 17) return VALUE_EMOJIS.HIGH;
    if (value >= 12) return VALUE_EMOJIS.MEDIUM;
    return VALUE_EMOJIS.LOW;
}

/**
 * Calculate bust probability for current hand
 * Tính xác suất bust nếu rút thêm bài
 */
function calculateBustProbability(hand, deck) {
    const currentValue = cardUtils.calculateHandValue(hand);
    if (currentValue >= 21) return 100;

    const safeCardsNeeded = 21 - currentValue;
    let bustCards = 0;
    let totalCards = deck.length;

    for (const card of deck) {
        const cardValue = cardUtils.getCardValue(card);
        // Ace có thể là 1 nên ít khi bust
        if (card.value === 'A') continue;
        if (cardValue > safeCardsNeeded) bustCards++;
    }

    return Math.round((bustCards / totalCards) * 100);
}

/**
 * Get strategic advice based on hand and dealer upcard
 * Basic strategy hints để giúp người chơi
 */
function getStrategyHint(playerHand, dealerUpcard) {
    const playerValue = cardUtils.calculateHandValue(playerHand);
    const dealerValue = cardUtils.getCardValue(dealerUpcard);
    const isSoft = cardUtils.isSoftHand(playerHand);

    // Basic strategy recommendations
    if (playerValue === 21) return '🎯 Blackjack hoặc 21 điểm! Dừng ngay!';

    if (isSoft) {
        // Soft hands (có Ace đếm là 11)
        if (playerValue >= 19) return '✋ Tay mềm 19+: Nên DỪNG';
        if (playerValue === 18) {
            if (dealerValue >= 9) return '🃏 Tay mềm 18 vs Dealer mạnh: Có thể RÚT';
            return '✋ Tay mềm 18: Nên DỪNG';
        }
        return '🃏 Tay mềm thấp: Nên RÚT thêm';
    }

    // Hard hands
    if (playerValue >= 17) return '✋ 17+: Luôn DỪNG';
    if (playerValue >= 13 && playerValue <= 16) {
        if (dealerValue >= 7) return '🃏 13-16 vs Dealer mạnh: Nên RÚT';
        return '✋ 13-16 vs Dealer yếu: Có thể DỪNG';
    }
    if (playerValue === 12) {
        if (dealerValue >= 4 && dealerValue <= 6) return '✋ 12 vs Dealer yếu: Có thể DỪNG';
        return '🃏 12 vs Dealer khác: Nên RÚT';
    }
    if (playerValue === 11) return '💰 11 điểm: Cơ hội NHÂN ĐÔI tốt!';
    if (playerValue === 10) {
        if (dealerValue <= 9) return '💰 10 điểm: Cơ hội NHÂN ĐÔI!';
        return '🃏 10 điểm vs Dealer mạnh: Nên RÚT';
    }
    if (playerValue === 9) {
        if (dealerValue >= 3 && dealerValue <= 6) return '💰 9 điểm vs Dealer yếu: Có thể NHÂN ĐÔI';
    }

    return '🃏 Điểm thấp: Nên RÚT thêm bài';
}

/**
 * Win streak tracking for bonus excitement
 */
const playerStreaks = new Map();

/**
 * Create new blackjack game
 * Standard casino rules với tính năng interactive mới:
 * - Dealer's second card (hole card) is face down
 * - If dealer shows Ace, offer INSURANCE
 * - If dealer shows Ace or 10-value, dealer peeks for blackjack
 * - Dealer stands on all 17s (S17 rule - better for player)
 * - Blackjack pays 3:2
 * - Player can double on any two cards
 * - Late surrender available
 * - Win streak bonuses
 * - Bust probability hints
 * 
 * @param {string} discordId
 * @param {number} betAmount
 * @returns {Object}
 */
function createGame(discordId, betAmount) {
    const { minBet, maxBet, blackjack } = config.casino;

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

    // Deduct bet
    economyManager.deductDCoin(discordId, betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Blackjack cược');

    // Create deck and deal cards (standard casino order: player, dealer, player, dealer)
    const deck = cardUtils.createDeck(blackjack.deckCount);

    // Deal in proper casino order: Player card 1 → Dealer card 1 (face up) → Player card 2 → Dealer card 2 (hole card)
    const playerCard1 = deck.pop();
    const dealerCard1 = deck.pop(); // Dealer's face-up card
    const playerCard2 = deck.pop();
    const dealerCard2 = deck.pop(); // Dealer's hole card (face down)

    const playerHand = [playerCard1, playerCard2];
    const dealerHand = [dealerCard1, dealerCard2];

    // Get or initialize player streak
    const currentStreak = playerStreaks.get(discordId) || { wins: 0, losses: 0, maxStreak: 0 };

    const game = {
        discordId,
        betAmount,
        originalBet: betAmount,
        deck,
        playerHand,
        dealerHand,
        state: GAME_STATES.PLAYING,
        result: null,
        doubled: false,
        dealerPeeked: false,
        // New interactive features
        insurance: null, // Insurance bet amount if taken
        insurancePayout: 0,
        canInsurance: false,
        dealingFrame: 0, // For animation
        bustProbability: 0,
        strategyHint: '',
        streak: currentStreak,
        tensionMessage: '',
        isHotStreak: (currentStreak.currentStreak || 0) >= 3,
        roundNumber: ((currentStreak.totalWins || currentStreak.wins || 0) + (currentStreak.totalLosses || currentStreak.losses || 0) + 1)
    };

    // Calculate bust probability for hint
    game.bustProbability = calculateBustProbability(playerHand, deck);
    game.strategyHint = getStrategyHint(playerHand, dealerHand[0]);

    // Check if dealer shows Ace - offer insurance!
    // NOTE: Dealer does NOT peek at hole card yet when showing Ace
    // Player must decide on insurance first, then dealer peeks
    if (dealerHand[0].value === 'A') {
        game.canInsurance = true;
        game.state = GAME_STATES.INSURANCE_OFFERED;
        game.tensionMessage = '🎰 Dealer có Ace! Mua bảo hiểm?';
        // Return here - wait for player's insurance decision before checking blackjacks
        return game;
    }

    // Check for blackjacks
    const playerHasBlackjack = cardUtils.isBlackjack(playerHand);
    const dealerHasBlackjack = cardUtils.isBlackjack(dealerHand);

    // If dealer shows 10-value card (J, Q, K, 10), they peek at hole card immediately
    // (No insurance offered for 10-value cards)
    if (cardUtils.dealerShowsBlackjackCard(dealerHand) && dealerHand[0].value !== 'A') {
        game.dealerPeeked = true;

        if (dealerHasBlackjack) {
            // Dealer has blackjack - resolve immediately
            game.state = GAME_STATES.FINISHED;
            game.result = playerHasBlackjack ? RESULTS.PUSH : RESULTS.LOSE;
            game.tensionMessage = playerHasBlackjack ? '🤝 Cả hai đều Blackjack!' : '😱 Dealer có Blackjack!';
            calculatePayout(discordId, game);
            updateStreak(discordId, game.result);
            return game;
        }
    }

    // If player has blackjack and dealer doesn't (and we already peeked or didn't need to)
    if (playerHasBlackjack) {
        game.state = GAME_STATES.FINISHED;
        game.result = RESULTS.BLACKJACK;
        game.tensionMessage = '🎉 BLACKJACK! Thắng lớn!';
        calculatePayout(discordId, game);
        updateStreak(discordId, RESULTS.WIN);
    }

    // Add tension message based on situation
    if (!game.tensionMessage) {
        const playerValue = cardUtils.calculateHandValue(playerHand);
        const dealerUpValue = cardUtils.getCardValue(dealerHand[0]);

        if (playerValue >= 19) {
            game.tensionMessage = TENSION_MESSAGES.CLOSE_TO_21[Math.floor(Math.random() * 3)];
        } else if (dealerUpValue >= 10) {
            game.tensionMessage = TENSION_MESSAGES.DEALER_SHOWING_HIGH[Math.floor(Math.random() * 3)];
        }
    }

    return game;
}

/**
 * Take insurance bet (when dealer shows Ace)
 * Insurance pays 2:1 if dealer has blackjack
 * @param {Object} game
 * @returns {Object}
 */
function takeInsurance(game) {
    if (game.state !== GAME_STATES.INSURANCE_OFFERED) {
        return { error: 'insurance_not_available' };
    }

    const insuranceAmount = Math.floor(game.betAmount / 2);

    if (!economyManager.canAfford(game.discordId, insuranceAmount)) {
        return { error: 'insufficient_balance_insurance' };
    }

    // Deduct insurance bet
    economyManager.deductDCoin(game.discordId, insuranceAmount, TRANSACTION_TYPES.GAME_LOSS, 'Blackjack bảo hiểm');
    game.insurance = insuranceAmount;
    game.tensionMessage = `🛡️ Đã mua bảo hiểm ${insuranceAmount.toLocaleString()} DCoin`;

    // Check if dealer has blackjack
    const dealerHasBlackjack = cardUtils.isBlackjack(game.dealerHand);
    const playerHasBlackjack = cardUtils.isBlackjack(game.playerHand);

    if (dealerHasBlackjack) {
        // Insurance wins! Pays 2:1
        game.insurancePayout = insuranceAmount * 3; // Return bet + 2:1 win
        economyManager.addDCoin(game.discordId, game.insurancePayout, TRANSACTION_TYPES.GAME_WIN, 'Blackjack bảo hiểm thắng');

        game.state = GAME_STATES.FINISHED;
        game.result = playerHasBlackjack ? RESULTS.PUSH : RESULTS.LOSE;
        game.tensionMessage = `🛡️ Bảo hiểm thắng! +${game.insurancePayout.toLocaleString()} DCoin`;
        calculatePayout(game.discordId, game);
        updateStreak(game.discordId, game.result);
    } else {
        // Insurance loses, game continues
        game.tensionMessage = '❌ Bảo hiểm thua! Dealer không có Blackjack';

        // Check if player has blackjack
        if (playerHasBlackjack) {
            game.state = GAME_STATES.FINISHED;
            game.result = RESULTS.BLACKJACK;
            game.tensionMessage = '🎉 BLACKJACK! Bảo hiểm thua nhưng bạn thắng lớn!';
            calculatePayout(game.discordId, game);
            updateStreak(game.discordId, RESULTS.WIN);
        } else {
            game.state = GAME_STATES.PLAYING;
        }
    }

    return game;
}

/**
 * Decline insurance and continue playing
 * @param {Object} game
 * @returns {Object}
 */
function declineInsurance(game) {
    if (game.state !== GAME_STATES.INSURANCE_OFFERED) {
        return { error: 'insurance_not_available' };
    }

    game.canInsurance = false;
    game.tensionMessage = '⏭️ Bỏ qua bảo hiểm...';

    // Check if dealer has blackjack
    const dealerHasBlackjack = cardUtils.isBlackjack(game.dealerHand);
    const playerHasBlackjack = cardUtils.isBlackjack(game.playerHand);

    if (dealerHasBlackjack) {
        game.state = GAME_STATES.FINISHED;
        game.result = playerHasBlackjack ? RESULTS.PUSH : RESULTS.LOSE;
        game.tensionMessage = playerHasBlackjack ? '🤝 Cả hai Blackjack! Hòa!' : '😱 Dealer Blackjack! Đáng lẽ mua bảo hiểm...';
        calculatePayout(game.discordId, game);
        updateStreak(game.discordId, game.result);
    } else if (playerHasBlackjack) {
        game.state = GAME_STATES.FINISHED;
        game.result = RESULTS.BLACKJACK;
        game.tensionMessage = '🎉 BLACKJACK!';
        calculatePayout(game.discordId, game);
        updateStreak(game.discordId, RESULTS.WIN);
    } else {
        game.state = GAME_STATES.PLAYING;
    }

    return game;
}

/**
 * Player hits (takes another card)
 * Enhanced với animation và probability tracking
 * @param {Object} game
 * @returns {Object}
 */
function hit(game) {
    if (game.state !== GAME_STATES.PLAYING) {
        return { error: 'invalid_state' };
    }

    // Draw card with dramatic effect
    const newCard = game.deck.pop();
    game.playerHand.push(newCard);

    const playerValue = cardUtils.calculateHandValue(game.playerHand);

    // Update probability and hint
    game.bustProbability = calculateBustProbability(game.playerHand, game.deck);
    game.strategyHint = getStrategyHint(game.playerHand, game.dealerHand[0]);

    // Generate tension message based on new card
    if (cardUtils.isBust(game.playerHand)) {
        game.state = GAME_STATES.FINISHED;
        game.result = RESULTS.LOSE;
        game.tensionMessage = TENSION_MESSAGES.BUST_INCOMING[Math.floor(Math.random() * 3)];
        updateStreak(game.discordId, RESULTS.LOSE);
    } else if (playerValue === 21) {
        game.tensionMessage = '⭐ 21 điểm hoàn hảo! Dừng ngay!';
    } else if (playerValue >= 17) {
        game.tensionMessage = TENSION_MESSAGES.PLAYER_HIGH[Math.floor(Math.random() * 3)];
    } else if (game.bustProbability > 50) {
        game.tensionMessage = `⚠️ ${game.bustProbability}% bust! Cân nhắc kỹ...`;
    } else {
        // Exciting message for good draw
        const cardEmoji = newCard.value === 'A' ? '🅰️' : (parseInt(newCard.value) >= 10 || ['J', 'Q', 'K'].includes(newCard.value)) ? '🔟' : `${newCard.value}️⃣`;
        game.tensionMessage = `Rút được ${cardEmoji}! Tổng: ${playerValue}`;
    }

    // Track card drawn for animation purposes
    game.lastDrawnCard = newCard;

    return game;
}

/**
 * Player stands
 * Enhanced với dealer turn drama
 * @param {Object} game
 * @returns {Object}
 */
function stand(game) {
    if (game.state !== GAME_STATES.PLAYING) {
        return { error: 'invalid_state' };
    }

    game.state = GAME_STATES.DEALER_TURN;
    game.tensionMessage = '🎭 Lượt Dealer! Hồi hộp...';

    // Store player's final value for comparison messaging
    game.playerFinalValue = cardUtils.calculateHandValue(game.playerHand);

    dealerPlay(game);

    return game;
}

/**
 * Player doubles down
 * Enhanced với risk indicator
 * @param {Object} game
 * @returns {Object}
 */
function double(game) {
    if (game.state !== GAME_STATES.PLAYING) {
        return { error: 'invalid_state' };
    }

    if (!cardUtils.canDouble(game.playerHand)) {
        return { error: 'cannot_double' };
    }

    if (!economyManager.canAfford(game.discordId, game.betAmount)) {
        return { error: 'insufficient_balance' };
    }

    // Calculate risk before doubling
    const preDoubleProb = calculateBustProbability(game.playerHand, game.deck);
    const riskLevel = preDoubleProb > 50 ? '⚠️ RỦI RO CAO!' : preDoubleProb > 30 ? '😬 Khá rủi ro' : '✅ Quyết định tốt!';

    // Deduct additional bet
    economyManager.deductDCoin(game.discordId, game.betAmount, TRANSACTION_TYPES.GAME_LOSS, 'Blackjack double');
    game.betAmount *= 2;
    game.doubled = true;

    game.tensionMessage = `💰 NHÂN ĐÔI! ${riskLevel} Cược: ${game.betAmount.toLocaleString()}`;

    // Take one card and stand
    const newCard = game.deck.pop();
    game.playerHand.push(newCard);
    game.lastDrawnCard = newCard;

    const playerValue = cardUtils.calculateHandValue(game.playerHand);

    if (cardUtils.isBust(game.playerHand)) {
        game.state = GAME_STATES.FINISHED;
        game.result = RESULTS.LOSE;
        game.tensionMessage = `💔 Nhân đôi và BUST! Mất ${game.betAmount.toLocaleString()} DCoin`;
        updateStreak(game.discordId, RESULTS.LOSE);
    } else {
        game.tensionMessage = `💰 Nhân đôi xong! Điểm: ${playerValue}. Dealer lượt...`;
        game.state = GAME_STATES.DEALER_TURN;
        dealerPlay(game);
    }

    return game;
}

/**
 * Player surrenders
 * Enhanced với tactical feedback
 * @param {Object} game
 * @returns {Object}
 */
function surrender(game) {
    if (game.state !== GAME_STATES.PLAYING) {
        return { error: 'invalid_state' };
    }

    if (game.playerHand.length !== 2) {
        return { error: 'cannot_surrender' };
    }

    game.state = GAME_STATES.FINISHED;
    game.result = RESULTS.SURRENDER;

    // Return half of bet
    const refund = Math.floor(game.betAmount / 2);
    economyManager.addDCoin(game.discordId, refund, TRANSACTION_TYPES.GAME_WIN, 'Blackjack surrender');

    // Tactical feedback
    const dealerUpcard = game.dealerHand[0];
    const dealerValue = cardUtils.getCardValue(dealerUpcard);
    const playerValue = cardUtils.calculateHandValue(game.playerHand);

    // Check if surrender was a good decision
    const goodSurrender = (playerValue >= 15 && playerValue <= 16 && dealerValue >= 9) || (playerValue === 16 && dealerValue === 10);

    if (goodSurrender) {
        game.tensionMessage = `🏳️ Quyết định khôn ngoan! Thu về ${refund.toLocaleString()} DCoin`;
    } else {
        game.tensionMessage = `🏳️ Đầu hàng... Thu về ${refund.toLocaleString()} DCoin`;
    }

    // Surrender doesn't count as win or loss for streak
    return game;
}

/**
 * Dealer plays their turn
 * Enhanced với dramatic card reveal
 * @param {Object} game
 */
function dealerPlay(game) {
    // Track dealer's drawing sequence for animation
    game.dealerDrawSequence = [];

    // Dealer hits until 17 or higher
    while (cardUtils.calculateHandValue(game.dealerHand) < 17) {
        const newCard = game.deck.pop();
        game.dealerHand.push(newCard);
        game.dealerDrawSequence.push(newCard);
    }

    game.state = GAME_STATES.FINISHED;

    const playerValue = cardUtils.calculateHandValue(game.playerHand);
    const dealerValue = cardUtils.calculateHandValue(game.dealerHand);

    // Generate dramatic result message
    if (cardUtils.isBust(game.dealerHand)) {
        game.result = RESULTS.WIN;
        game.tensionMessage = `💥 Dealer BUST với ${dealerValue}! Bạn thắng!`;
    } else if (playerValue > dealerValue) {
        game.result = RESULTS.WIN;
        game.tensionMessage = `🎉 ${playerValue} vs ${dealerValue}! Bạn thắng!`;
    } else if (playerValue < dealerValue) {
        game.result = RESULTS.LOSE;
        game.tensionMessage = `😔 ${playerValue} vs ${dealerValue}. Dealer thắng...`;
    } else {
        game.result = RESULTS.PUSH;
        game.tensionMessage = `🤝 ${playerValue} = ${dealerValue}. Hòa!`;
    }

    calculatePayout(game.discordId, game);
    updateStreak(game.discordId, game.result);
}

/**
 * Update player win/loss streak
 * Tracks both total statistics and current consecutive streak
 * @param {string} discordId
 * @param {string} result
 */
function updateStreak(discordId, result) {
    let streak = playerStreaks.get(discordId) || {
        totalWins: 0,
        totalLosses: 0,
        maxStreak: 0,
        currentStreak: 0,
        // Legacy fields for backwards compatibility
        wins: 0,
        losses: 0
    };

    if (result === RESULTS.WIN || result === RESULTS.BLACKJACK) {
        // Increment total wins
        streak.totalWins = (streak.totalWins || 0) + 1;
        streak.wins = streak.totalWins; // Keep legacy field updated

        // Update consecutive streak (positive = win streak)
        if (streak.currentStreak >= 0) {
            streak.currentStreak++;
        } else {
            streak.currentStreak = 1; // Start new win streak
        }

        streak.maxStreak = Math.max(streak.maxStreak, streak.currentStreak);
    } else if (result === RESULTS.LOSE) {
        // Increment total losses
        streak.totalLosses = (streak.totalLosses || 0) + 1;
        streak.losses = streak.totalLosses; // Keep legacy field updated

        // Update consecutive streak (negative = loss streak)
        if (streak.currentStreak <= 0) {
            streak.currentStreak--;
        } else {
            streak.currentStreak = -1; // Start new loss streak
        }
    }
    // PUSH and SURRENDER don't affect streak

    playerStreaks.set(discordId, streak);
}

/**
 * Get player's current streak info
 * @param {string} discordId
 * @returns {Object}
 */
function getStreak(discordId) {
    const streak = playerStreaks.get(discordId);
    if (!streak) {
        return {
            wins: 0,
            losses: 0,
            totalWins: 0,
            totalLosses: 0,
            maxStreak: 0,
            currentStreak: 0
        };
    }
    // Ensure backwards compatibility
    return {
        wins: streak.wins || streak.totalWins || 0,
        losses: streak.losses || streak.totalLosses || 0,
        totalWins: streak.totalWins || streak.wins || 0,
        totalLosses: streak.totalLosses || streak.losses || 0,
        maxStreak: streak.maxStreak || 0,
        currentStreak: streak.currentStreak || 0
    };
}

/**
 * Calculate and give payout
 * Enhanced với streak bonus
 * @param {string} discordId
 * @param {Object} game
 */
function calculatePayout(discordId, game) {
    let payout = 0;
    const { blackjackPayout } = config.casino.blackjack;
    const streak = getStreak(discordId);

    // Calculate streak bonus (capped at 10%)
    // Only apply bonus if player already has a positive win streak
    // Note: currentStreak reflects PREVIOUS state before this result is counted
    let streakBonus = 0;
    if ((game.result === RESULTS.WIN || game.result === RESULTS.BLACKJACK) && streak.currentStreak > 0) {
        streakBonus = Math.min(streak.currentStreak * 0.02, 0.1); // 2% per win streak, max 10%
    }

    switch (game.result) {
        case RESULTS.BLACKJACK:
            payout = game.betAmount + Math.floor(game.betAmount * blackjackPayout);
            // Blackjack with streak bonus
            if (streakBonus > 0) {
                const bonus = Math.floor(payout * streakBonus);
                payout += bonus;
                game.streakBonus = bonus;
            }
            break;
        case RESULTS.WIN:
            payout = game.betAmount * 2;
            // Win with streak bonus
            if (streakBonus > 0) {
                const bonus = Math.floor(payout * streakBonus);
                payout += bonus;
                game.streakBonus = bonus;
            }
            break;
        case RESULTS.PUSH:
            payout = game.betAmount;
            break;
        case RESULTS.SURRENDER:
            // Already handled
            payout = 0;
            break;
        case RESULTS.LOSE:
            payout = 0;
            break;
    }

    if (payout > 0) {
        economyManager.addDCoin(discordId, payout, TRANSACTION_TYPES.GAME_WIN, `Blackjack ${game.result}`);
    }

    game.payout = payout;
    game.profit = payout - game.betAmount;

    // Award XP based on result
    let xpAction = 'BLACKJACK_PLAY';
    if (game.result === RESULTS.BLACKJACK) {
        xpAction = 'BLACKJACK_BLACKJACK';
    } else if (game.result === RESULTS.WIN) {
        xpAction = 'BLACKJACK_WIN';
    }

    const xpResult = levelManager.awardXP(discordId, xpAction);
    game.xpGained = xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0;
    game.levelUp = xpResult.leveledUp || false;
    game.newLevel = xpResult.newLevel || null;

    // Update streak info in game for display
    game.streak = getStreak(discordId);
}

/**
 * Get game state for display
 * Enhanced với tất cả thông tin interactive
 * @param {Object} game
 * @returns {Object}
 */
function getGameState(game) {
    const hideDealer = game.state === GAME_STATES.PLAYING || game.state === GAME_STATES.INSURANCE_OFFERED;
    const playerValue = cardUtils.calculateHandValue(game.playerHand);

    return {
        playerHand: cardUtils.formatHand(game.playerHand),
        playerValue: cardUtils.formatHandValue(game.playerHand),
        playerValueNum: playerValue,
        dealerHand: cardUtils.formatHand(game.dealerHand, hideDealer),
        dealerValue: cardUtils.formatHandValue(game.dealerHand, hideDealer),
        state: game.state,
        result: game.result,
        betAmount: game.betAmount,
        originalBet: game.originalBet || game.betAmount,
        payout: game.payout || 0,
        profit: game.profit || 0,
        canHit: game.state === GAME_STATES.PLAYING,
        canStand: game.state === GAME_STATES.PLAYING,
        canDouble: game.state === GAME_STATES.PLAYING && cardUtils.canDouble(game.playerHand) && economyManager.canAfford(game.discordId, game.betAmount),
        canSurrender: game.state === GAME_STATES.PLAYING && game.playerHand.length === 2,
        // Insurance states
        canInsurance: game.state === GAME_STATES.INSURANCE_OFFERED,
        insuranceAmount: Math.floor(game.betAmount / 2),
        insurance: game.insurance,
        insurancePayout: game.insurancePayout || 0,
        // Interactive features
        bustProbability: game.bustProbability || calculateBustProbability(game.playerHand, game.deck || []),
        strategyHint: game.strategyHint || '',
        tensionMessage: game.tensionMessage || '',
        valueEmoji: getValueEmoji(playerValue),
        // Streak info
        streak: game.streak || { wins: 0, losses: 0, maxStreak: 0, currentStreak: 0 },
        streakBonus: game.streakBonus || 0,
        isHotStreak: (game.streak?.currentStreak || 0) >= 3,
        isColdStreak: (game.streak?.currentStreak || 0) <= -3,
        roundNumber: game.roundNumber || 1,
        // Animation helpers
        lastDrawnCard: game.lastDrawnCard ? cardUtils.cardToEmoji(game.lastDrawnCard) : null,
        dealerDrawSequence: game.dealerDrawSequence ? game.dealerDrawSequence.map(c => cardUtils.cardToEmoji(c)) : [],
        doubled: game.doubled,
        // XP and level info
        xpGained: game.xpGained || 0,
        levelUp: game.levelUp || false,
        newLevel: game.newLevel || null
    };
}

/**
 * Get result message with DCoin info
 * Enhanced với streak và bonus info
 * @param {Object} game
 * @returns {string}
 */
function getResultMessage(game) {
    const { payout, betAmount, doubled, streakBonus, streak, tensionMessage } = game;
    const originalBet = doubled ? betAmount / 2 : betAmount;
    const profit = payout > 0 ? payout - betAmount : -betAmount;

    // Base message from tension
    let message = tensionMessage ? `${tensionMessage}\n\n` : '';

    switch (game.result) {
        case RESULTS.BLACKJACK:
            message += `🎉 **BLACKJACK!** Bạn thắng lớn!\n💰 +${profit.toLocaleString()} DCoin`;
            break;
        case RESULTS.WIN:
            message += `✨ **Bạn thắng!**\n💰 +${profit.toLocaleString()} DCoin`;
            break;
        case RESULTS.LOSE:
            message += `😔 **Bạn thua!**\n💸 -${betAmount.toLocaleString()} DCoin`;
            break;
        case RESULTS.PUSH:
            message += '🤝 **Hòa!** Hoàn tiền cược.';
            break;
        case RESULTS.SURRENDER:
            message += `🏳️ **Đầu hàng!**\n💸 -${Math.floor(originalBet / 2).toLocaleString()} DCoin`;
            break;
        default:
            return '';
    }

    // Add streak bonus info
    if (streakBonus > 0) {
        message += `\n🔥 **Streak Bonus:** +${streakBonus.toLocaleString()} DCoin`;
    }

    // Add streak info
    if (streak) {
        if (streak.currentStreak >= 3) {
            message += `\n🔥 **HOT STREAK!** ${streak.currentStreak} thắng liên tiếp!`;
        } else if (streak.currentStreak <= -3) {
            message += `\n❄️ Đang bị xui... ${Math.abs(streak.currentStreak)} thua liên tiếp`;
        }
    }

    return message;
}

/**
 * Get detailed stats for a player
 * @param {string} discordId
 * @returns {Object}
 */
function getPlayerStats(discordId) {
    const streak = getStreak(discordId);
    return {
        currentStreak: streak.currentStreak,
        maxStreak: streak.maxStreak,
        totalWins: streak.wins,
        totalLosses: streak.losses,
        isHotStreak: streak.currentStreak >= 3,
        isColdStreak: streak.currentStreak <= -3
    };
}

module.exports = {
    GAME_STATES,
    RESULTS,
    createGame,
    hit,
    stand,
    double,
    surrender,
    takeInsurance,
    declineInsurance,
    getGameState,
    getResultMessage,
    getStreak,
    getPlayerStats,
    calculateBustProbability,
    getStrategyHint,
    getValueEmoji
};
