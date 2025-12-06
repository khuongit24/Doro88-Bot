const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { BLACKJACK_BUTTONS, SLOTS_BUTTONS, ROULETTE_BUTTONS, MINIGAME_BUTTONS, NAV_BUTTONS } = require('../../utils/constants');
const config = require('../../config');

/**
 * Create blackjack betting buttons
 * @param {number} balance
 * @param {number} [customBet] - Custom bet amount from modal
 * @returns {ActionRowBuilder[]}
 */
function createBlackjackBetButtons(balance, customBet = null) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.BET_50)
            .setLabel('50 DCoin')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(balance < 50),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.BET_100)
            .setLabel('100 DCoin')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(balance < 100),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.BET_500)
            .setLabel('500 DCoin')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(balance < 500),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.BET_1000)
            .setLabel('1000 DCoin')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(balance < 1000),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.BET_CUSTOM)
            .setLabel('✍️ Tự chọn số tiền')
            .setStyle(ButtonStyle.Success)
    );

    const rows = [row1];

    // If custom bet is set, add a "Start with X DCoin" button
    if (customBet && customBet >= 10 && customBet <= balance) {
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`bj_bet_custom_${customBet}`)
                .setLabel(`🎴 Chơi với ${customBet.toLocaleString()} DCoin`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(NAV_BUTTONS.CASINO)
                .setLabel('◀ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );
        rows.push(row2);
    } else {
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(NAV_BUTTONS.CASINO)
                .setLabel('◀ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );
        rows.push(row2);
    }

    return rows;
}

/**
 * Create blackjack game action buttons
 * @param {Object} gameState
 * @returns {ActionRowBuilder[]}
 */
function createBlackjackGameButtons(gameState) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.HIT)
            .setLabel('🃏 Rút bài')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!gameState.canHit),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.STAND)
            .setLabel('✋ Dừng')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!gameState.canStand),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.DOUBLE)
            .setLabel('💰 Nhân đôi')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!gameState.canDouble),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.SURRENDER)
            .setLabel('🏳️ Đầu hàng')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!gameState.canSurrender)
    );

    return [row];
}

/**
 * Create blackjack insurance buttons (when dealer shows Ace)
 * @param {number} insuranceCost - Cost of insurance (half of bet)
 * @param {number} balance - Player's current balance
 * @returns {ActionRowBuilder[]}
 */
function createBlackjackInsuranceButtons(insuranceCost, balance) {
    const canAfford = balance >= insuranceCost;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.INSURANCE_YES)
            .setLabel(`🛡️ Mua bảo hiểm (${insuranceCost.toLocaleString()} DCoin)`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canAfford),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.INSURANCE_NO)
            .setLabel('❌ Từ chối')
            .setStyle(ButtonStyle.Danger)
    );

    return [row];
}

/**
 * Create blackjack end buttons
 * @param {number} balance - Current balance to check affordability
 * @param {number} lastBetAmount - Last bet amount for quick replay
 * @returns {ActionRowBuilder[]}
 */
function createBlackjackEndButtons(balance = 0, lastBetAmount = 50) {
    const canPlayAgain = balance >= lastBetAmount;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bj_replay_${lastBetAmount}`)
            .setLabel(`🔄 Chơi tiếp (${lastBetAmount.toLocaleString()})`)
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canPlayAgain),
        new ButtonBuilder()
            .setCustomId(BLACKJACK_BUTTONS.PLAY_AGAIN)
            .setLabel('💰 Đổi mức cược')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row];
}

/**
 * Create slots buttons - Enhanced with Vietnamese labels for beginners
 * @param {number} betAmount
 * @param {number} balance
 * @returns {ActionRowBuilder[]}
 */
function createSlotsButtons(betAmount, balance) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(SLOTS_BUTTONS.BET_DOWN)
            .setLabel('▼ Giảm')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(betAmount <= 10),
        new ButtonBuilder()
            .setCustomId(SLOTS_BUTTONS.BET_UP)
            .setLabel('▲ Tăng')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(betAmount >= Math.min(balance, config.casino.maxBet)),
        new ButtonBuilder()
            .setCustomId(SLOTS_BUTTONS.BET_MAX)
            .setLabel('💯 TỐI ĐA')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(betAmount >= Math.min(balance, config.casino.maxBet)),
        new ButtonBuilder()
            .setCustomId(SLOTS_BUTTONS.BET_CUSTOM)
            .setLabel('✏️ Tự chọn')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(SLOTS_BUTTONS.SPIN)
            .setLabel('🎰 QUAY!')
            .setStyle(ButtonStyle.Success)
            .setDisabled(balance < betAmount)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

/**
 * Create roulette bet buttons - Redesigned for beginners
 * @param {number} balance
 * @param {number} currentBetAmount - Current bet amount per click
 * @returns {ActionRowBuilder[]}
 */
function createRouletteBetButtons(balance, currentBetAmount = 50) {
    const disabled = balance < currentBetAmount;

    // ═══════════════════════════════════════════════════════════════
    // Row 1: Color & Odd/Even Bets (Most popular, beginner-friendly)
    // Clear visual distinction with color-coded buttons
    // ═══════════════════════════════════════════════════════════════
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.RED)
            .setLabel('🔴 Đỏ (x2)')
            .setStyle(ButtonStyle.Danger) // Red color
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.BLACK)
            .setLabel('⚫ Đen (x2)')
            .setStyle(ButtonStyle.Secondary) // Gray/dark color
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.ODD)
            .setLabel('🔢 Lẻ 1,3,5.. (x2)')
            .setStyle(ButtonStyle.Primary) // Blue
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.EVEN)
            .setLabel('🔢 Chẵn 2,4,6.. (x2)')
            .setStyle(ButtonStyle.Primary) // Blue
            .setDisabled(disabled)
    );

    // ═══════════════════════════════════════════════════════════════
    // Row 2: Range Bets + Main Actions
    // ═══════════════════════════════════════════════════════════════
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.LOW)
            .setLabel('📉 Nhỏ 1-18 (x2)')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.HIGH)
            .setLabel('📈 Lớn 19-36 (x2)')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.SPIN)
            .setLabel('🎡 QUAY!')
            .setStyle(ButtonStyle.Success), // Green - action button
        new ButtonBuilder()
            .setCustomId(ROULETTE_BUTTONS.CLEAR)
            .setLabel('❌ Hủy cược')
            .setStyle(ButtonStyle.Danger)
    );

    // ═══════════════════════════════════════════════════════════════
    // Row 3: Bet Amount Selection (Visually indicate selected amount)
    // ═══════════════════════════════════════════════════════════════
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('roulette_bet_50')
            .setLabel('💵 50')
            .setStyle(currentBetAmount === 50 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 50),
        new ButtonBuilder()
            .setCustomId('roulette_bet_100')
            .setLabel('💵 100')
            .setStyle(currentBetAmount === 100 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 100),
        new ButtonBuilder()
            .setCustomId('roulette_bet_500')
            .setLabel('💵 500')
            .setStyle(currentBetAmount === 500 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 500),
        new ButtonBuilder()
            .setCustomId('roulette_bet_1000')
            .setLabel('💵 1000')
            .setStyle(currentBetAmount === 1000 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 1000),
        new ButtonBuilder()
            .setCustomId('roulette_bet_custom')
            .setLabel('✏️ Tự nhập')
            .setStyle(ButtonStyle.Primary)
    );

    // ═══════════════════════════════════════════════════════════════
    // Row 4: Navigation
    // ═══════════════════════════════════════════════════════════════
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀️ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3, row4];
}

/**
 * Create coin flip buttons
 * @param {number} balance
 * @returns {ActionRowBuilder[]}
 */
function createCoinFlipButtons(balance, betAmount = 50) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.COINFLIP_HEADS)
            .setLabel('🪙 Mặt ngửa')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.COINFLIP_TAILS)
            .setLabel('💰 Mặt sấp')
            .setStyle(ButtonStyle.Success)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.COINFLIP_BET_CUSTOM)
            .setLabel('✍️ Tự điền số tiền')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.MINIGAMES)
            .setLabel('◀ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

/**
 * Create RPS buttons
 * @param {number} balance
 * @param {number} betAmount
 * @returns {ActionRowBuilder[]}
 */
function createRPSButtons(balance, betAmount = 50) {
    // Row 1: Bet amount selection (tương tự Crash, Wheel)
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('rps_bet_50')
            .setLabel('💰 50')
            .setStyle(betAmount === 50 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 50),
        new ButtonBuilder()
            .setCustomId('rps_bet_100')
            .setLabel('💰 100')
            .setStyle(betAmount === 100 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 100),
        new ButtonBuilder()
            .setCustomId('rps_bet_200')
            .setLabel('💰 200')
            .setStyle(betAmount === 200 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 200),
        new ButtonBuilder()
            .setCustomId('rps_bet_500')
            .setLabel('💰 500')
            .setStyle(betAmount === 500 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 500),
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.RPS_BET_CUSTOM)
            .setLabel('✍️ Nhập số')
            .setStyle(ButtonStyle.Primary)
    );

    // Row 2: Game choices (Đá, Bao, Kéo)
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.RPS_ROCK)
            .setLabel('🪨 Đá')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.RPS_PAPER)
            .setLabel('📄 Bao')
            .setStyle(ButtonStyle.Success)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(MINIGAME_BUTTONS.RPS_SCISSORS)
            .setLabel('✂️ Kéo')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(balance < betAmount)
    );

    // Row 3: Navigation
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.MINIGAMES)
            .setLabel('◀ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
}


/**
 * Create Crash game buttons
 * @param {number} balance
 * @param {number} betAmount
 * @param {number} targetMultiplier
 * @returns {ActionRowBuilder[]}
 */
function createCrashButtons(balance, betAmount = 100, targetMultiplier = 2) {
    // Row 1: Bet amount selection
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('crash_bet_50')
            .setLabel('💰 50')
            .setStyle(betAmount === 50 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 50),
        new ButtonBuilder()
            .setCustomId('crash_bet_100')
            .setLabel('💰 100')
            .setStyle(betAmount === 100 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 100),
        new ButtonBuilder()
            .setCustomId('crash_bet_500')
            .setLabel('💰 500')
            .setStyle(betAmount === 500 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 500),
        new ButtonBuilder()
            .setCustomId('crash_bet_1000')
            .setLabel('💰 1000')
            .setStyle(betAmount === 1000 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 1000),
        new ButtonBuilder()
            .setCustomId('crash_bet_custom')
            .setLabel('✍️ Nhập số')
            .setStyle(ButtonStyle.Primary)
    );

    // Row 2: Target multiplier selection - With Vietnamese safety labels for beginners
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('crash_target_1_5')
            .setLabel('🟢 x1.5 An toàn')
            .setStyle(targetMultiplier === 1.5 ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('crash_target_2')
            .setLabel('🟡 x2 Trung bình')
            .setStyle(targetMultiplier === 2 ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('crash_target_3')
            .setLabel('🟠 x3 Rủi ro')
            .setStyle(targetMultiplier === 3 ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('crash_target_5')
            .setLabel('🔴 x5 Cao')
            .setStyle(targetMultiplier === 5 ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('crash_target_10')
            .setLabel('💀 x10 Cực cao')
            .setStyle(targetMultiplier === 10 ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    // Row 3: Play button with clear Vietnamese label
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('crash_play')
            .setLabel('🚀 CHƠI NGAY!')
            .setStyle(ButtonStyle.Success)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
}

/**
 * Create Crash result buttons (play again)
 * @param {number} balance - Current balance
 * @param {number} betAmount - Last bet amount for quick replay
 * @returns {ActionRowBuilder[]}
 */
function createCrashResultButtons(balance = 0, betAmount = 100) {
    const canPlayAgain = balance >= betAmount;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('crash_play_again')
            .setLabel('🔄 Chơi tiếp')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canPlayAgain),
        new ButtonBuilder()
            .setCustomId('crash_change_bet')
            .setLabel('💰 Đổi mức cược')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row];
}

/**
 * Create Wheel buttons
 * @param {number} balance
 * @param {number} betAmount
 * @returns {ActionRowBuilder[]}
 */
function createWheelButtons(balance, betAmount = 100) {
    // Row 1: Bet amount selection
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wheel_bet_50')
            .setLabel('💰 50')
            .setStyle(betAmount === 50 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 50),
        new ButtonBuilder()
            .setCustomId('wheel_bet_100')
            .setLabel('💰 100')
            .setStyle(betAmount === 100 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 100),
        new ButtonBuilder()
            .setCustomId('wheel_bet_500')
            .setLabel('💰 500')
            .setStyle(betAmount === 500 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 500),
        new ButtonBuilder()
            .setCustomId('wheel_bet_1000')
            .setLabel('💰 1000')
            .setStyle(betAmount === 1000 ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(balance < 1000),
        new ButtonBuilder()
            .setCustomId('wheel_bet_custom')
            .setLabel('✍️ Nhập số')
            .setStyle(ButtonStyle.Primary)
    );

    // Row 2: Spin button
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wheel_spin')
            .setLabel('🎡 QUAY!')
            .setStyle(ButtonStyle.Success)
            .setDisabled(balance < betAmount),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2];
}

/**
 * Create Wheel result buttons (play again with same bet or change bet)
 * @param {number} balance - Current balance to check if can afford to spin again
 * @param {number} betAmount - Current bet amount for spin again
 * @returns {ActionRowBuilder[]}
 */
function createWheelResultButtons(balance = 0, betAmount = 100) {
    const canSpinAgain = balance >= betAmount;

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('wheel_spin_again')
            .setLabel('🔄 Quay tiếp')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canSpinAgain),
        new ButtonBuilder()
            .setCustomId('wheel_change_bet')
            .setLabel('💰 Đổi số tiền')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('◀ Quay lại Casino')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row];
}

module.exports = {
    createBlackjackBetButtons,
    createBlackjackGameButtons,
    createBlackjackInsuranceButtons,
    createBlackjackEndButtons,
    createSlotsButtons,
    createRouletteBetButtons,
    createCoinFlipButtons,
    createRPSButtons,
    createCrashButtons,
    createCrashResultButtons,
    createWheelButtons,
    createWheelResultButtons
};
