const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { NAV_BUTTONS, GACHA_BUTTONS, CASINO_BUTTONS, INVENTORY_BUTTONS, MAILBOX_BUTTONS, HELP_BUTTONS } = require('../../utils/constants');

/**
 * Create main navigation buttons (Home page)
 * @param {Object} options - Options for button states
 * @param {boolean} options.hasCheckedInToday - Whether user has already checked in today
 * @param {string} options.timeUntilReset - Time remaining until daily reset (e.g., "13h 22m")
 * @param {number} options.unreadMailCount - Number of unread mails
 * @returns {ActionRowBuilder[]}
 */
function createMainNavButtons(options = {}) {
    // Ensure hasCheckedInToday is always a boolean primitive (fixes "Expected a boolean primitive" error)
    const hasCheckedInToday = options.hasCheckedInToday === true;
    const timeUntilReset = options.timeUntilReset || '';
    const unreadMailCount = options.unreadMailCount || 0;
    
    // Build daily checkin button with appropriate state
    const dailyButton = new ButtonBuilder()
        .setCustomId(NAV_BUTTONS.DAILY_CHECKIN)
        .setStyle(hasCheckedInToday ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(hasCheckedInToday);
    
    // Set label based on checkin status
    if (hasCheckedInToday) {
        dailyButton.setLabel(`✅ Đã điểm danh`);
    } else {
        dailyButton.setLabel('📅 Điểm danh');
    }

    // Build mailbox button with unread count
    const mailboxLabel = unreadMailCount > 0 ? `📬 Thư (${unreadMailCount})` : '📬 Hòm thư';
    const mailboxStyle = unreadMailCount > 0 ? ButtonStyle.Danger : ButtonStyle.Primary;
    
    const row1 = new ActionRowBuilder().addComponents(
        dailyButton,
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.GACHA)
            .setLabel('🎁 Quay Gacha')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.CASINO)
            .setLabel('🎰 Casino')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.MINIGAMES)
            .setLabel('🎮 Mini Games')
            .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('nav_shop')
            .setLabel('🏪 Cửa hàng')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.INVENTORY)
            .setLabel('📦 Kho đồ')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.MAILBOX)
            .setLabel(mailboxLabel)
            .setStyle(mailboxStyle),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.PROFILE)
            .setLabel('👤 Hồ sơ')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.LEADERBOARD)
            .setLabel('🏆 Xếp hạng')
            .setStyle(ButtonStyle.Secondary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.HELP)
            .setLabel('❓ Trợ giúp')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
}

/**
 * Create back button
 * @param {string} destination - Button ID to go back to (default: home)
 * @returns {ButtonBuilder}
 */
function createBackButton(destination = NAV_BUTTONS.HOME) {
    return new ButtonBuilder()
        .setCustomId(destination)
        .setLabel('◀ Quay lại')
        .setStyle(ButtonStyle.Secondary);
}

/**
 * Create gacha buttons
 * @param {boolean} canPull - Has enough balance
 * @param {boolean} canPull10 - Has enough for 10 pulls
 * @returns {ActionRowBuilder[]}
 */
function createGachaButtons(canPull = true, canPull10 = true, cost1 = 100, cost10 = 1000) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(GACHA_BUTTONS.PULL_1)
            .setLabel(`🎰 Quay x1 (${cost1} DCoin)`) 
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!canPull),
        new ButtonBuilder()
            .setCustomId(GACHA_BUTTONS.PULL_10)
            .setLabel(`✨ Quay x10 (${cost10} DCoin)`) 
            .setStyle(ButtonStyle.Success)
            .setDisabled(!canPull10)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.GACHA)
            .setLabel('🔁 Đổi banner')
            .setStyle(ButtonStyle.Secondary),
        createBackButton(NAV_BUTTONS.HOME)
    );

    return [row1, row2];
}

/**
 * Create casino menu buttons
 * @returns {ActionRowBuilder[]}
 */
function createCasinoMenuButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.BLACKJACK)
            .setLabel('🃏 Xì dách')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.ROULETTE)
            .setLabel('🎲 Quay Số Roulette')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.SLOTS)
            .setLabel('🎰 Máy đánh bạc')
            .setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.CRASH)
            .setLabel('📈 Đoán Điểm Nổ')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.WHEEL)
            .setLabel('🎡 Vòng Quay May Mắn')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(CASINO_BUTTONS.TAIXIU)
            .setLabel('🎲 Tài Xỉu')
            .setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder().addComponents(
        createBackButton(NAV_BUTTONS.HOME)
    );

    return [row1, row2, row3];
}

/**
 * Create inventory buttons with pagination
 * @param {boolean} hasPrev
 * @param {boolean} hasNext
 * @returns {ActionRowBuilder[]}
 */
function createInventoryButtons(hasPrev = false, hasNext = false) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(INVENTORY_BUTTONS.PREV)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasPrev),
        new ButtonBuilder()
            .setCustomId(INVENTORY_BUTTONS.NEXT)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasNext),
        createBackButton(NAV_BUTTONS.HOME)
    );

    return [row1];
}

/**
 * Create mailbox buttons with pagination
 * @param {boolean} hasPrev
 * @param {boolean} hasNext
 * @param {boolean} hasUnclaimed
 * @returns {ActionRowBuilder[]}
 */
function createMailboxButtons(hasPrev = false, hasNext = false, hasUnclaimed = false) {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MAILBOX_BUTTONS.PREV)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasPrev),
        new ButtonBuilder()
            .setCustomId(MAILBOX_BUTTONS.NEXT)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasNext),
        new ButtonBuilder()
            .setCustomId(MAILBOX_BUTTONS.CLAIM_ALL)
            .setLabel('📥 Nhận tất cả')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!hasUnclaimed),
        createBackButton(NAV_BUTTONS.HOME)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(MAILBOX_BUTTONS.SEND)
            .setLabel('✉️ Gửi thư')
            .setStyle(ButtonStyle.Primary)
    );

    return [row1, row2];
}

/**
 * Create help/feedback buttons
 * @returns {ActionRowBuilder[]}
 */
function createHelpButtons() {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(HELP_BUTTONS.FEEDBACK)
            .setLabel('💡 Góp ý')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(HELP_BUTTONS.BUG_REPORT)
            .setLabel('🐛 Báo lỗi')
            .setStyle(ButtonStyle.Danger),
        createBackButton(NAV_BUTTONS.HOME)
    );

    return [row];
}

/**
 * Create daily checkin result buttons (with disabled checkin)
 * @returns {ActionRowBuilder[]}
 */
function createDailyCheckinResultButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.DAILY_CHECKIN)
            .setLabel('✅ Đã điểm danh')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(NAV_BUTTONS.HOME)
            .setLabel('🏠 Trang chủ')
            .setStyle(ButtonStyle.Secondary)
    );

    return [row1];
}

/**
 * Create simple back button row
 * @param {string} destination
 * @returns {ActionRowBuilder[]}
 */
function createBackButtonRow(destination = NAV_BUTTONS.HOME) {
    return [new ActionRowBuilder().addComponents(createBackButton(destination))];
}

module.exports = {
    createMainNavButtons,
    createBackButton,
    createGachaButtons,
    createCasinoMenuButtons,
    createInventoryButtons,
    createMailboxButtons,
    createHelpButtons,
    createDailyCheckinResultButtons,
    createBackButtonRow
};
