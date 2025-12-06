const { CARD_SUITS, CARD_VALUES } = require('../../utils/constants');
const { shuffleArray } = require('../../utils/helpers');

/**
 * Create a card
 * @param {string} value
 * @param {string} suit
 * @returns {Object}
 */
function createCard(value, suit) {
    return { value, suit, display: `${value}${suit}` };
}

/**
 * Create a deck of cards
 * @param {number} deckCount
 * @returns {Array}
 */
function createDeck(deckCount = 1) {
    const deck = [];
    for (let d = 0; d < deckCount; d++) {
        for (const suit of CARD_SUITS) {
            for (const value of CARD_VALUES) {
                deck.push(createCard(value, suit));
            }
        }
    }
    return shuffleArray(deck);
}

/**
 * Calculate card value for blackjack
 * @param {Object} card
 * @returns {number}
 */
function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11; // Will be adjusted if needed
    return parseInt(card.value);
}

/**
 * Calculate hand value for blackjack
 * @param {Array} hand
 * @returns {number}
 */
function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else {
            value += getCardValue(card);
        }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

/**
 * Check if hand is blackjack
 * @param {Array} hand
 * @returns {boolean}
 */
function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand) === 21;
}

/**
 * Check if hand is bust
 * @param {Array} hand
 * @returns {boolean}
 */
function isBust(hand) {
    return calculateHandValue(hand) > 21;
}

/**
 * Check if hand can split
 * @param {Array} hand
 * @returns {boolean}
 */
function canSplit(hand) {
    return hand.length === 2 && hand[0].value === hand[1].value;
}

/**
 * Check if hand can double down
 * @param {Array} hand
 * @returns {boolean}
 */
function canDouble(hand) {
    return hand.length === 2;
}

/**
 * Format hand for display
 * @param {Array} hand
 * @param {boolean} hideSecond - Hide the second card (hole card) - standard in casinos
 * @returns {string}
 */
function formatHand(hand, hideSecond = false) {
    if (hand.length === 0) return '(Không có bài)';

    const cards = hand.map((card, index) => {
        if (hideSecond && index === 1) return '🂠';
        return cardToEmoji(card);
    });

    return cards.join(' ');
}

/**
 * Convert card to emoji representation
 * @param {Object} card
 * @returns {string}
 */
function cardToEmoji(card) {
    const suitEmojis = {
        '♠': '♠️',
        '♥': '♥️',
        '♦': '♦️',
        '♣': '♣️'
    };

    return `[${card.value}${suitEmojis[card.suit] || card.suit}]`;
}

/**
 * Format hand value for display
 * @param {Array} hand
 * @param {boolean} hideSecond - Whether the second card (hole card) is hidden
 * @returns {string}
 */
function formatHandValue(hand, hideSecond = false) {
    if (hideSecond && hand.length >= 2) {
        // Only show first card's value
        const firstCardValue = getCardValue(hand[0]);
        // For Ace, show as 11 but could be 1
        if (hand[0].value === 'A') return '11';
        return firstCardValue.toString();
    }

    const value = calculateHandValue(hand);
    if (isBlackjack(hand)) return 'BLACKJACK!';
    if (isBust(hand)) return `${value} (BUST)`;
    return value.toString();
}

/**
 * Check if dealer has potential blackjack (showing Ace or 10-value card)
 * @param {Array} hand - Dealer's hand
 * @returns {boolean}
 */
function dealerShowsBlackjackCard(hand) {
    if (hand.length < 1) return false;
    const firstCard = hand[0];
    return firstCard.value === 'A' || ['10', 'J', 'Q', 'K'].includes(firstCard.value);
}

/**
 * Check if hand is a "soft" hand (contains an Ace counted as 11)
 * A soft hand means at least one Ace is being counted as 11 without busting
 * @param {Array} hand
 * @returns {boolean}
 */
function isSoftHand(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.value === 'A') {
            aces++;
            value += 11;
        } else {
            value += getCardValue(card);
        }
    }

    // Reduce aces from 11 to 1 until we're not busting
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }
    
    // If we still have aces counted as 11 (aces > 0), it's a soft hand
    // This means at least one Ace is being used as 11 without busting
    return aces > 0 && value <= 21;
}

module.exports = {
    createCard,
    createDeck,
    getCardValue,
    calculateHandValue,
    isBlackjack,
    isBust,
    canSplit,
    canDouble,
    formatHand,
    cardToEmoji,
    formatHandValue,
    dealerShowsBlackjackCard,
    isSoftHand
};
