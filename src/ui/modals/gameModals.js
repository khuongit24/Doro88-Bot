const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

/**
 * Create feedback modal
 * @returns {ModalBuilder}
 */
function createFeedbackModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_feedback')
        .setTitle('💡 Góp ý cho Doro88 Bot');

    const titleInput = new TextInputBuilder()
        .setCustomId('feedback_title')
        .setLabel('Tiêu đề')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: Đề xuất tính năng mới')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(100);

    const contentInput = new TextInputBuilder()
        .setCustomId('feedback_content')
        .setLabel('Nội dung góp ý')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Mô tả chi tiết góp ý của bạn...')
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(1000);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(contentInput);

    modal.addComponents(row1, row2);

    return modal;
}

/**
 * Create bug report modal
 * @returns {ModalBuilder}
 */
function createBugReportModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_bug_report')
        .setTitle('🐛 Báo lỗi Doro88 Bot');

    const titleInput = new TextInputBuilder()
        .setCustomId('bug_title')
        .setLabel('Tiêu đề lỗi')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: Không thể quay gacha')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(100);

    const stepsInput = new TextInputBuilder()
        .setCustomId('bug_steps')
        .setLabel('Các bước tái hiện lỗi')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('1. Nhấn vào nút Gacha\n2. Chọn Pull x1\n3. Lỗi xảy ra...')
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(1000);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(stepsInput);

    modal.addComponents(row1, row2);

    return modal;
}

/**
 * Create custom bet modal
 * @param {string} gameType
 * @returns {ModalBuilder}
 */
function createBetModal(gameType) {
    const modal = new ModalBuilder()
        .setCustomId(`modal_bet_${gameType}`)
        .setTitle(`💰 Đặt cược - ${gameType.toUpperCase()}`);

    const betInput = new TextInputBuilder()
        .setCustomId('bet_amount')
        .setLabel('Số DCoin muốn cược')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 500')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    const row = new ActionRowBuilder().addComponents(betInput);
    modal.addComponents(row);

    return modal;
}

/**
 * Create dice guess modal
 * @returns {ModalBuilder}
 */
function createDiceGuessModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_dice_guess')
        .setTitle('🎲 Đoán tổng xúc xắc');

    const guessInput = new TextInputBuilder()
        .setCustomId('dice_guess')
        .setLabel('Đoán tổng (2-12)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 7')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

    const betInput = new TextInputBuilder()
        .setCustomId('dice_bet')
        .setLabel('Số DCoin cược')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 100')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    const row1 = new ActionRowBuilder().addComponents(guessInput);
    const row2 = new ActionRowBuilder().addComponents(betInput);

    modal.addComponents(row1, row2);

    return modal;
}

/**
 * Create roulette number bet modal
 * @returns {ModalBuilder}
 */
function createRouletteNumberModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_roulette_number')
        .setTitle('🎡 Đặt cược số Roulette');

    const numberInput = new TextInputBuilder()
        .setCustomId('roulette_number')
        .setLabel('Chọn số (0-36)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 17')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(2);

    const betInput = new TextInputBuilder()
        .setCustomId('roulette_bet')
        .setLabel('Số DCoin cược')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 100')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

    const row1 = new ActionRowBuilder().addComponents(numberInput);
    const row2 = new ActionRowBuilder().addComponents(betInput);

    modal.addComponents(row1, row2);

    return modal;
}

/**
 * Create mail compose modal
 * @returns {ModalBuilder}
 */
function createMailComposeModal() {
    const modal = new ModalBuilder()
        .setCustomId('modal_mail_compose')
        .setTitle('✉️ Gửi thư');

    const recipientInput = new TextInputBuilder()
        .setCustomId('mail_recipient')
        .setLabel('Người nhận (Discord ID hoặc Username)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 123456789012345678 hoặc tên_người_dùng')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(50);

    const subjectInput = new TextInputBuilder()
        .setCustomId('mail_subject')
        .setLabel('Tiêu đề thư')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: Chào bạn!')
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100);

    const contentInput = new TextInputBuilder()
        .setCustomId('mail_content')
        .setLabel('Nội dung thư')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Nhập nội dung thư...')
        .setRequired(false)
        .setMaxLength(500);

    const dcoinInput = new TextInputBuilder()
        .setCustomId('mail_dcoin')
        .setLabel('Số DCoin gửi kèm (để trống = 0)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('VD: 100')
        .setRequired(false)
        .setMaxLength(10);

    const row1 = new ActionRowBuilder().addComponents(recipientInput);
    const row2 = new ActionRowBuilder().addComponents(subjectInput);
    const row3 = new ActionRowBuilder().addComponents(contentInput);
    const row4 = new ActionRowBuilder().addComponents(dcoinInput);

    modal.addComponents(row1, row2, row3, row4);

    return modal;
}

/**
 * Create Lucky Number guess modal
 * @param {number} min - Minimum number in range
 * @param {number} max - Maximum number in range
 * @returns {ModalBuilder}
 */
function createLuckyNumberGuessModal(min = 1, max = 100) {
    const modal = new ModalBuilder()
        .setCustomId('modal_lucky_number_guess')
        .setTitle('🎯 Đoán số may mắn');

    const guessInput = new TextInputBuilder()
        .setCustomId('lucky_guess')
        .setLabel(`Nhập số (${min} - ${max})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`VD: ${Math.floor((min + max) / 2)}`)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3);

    const row = new ActionRowBuilder().addComponents(guessInput);
    modal.addComponents(row);

    return modal;
}

module.exports = {
    createFeedbackModal,
    createBugReportModal,
    createBetModal,
    createDiceGuessModal,
    createRouletteNumberModal,
    createMailComposeModal,
    createLuckyNumberGuessModal
};
