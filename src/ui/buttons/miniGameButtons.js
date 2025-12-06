const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MINIGAME_BUTTONS } = require('../../utils/constants');

/**
 * Create mini games menu buttons
 * @returns {Array<ActionRowBuilder>}
 */
function createMiniGamesMenuButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_lucky_number')
                .setLabel('🎯 Đoán số')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('minigame_higher_lower')
                .setLabel('🃏 Đoán cao thấp')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('minigame_quick_math')
                .setLabel('⚡ Toán nhẩm nhanh')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_mystery_box')
                .setLabel('🎁 Túi mù')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('minigame_coinflip')
                .setLabel('🪙 Tung xu')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('minigame_scratch')
                .setLabel('🎫 Cào xổ số')
                .setStyle(ButtonStyle.Success)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_rps')
                .setLabel('✊ Oẳn tù tì')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('minigame_mining')
                .setLabel('⛏️ Đào mỏ')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('minigame_fishing')
                .setLabel('🎣 Câu cá')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2, row3];
}

/**
 * Create Lucky Number guess buttons
 * @param {Object} game 
 * @returns {Array<ActionRowBuilder>}
 */
function createLuckyNumberButtons(game) {
    // Create number range buttons based on hints
    const lastGuess = game.guesses[game.guesses.length - 1];
    let low = 1, high = 100;

    // Narrow down range based on guesses
    for (let i = 0; i < game.guesses.length; i++) {
        const g = game.guesses[i];
        if (g < game.targetNumber && g > low) low = g + 1;
        if (g > game.targetNumber && g < high) high = g - 1;
    }

    // Create quick guess buttons
    const mid = Math.floor((low + high) / 2);
    const q1 = Math.floor((low + mid) / 2);
    const q3 = Math.floor((mid + high) / 2);

    // Đảm bảo các nút không bị trùng
    const uniqueNumbers = [...new Set([low, q1, mid, q3, high])].sort((a, b) => a - b);

    const row1 = new ActionRowBuilder();
    uniqueNumbers.forEach((num, idx) => {
        let style = ButtonStyle.Secondary;
        if (num === mid) style = ButtonStyle.Success;
        else if (num === q1 || num === q3) style = ButtonStyle.Primary;

        row1.addComponents(
            new ButtonBuilder()
                .setCustomId(`lucky_guess_${num}`)
                .setLabel(`${num}`)
                .setStyle(style)
        );
    });

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('lucky_custom_guess')
                .setLabel('✍️ Nhập số khác')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('lucky_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Danger)
        );

    return [row1, row2];
}

/**
 * Create Higher/Lower buttons
 * V2: Added Double or Nothing button (appears when streak >= 3)
 * @param {boolean} canCashOut 
 * @param {number} streak - Current streak (for Double or Nothing)
 * @returns {Array<ActionRowBuilder>}
 */
function createHigherLowerButtons(canCashOut = false, streak = 0) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hl_higher')
                .setLabel('📈 Cao hơn')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('hl_lower')
                .setLabel('📉 Thấp hơn')
                .setStyle(ButtonStyle.Danger)
        );

    if (canCashOut) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('hl_cashout')
                .setLabel('💰 Rút tiền')
                .setStyle(ButtonStyle.Primary)
        );
    }

    row.addComponents(
        new ButtonBuilder()
            .setCustomId('hl_cancel')
            .setLabel('❌ Hủy')
            .setStyle(ButtonStyle.Secondary)
    );

    // V2: Add Double or Nothing button in second row (requires streak >= 3)
    if (canCashOut && streak >= 3) {
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('hl_double_or_nothing')
                    .setLabel('🎰 Double or Nothing (50/50)')
                    .setStyle(ButtonStyle.Danger)
            );
        return [row, row2];
    }

    return [row];
}

/**
 * Create Quick Math answer buttons
 * @param {Array} options 
 * @returns {Array<ActionRowBuilder>}
 */
function createQuickMathButtons(options) {
    const row = new ActionRowBuilder();

    options.forEach((opt, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`qm_answer_${index}`)
                .setLabel(`${opt}`)
                .setStyle(ButtonStyle.Primary)
        );
    });

    return [row];
}

/**
 * Create Mystery Box buttons
 * @param {number} balance - Current balance (optional, for disabling buttons)
 * @returns {Array<ActionRowBuilder>}
 */
function createMysteryBoxButtons(balance = Infinity) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('box_normal')
                .setLabel('📦 Thường (500)')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(balance < 500),
            new ButtonBuilder()
                .setCustomId('box_premium')
                .setLabel('🎁 Cao cấp (1000)')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(balance < 1000),
            new ButtonBuilder()
                .setCustomId('box_legendary')
                .setLabel('👑 Huyền thoại (2000)')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(balance < 2000)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create Tài Xỉu main bet category buttons
 * @returns {Array<ActionRowBuilder>}
 */
function createDiceBetButtons() {
    // Row 1: Basic bets - most common - FIXED: x2 as displayed
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dice_tai')
                .setLabel('🔴 Tài (x2)')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('dice_xiu')
                .setLabel('🔵 Xỉu (x2)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dice_chan')
                .setLabel('⚫ Chẵn (x2)')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('dice_le')
                .setLabel('⚪ Lẻ (x2)')
                .setStyle(ButtonStyle.Secondary)
        );

    // Row 2: Advanced bets - Bộ ba
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dice_any_triple')
                .setLabel('🎰 Bất kỳ Bộ ba (x28)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dice_category_triple')
                .setLabel('⚀⚀⚀ Bộ ba cụ thể (x150)')
                .setStyle(ButtonStyle.Danger)
        );

    // Row 3: Total bets
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dice_category_total')
                .setLabel('🎯 Đoán Tổng (x5.5-50)')
                .setStyle(ButtonStyle.Success)
        );

    // Row 4: Navigation - Quay về Casino
    const row4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_casino')
                .setLabel('⬅️ Quay lại Casino')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2, row3, row4];
}

/**
 * Create Bộ ba specific bet buttons
 * @returns {Array<ActionRowBuilder>}
 */
function createDiceTripleBetButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dice_triple_1')
                .setLabel('⚀⚀⚀ Bộ ba 1')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('dice_triple_2')
                .setLabel('⚁⚁⚁ Bộ ba 2')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('dice_triple_3')
                .setLabel('⚂⚂⚂ Bộ ba 3')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('dice_triple_4')
                .setLabel('⚃⚃⚃ Bộ ba 4')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dice_triple_5')
                .setLabel('⚄⚄⚄ Bộ ba 5')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dice_triple_6')
                .setLabel('⚅⚅⚅ Bộ ba 6')
                .setStyle(ButtonStyle.Primary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('casino_taixiu')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2, row3];
}

/**
 * Create Total specific bet buttons (split into multiple pages due to Discord button limit)
 * @param {number} page - Page number (1 or 2)
 * @returns {Array<ActionRowBuilder>}
 */
function createDiceTotalBetButtons(page = 1) {
    if (page === 1) {
        // Low totals: 4-10
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_4')
                    .setLabel('4 (x50)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('dice_total_5')
                    .setLabel('5 (x25)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('dice_total_6')
                    .setLabel('6 (x15)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dice_total_7')
                    .setLabel('7 (x10)')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_8')
                    .setLabel('8 (x7)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dice_total_9')
                    .setLabel('9 (x6)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dice_total_10')
                    .setLabel('10 (x5.5)')
                    .setStyle(ButtonStyle.Success)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_page_2')
                    .setLabel('➡️ Tổng 11-17')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('casino_taixiu')
                    .setLabel('⬅️ Quay lại')
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2, row3];
    } else {
        // High totals: 11-17
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_11')
                    .setLabel('11 (x5.5)')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dice_total_12')
                    .setLabel('12 (x6)')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dice_total_13')
                    .setLabel('13 (x7)')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_14')
                    .setLabel('14 (x10)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dice_total_15')
                    .setLabel('15 (x15)')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dice_total_16')
                    .setLabel('16 (x25)')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('dice_total_17')
                    .setLabel('17 (x50)')
                    .setStyle(ButtonStyle.Danger)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dice_total_page_1')
                    .setLabel('⬅️ Tổng 4-10')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('casino_taixiu')
                    .setLabel('⬅️ Menu Tài Xỉu')
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2, row3];
    }
}

/**
 * Create Dice bet amount buttons
 * @param {string} betType 
 * @returns {Array<ActionRowBuilder>}
 */
function createDiceBetAmountButtons(betType) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_50`)
                .setLabel('50 💰')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_100`)
                .setLabel('100 💰')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_200`)
                .setLabel('200 💰')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_500`)
                .setLabel('500 💰')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_1000`)
                .setLabel('1000 💰')
                .setStyle(ButtonStyle.Danger)
        );

    const rowCustom = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_custom`)
                .setLabel('✍️ Tự điền số tiền')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_dice')
                .setLabel('⬅️ Chọn lại cược')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, rowCustom, row2];
}

/**
 * Create Dice custom bet button (after modal submit)
 * Shows a single button to roll with the custom bet amount
 * @param {string} betType 
 * @param {number} betAmount 
 * @returns {Array<ActionRowBuilder>}
 */
function createDiceCustomBetButton(betType, betAmount) {
    const taixiu = require('../../games/casino/taixiu');
    const betOption = taixiu.BET_OPTIONS[betType.toUpperCase()];
    const betName = betOption?.name || betType;
    const multiplier = betOption?.multiplier || '?';

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`dice_bet_${betType}_${betAmount}`)
                .setLabel(`🎲 ${betName} - ${betAmount.toLocaleString()} 💰 (x${multiplier})`)
                .setStyle(ButtonStyle.Success)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_dice')
                .setLabel('⬅️ Chọn lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create play again buttons
 * @param {string} gameType 
 * @returns {Array<ActionRowBuilder>}
 */
function createPlayAgainButtons(gameType) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`minigame_${gameType}`)
                .setLabel('🔄 Chơi lại')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row];
}

/**
 * Create Mining buttons
 * @param {boolean} hasPickaxe - Whether user has a pickaxe
 * @param {boolean} onCooldown - Whether user is on cooldown
 * @returns {Array<ActionRowBuilder>}
 */
function createMiningButtons(hasPickaxe = false, onCooldown = false) {
    const canMine = hasPickaxe && !onCooldown;
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_select_tool')
                .setLabel('⛏️ Chọn cuốc & Đào')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!hasPickaxe),
            new ButtonBuilder()
                .setCustomId('nav_gacha')
                .setLabel('🎰 Gacha cuốc')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create Mining result buttons (with sell and change tool options)
 * @returns {Array<ActionRowBuilder>}
 */
function createMiningResultButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_mining')
                .setLabel('⛏️ Đào tiếp')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('mining_change_tool')
                .setLabel('🔄 Đổi cuốc')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('goto_shop_sell')
                .setLabel('💰 Bán quặng')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create Fishing buttons
 * @param {boolean} hasRod - Whether user has a fishing rod
 * @param {boolean} onCooldown - Whether user is on cooldown
 * @returns {Array<ActionRowBuilder>}
 */
function createFishingButtons(hasRod = false, onCooldown = false) {
    const canFish = hasRod && !onCooldown;
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_select_tool')
                .setLabel('🎣 Chọn cần câu & Câu')
                .setStyle(ButtonStyle.Success)
                .setDisabled(!hasRod),
            new ButtonBuilder()
                .setCustomId('nav_gacha')
                .setLabel('🎰 Gacha cần câu')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create Fishing result buttons (with sell and change tool options)
 * @returns {Array<ActionRowBuilder>}
 */
function createFishingResultButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_fishing')
                .setLabel('🎣 Câu tiếp')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('fishing_change_tool')
                .setLabel('🔄 Đổi cần câu')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('goto_shop_sell')
                .setLabel('💰 Bán cá')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create Scratch Card buttons
 * @param {number} balance
 * @returns {Array<ActionRowBuilder>}
 */
function createScratchCardButtons(balance) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('scratch_basic')
                .setLabel('🎫 Cơ Bản (25 💰)')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(balance < 25),
            new ButtonBuilder()
                .setCustomId('scratch_silver')
                .setLabel('🥈 Bạc (50 💰)')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(balance < 50),
            new ButtonBuilder()
                .setCustomId('scratch_gold')
                .setLabel('🥇 Vàng (100 💰)')
                .setStyle(ButtonStyle.Success)
                .setDisabled(balance < 100)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('◀ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2];
}

/**
 * Create Scratch Card result buttons
 * @param {number} balance
 * @param {string} cardTypeId - Loại thẻ vừa cào ('basic', 'silver', 'gold')
 * @returns {Array<ActionRowBuilder>}
 */
function createScratchCardResultButtons(balance, cardTypeId = 'basic') {
    // Xác định cost và có đủ tiền không
    const costs = { basic: 25, silver: 50, gold: 100 };
    const cost = costs[cardTypeId] || 25;
    const canAfford = balance >= cost;

    // Label hiển thị loại thẻ
    const labels = { basic: '🎫 Cơ Bản', silver: '🥈 Bạc', gold: '🥇 Vàng' };
    const label = labels[cardTypeId] || '🎫 Cơ Bản';

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`scratch_continue_${cardTypeId}`)
                .setLabel(`🎟️ Cào tiếp ${label} (${cost} 💰)`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(!canAfford),
            new ButtonBuilder()
                .setCustomId('minigame_scratch')
                .setLabel('🎫 Menu Vé số')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row];
}

module.exports = {
    createMiniGamesMenuButtons,
    createLuckyNumberButtons,
    createHigherLowerButtons,
    createQuickMathButtons,
    createMysteryBoxButtons,
    createDiceBetButtons,
    createDiceTripleBetButtons,
    createDiceTotalBetButtons,
    createDiceBetAmountButtons,
    createDiceCustomBetButton,
    createPlayAgainButtons,
    createMiningButtons,
    createMiningResultButtons,
    createFishingButtons,
    createFishingResultButtons,
    createScratchCardButtons,
    createScratchCardResultButtons
};
