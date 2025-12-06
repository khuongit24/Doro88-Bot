const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt, weightedRandom } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * SCRATCH CARD - Cào xổ số
 * 
 * Mục đích: Trò chơi low-risk để người chơi có thể "gỡ" sau khi thua lớn
 * - Chi phí thấp: 25-100 DCoin
 * - RTP: ~92% (house edge 8%)  
 * - Không cooldown (cần chi tiền)
 * - Phần thưởng nhỏ nhưng ổn định
 * - 3 ô cào, khớp 2+ ô = thắng
 */

// Các loại thẻ cào
const CARD_TYPES = {
    BASIC: {
        id: 'basic',
        name: '🎫 Thẻ Cơ Bản',
        cost: 25,
        description: 'Thẻ cào giá rẻ, phần thưởng nhỏ',
        // RTP ~92% - EV = 23 DCoin
        symbols: [
            { emoji: '🍒', name: 'Anh đào', weight: 30, multiplier: 1.2 },    // 30% - x1.2 = 30 DCoin
            { emoji: '🍋', name: 'Chanh', weight: 25, multiplier: 1.5 },      // 25% - x1.5 = 37.5 DCoin
            { emoji: '🍊', name: 'Cam', weight: 20, multiplier: 2 },          // 20% - x2 = 50 DCoin
            { emoji: '🍇', name: 'Nho', weight: 15, multiplier: 3 },          // 15% - x3 = 75 DCoin
            { emoji: '⭐', name: 'Sao', weight: 8, multiplier: 5 },           // 8% - x5 = 125 DCoin
            { emoji: '💎', name: 'Kim cương', weight: 2, multiplier: 10 }     // 2% - x10 = 250 DCoin
        ]
    },
    SILVER: {
        id: 'silver',
        name: '🥈 Thẻ Bạc',
        cost: 50,
        description: 'Thẻ cào trung bình, cơ hội thắng cao hơn',
        // RTP ~92% - EV = 46 DCoin
        symbols: [
            { emoji: '🍒', name: 'Anh đào', weight: 25, multiplier: 1.2 },
            { emoji: '🍋', name: 'Chanh', weight: 25, multiplier: 1.5 },
            { emoji: '🍊', name: 'Cam', weight: 20, multiplier: 2 },
            { emoji: '🍇', name: 'Nho', weight: 15, multiplier: 3 },
            { emoji: '⭐', name: 'Sao', weight: 10, multiplier: 5 },
            { emoji: '💎', name: 'Kim cương', weight: 4, multiplier: 8 },
            { emoji: '👑', name: 'Vương miện', weight: 1, multiplier: 15 }
        ]
    },
    GOLD: {
        id: 'gold',
        name: '🥇 Thẻ Vàng',
        cost: 100,
        description: 'Thẻ cào cao cấp, jackpot lớn!',
        // RTP ~92% - EV = 92 DCoin
        symbols: [
            { emoji: '🍒', name: 'Anh đào', weight: 20, multiplier: 1.2 },
            { emoji: '🍋', name: 'Chanh', weight: 22, multiplier: 1.5 },
            { emoji: '🍊', name: 'Cam', weight: 20, multiplier: 2 },
            { emoji: '🍇', name: 'Nho', weight: 15, multiplier: 3 },
            { emoji: '⭐', name: 'Sao', weight: 12, multiplier: 5 },
            { emoji: '💎', name: 'Kim cương', weight: 7, multiplier: 8 },
            { emoji: '👑', name: 'Vương miện', weight: 3, multiplier: 12 },
            { emoji: '🎰', name: 'JACKPOT', weight: 1, multiplier: 25 }
        ]
    }
};

// Số ô trên thẻ cào
const GRID_SIZE = 9; // 3x3 grid
const MATCH_REQUIRED = 3; // Cần 3 ô giống nhau để thắng

/**
 * Chọn symbol ngẫu nhiên dựa trên weight
 * @param {Array} symbols 
 * @returns {Object}
 */
function selectSymbol(symbols) {
    const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const symbol of symbols) {
        random -= symbol.weight;
        if (random <= 0) {
            return symbol;
        }
    }
    return symbols[0];
}

/**
 * Tạo grid thẻ cào
 * @param {Object} cardType 
 * @returns {Array}
 */
function generateGrid(cardType) {
    const grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        grid.push(selectSymbol(cardType.symbols));
    }
    return grid;
}

/**
 * Kiểm tra kết quả thắng
 * @param {Array} grid 
 * @returns {Object}
 */
function checkWin(grid) {
    // Đếm số lượng mỗi symbol
    const counts = {};
    grid.forEach(symbol => {
        counts[symbol.emoji] = (counts[symbol.emoji] || 0) + 1;
    });

    // Tìm symbol có nhiều nhất >= MATCH_REQUIRED
    let bestMatch = null;
    let bestCount = 0;

    for (const [emoji, count] of Object.entries(counts)) {
        if (count >= MATCH_REQUIRED && count > bestCount) {
            bestCount = count;
            bestMatch = grid.find(s => s.emoji === emoji);
        }
    }

    if (bestMatch) {
        // Bonus cho match nhiều hơn 3
        const bonusMultiplier = bestCount > MATCH_REQUIRED ? 1 + (bestCount - MATCH_REQUIRED) * 0.5 : 1;
        return {
            won: true,
            matchCount: bestCount,
            symbol: bestMatch,
            multiplier: bestMatch.multiplier * bonusMultiplier
        };
    }

    return { won: false, matchCount: 0 };
}

/**
 * Mua và cào thẻ
 * @param {string} discordId 
 * @param {string} cardTypeId 
 * @returns {Object}
 */
function scratch(discordId, cardTypeId = 'basic') {
    const cardType = CARD_TYPES[cardTypeId.toUpperCase()];
    if (!cardType) {
        return { error: 'invalid_card' };
    }

    // Kiểm tra số dư
    if (!economyManager.canAfford(discordId, cardType.cost)) {
        return { error: 'insufficient_balance', required: cardType.cost };
    }

    // Trừ tiền mua thẻ
    economyManager.deductDCoin(discordId, cardType.cost, TRANSACTION_TYPES.GAME_LOSS, `Scratch: ${cardType.name}`);

    // Tạo grid và kiểm tra kết quả
    const grid = generateGrid(cardType);
    const result = checkWin(grid);

    let winnings = 0;
    let profit = 0;

    if (result.won) {
        winnings = Math.floor(cardType.cost * result.multiplier);
        profit = winnings - cardType.cost;
        economyManager.addDCoin(discordId, winnings, TRANSACTION_TYPES.GAME_WIN, `Scratch: ${result.symbol.name} x${result.matchCount}`);
    }

    // XP reward
    const isJackpot = result.won && result.multiplier >= 10;
    const xpResult = levelManager.awardXP(discordId, isJackpot ? 'SCRATCH_JACKPOT' : (result.won ? 'SCRATCH_WIN' : 'SCRATCH_PLAY'));

    const newBalance = economyManager.getBalance(discordId);

    logger.info('Scratch card played', {
        discordId,
        cardType: cardTypeId,
        cost: cardType.cost,
        won: result.won,
        winnings,
        profit
    });

    return {
        success: true,
        cardType,
        grid,
        result,
        cost: cardType.cost,
        winnings,
        profit,
        newBalance,
        xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
        levelUp: xpResult.leveledUp || false,
        newLevel: xpResult.newLevel || null
    };
}

/**
 * Lấy thông tin các loại thẻ
 * @returns {Object}
 */
function getCardTypes() {
    return CARD_TYPES;
}

/**
 * Format grid để hiển thị (3x3)
 * @param {Array} grid 
 * @param {Object} result - Optional: highlight winning symbols
 * @returns {string}
 */
function formatGrid(grid, result = null) {
    let display = '```\n';
    display += '╔═══╦═══╦═══╗\n';
    
    for (let row = 0; row < 3; row++) {
        display += '║';
        for (let col = 0; col < 3; col++) {
            const idx = row * 3 + col;
            const symbol = grid[idx];
            display += ` ${symbol.emoji} ║`;
        }
        display += '\n';
        if (row < 2) {
            display += '╠═══╬═══╬═══╣\n';
        }
    }
    
    display += '╚═══╩═══╩═══╝\n';
    display += '```';
    
    return display;
}

/**
 * Format grid đơn giản cho embed
 * @param {Array} grid 
 * @returns {string}
 */
function formatGridSimple(grid) {
    let display = '';
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const idx = row * 3 + col;
            display += grid[idx].emoji + ' ';
        }
        display += '\n';
    }
    return display.trim();
}

module.exports = {
    CARD_TYPES,
    scratch,
    getCardTypes,
    formatGrid,
    formatGridSimple
};
