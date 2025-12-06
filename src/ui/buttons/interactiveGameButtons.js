const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { MINIGAME_BUTTONS } = require('../../utils/constants');

/**
 * ========================================
 * FISHING V2 - Interactive Buttons
 * ========================================
 */

/**
 * Location selection buttons
 */
function createFishingLocationButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_location_shore')
                .setLabel('🏖️ Bờ biển')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('fishing_location_deep_sea')
                .setLabel('🌊 Biển sâu')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('fishing_location_ocean_abyss')
                .setLabel('🦑 Đại dương sâu')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_change_tool')
                .setLabel('🔧 Đổi cần câu')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('fishing_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}


/**
 * Waiting phase - animated waiting button
 */
function createFishingWaitingButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_hook')
                .setLabel('🎣 GIỮ CẦN CÂU...')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_cancel')
                .setLabel('❌ Thu cần (hủy)')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Hook phase - quick timing button
 */
function createFishingHookButtons(timeRemaining) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_hook')
                .setLabel(`🐟 CÁ CẮN CÂU! NHẤN NGAY! (${timeRemaining}s)`)
                .setStyle(ButtonStyle.Danger)
        );

    return [row];
}

/**
 * Reel phase buttons
 */
function createFishingReelButtons(currentAction, progress, total) {
    const actionLabels = {
        '🎣': '🎣 KÉO!',
        '⬆️': '⬆️ LÊN!',
        '⬇️': '⬇️ XUỐNG!'
    };

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_reel_rod')
                .setLabel(actionLabels['🎣'] || '🎣 KÉO!')
                .setStyle(currentAction === '🎣' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('fishing_reel_up')
                .setLabel(actionLabels['⬆️'] || '⬆️ LÊN!')
                .setStyle(currentAction === '⬆️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('fishing_reel_down')
                .setLabel(actionLabels['⬇️'] || '⬇️ XUỐNG!')
                .setStyle(currentAction === '⬇️' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fishing_progress')
                .setLabel(`📊 Tiến độ: ${progress}/${total}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    return [row, row2];
}

/**
 * Fishing result buttons
 */
function createFishingResultButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_fishing_v2')
                .setLabel('🎣 Câu tiếp')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('goto_shop_sell')
                .setLabel('💰 Bán cá')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row];
}

/**
 * ========================================
 * MINING V2 - Interactive Buttons
 * ========================================
 */

/**
 * Location selection buttons
 */
function createMiningLocationButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_location_cave')
                .setLabel('🕳️ Hang động')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('mining_location_deep_mine')
                .setLabel('⛏️ Mỏ sâu')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('mining_location_volcano')
                .setLabel('🌋 Núi lửa')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_change_tool')
                .setLabel('🔧 Đổi cuốc')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('mining_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}


/**
 * Digging phase buttons - combo system
 */
function createMiningDigButtons(nextPattern, combo, currentDig, maxDigs) {
    const patternLabels = {
        '⬆️': '⬆️ ĐÀO LÊN!',
        '⬇️': '⬇️ ĐÀO XUỐNG!',
        '⬅️': '⬅️ ĐÀO TRÁI!',
        '➡️': '➡️ ĐÀO PHẢI!',
        '⛏️': '⛏️ ĐẬP!'
    };

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_dig_up')
                .setLabel('⬆️')
                .setStyle(nextPattern === '⬆️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_dig_down')
                .setLabel('⬇️')
                .setStyle(nextPattern === '⬇️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_dig_left')
                .setLabel('⬅️')
                .setStyle(nextPattern === '⬅️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_dig_right')
                .setLabel('➡️')
                .setStyle(nextPattern === '➡️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_dig_strike')
                .setLabel('⛏️')
                .setStyle(nextPattern === '⛏️' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_info')
                .setLabel(`🔥 Combo: x${combo} | Đào: ${currentDig}/${maxDigs}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    return [row, row2];
}

/**
 * Extract phase buttons
 */
function createMiningExtractButtons(currentAction, progress, total) {
    const actionLabels = {
        '⛏️': '⛏️ ĐẬP!',
        '💪': '💪 KÉOO!',
        '🔥': '🔥 ĐỐT!'
    };

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_extract_strike')
                .setLabel(actionLabels['⛏️'] || '⛏️ ĐẬP!')
                .setStyle(currentAction === '⛏️' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_extract_pull')
                .setLabel(actionLabels['💪'] || '💪 KÉO!')
                .setStyle(currentAction === '💪' ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('mining_extract_fire')
                .setLabel(actionLabels['🔥'] || '🔥 ĐỐT!')
                .setStyle(currentAction === '🔥' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('mining_progress')
                .setLabel(`📊 Khai thác: ${progress}/${total}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    return [row, row2];
}

/**
 * Mining result buttons
 */
function createMiningResultButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_mining_v2')
                .setLabel('⛏️ Đào tiếp')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('goto_shop_sell')
                .setLabel('💰 Bán quặng')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('📋 Menu Games')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row];
}

/**
 * ========================================
 * HIGHER/LOWER V2 - Enhanced Buttons
 * ========================================
 */

/**
 * Enhanced Higher/Lower buttons with streak info
 */
function createHigherLowerButtonsV2(canCashOut = false, streak = 0, reward = 0) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hl_higher')
                .setLabel('📈 CAO HƠN')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('hl_lower')
                .setLabel('📉 THẤP HƠN')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder();

    if (canCashOut) {
        row2.addComponents(
            new ButtonBuilder()
                .setCustomId('hl_cashout')
                .setLabel(`💰 Rút ${reward.toLocaleString()} (x${streak})`)
                .setStyle(ButtonStyle.Primary)
        );
    }

    row2.addComponents(
        new ButtonBuilder()
            .setCustomId('hl_double_or_nothing')
            .setLabel('🎰 Double or Nothing')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!canCashOut || streak < 3),
        new ButtonBuilder()
            .setCustomId('hl_cancel')
            .setLabel('❌ Bỏ cuộc')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row, row2];
}

/**
 * ========================================
 * RPS V2 - Best of 3/5 Mode
 * ========================================
 */

/**
 * RPS mode selection buttons - FIXED multipliers to match payout
 */
function createRPSModeButtons(balance) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_mode_single')
                .setLabel('🎯 Ván đơn (x2)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('rps_mode_bo3')
                .setLabel('🏆 Best of 3 (x3)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rps_mode_bo5')
                .setLabel('👑 Best of 5 (x5)')
                .setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_custom_bet')
                .setLabel('✏️ Tự điền số tiền')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_minigames')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * RPS game buttons with match score
 */
function createRPSGameButtons(playerScore, botScore, round, maxRounds) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_v2_rock')
                .setLabel('🪨 Đá')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rps_v2_paper')
                .setLabel('📄 Bao')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rps_v2_scissors')
                .setLabel('✂️ Kéo')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rps_score')
                .setLabel(`📊 Bạn ${playerScore} - ${botScore} Bot | Ván ${round}/${maxRounds}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

    return [row, row2];
}

/**
 * ========================================
 * QUICK MATH V2 - Power-ups & Difficulty
 * ========================================
 */

/**
 * Quick Math difficulty selection
 */
function createQuickMathDifficultyButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('qm_difficulty_easy')
                .setLabel('🟢 Dễ (+−)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('qm_difficulty_medium')
                .setLabel('🟡 Trung bình (+−×)')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('qm_difficulty_hard')
                .setLabel('🔴 Khó (+−×÷)')
                .setStyle(ButtonStyle.Danger)
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
 * Quick Math answer buttons with power-up
 */
function createQuickMathButtonsV2(options, hasPowerUp = false) {
    const row = new ActionRowBuilder();

    options.forEach((opt, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`qm_answer_${index}`)
                .setLabel(`${opt}`)
                .setStyle(ButtonStyle.Primary)
        );
    });

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('qm_powerup_skip')
                .setLabel('⏭️ Bỏ qua')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasPowerUp),
            new ButtonBuilder()
                .setCustomId('qm_powerup_50_50')
                .setLabel('🎯 50/50')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasPowerUp || options.length <= 2),
            new ButtonBuilder()
                .setCustomId('qm_powerup_time')
                .setLabel('⏰ +5s')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasPowerUp)
        );

    return [row, row2];
}

/**
 * ========================================
 * LUCKY NUMBER V2 - Hot/Cold Indicators
 * ========================================
 */

/**
 * Lucky Number buttons with range indicator
 */
function createLuckyNumberButtonsV2(game, hotColdHint = null) {
    const lastGuess = game.guesses[game.guesses.length - 1];
    let low = 1, high = 100;

    // Narrow down range
    for (const g of game.guesses) {
        if (g < game.targetNumber && g > low) low = g + 1;
        if (g > game.targetNumber && g < high) high = g - 1;
    }

    const mid = Math.floor((low + high) / 2);
    const q1 = Math.floor((low + mid) / 2);
    const q3 = Math.floor((mid + high) / 2);

    // Hot/Cold style
    let hotColdStyle = ButtonStyle.Secondary;
    if (hotColdHint === 'hot') hotColdStyle = ButtonStyle.Danger;
    else if (hotColdHint === 'warm') hotColdStyle = ButtonStyle.Primary;
    else if (hotColdHint === 'cold') hotColdStyle = ButtonStyle.Secondary;

    const uniqueNumbers = [...new Set([low, q1, mid, q3, high])].sort((a, b) => a - b);

    const row1 = new ActionRowBuilder();
    uniqueNumbers.slice(0, 5).forEach((num) => {
        row1.addComponents(
            new ButtonBuilder()
                .setCustomId(`lucky_guess_${num}`)
                .setLabel(`${num}`)
                .setStyle(num === mid ? ButtonStyle.Success : ButtonStyle.Primary)
        );
    });

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('lucky_custom_guess')
                .setLabel('✍️ Nhập số')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('lucky_hint')
                .setLabel(hotColdHint ? `🔥 ${hotColdHint.toUpperCase()}` : '💡 Gợi ý')
                .setStyle(hotColdStyle)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('lucky_cancel')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2];
}

module.exports = {
    // Fishing V2
    createFishingLocationButtons,
    createFishingWaitingButtons,
    createFishingHookButtons,
    createFishingReelButtons,
    createFishingResultButtons,

    // Mining V2
    createMiningLocationButtons,
    createMiningDigButtons,
    createMiningExtractButtons,
    createMiningResultButtons,

    // Higher/Lower V2
    createHigherLowerButtonsV2,

    // RPS V2
    createRPSModeButtons,
    createRPSGameButtons,

    // Quick Math V2
    createQuickMathDifficultyButtons,
    createQuickMathButtonsV2,

    // Lucky Number V2
    createLuckyNumberButtonsV2
};
