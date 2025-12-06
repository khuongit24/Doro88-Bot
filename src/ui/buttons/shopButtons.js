const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

/**
 * Create shop menu buttons
 * @returns {Array<ActionRowBuilder>}
 */
function createShopMenuButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy')
                .setLabel('🛒 Mua đồ')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shop_sell')
                .setLabel('💰 Bán đồ')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('shop_trade')
                .setLabel('🔄 Giao dịch')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create shop buy pagination buttons
 * @param {boolean} hasPrev
 * @param {boolean} hasNext
 * @returns {Array<ActionRowBuilder>}
 */
function createShopBuyButtons(hasPrev, hasNext) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy_prev')
                .setLabel('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasPrev),
            new ButtonBuilder()
                .setCustomId('shop_buy_next')
                .setLabel('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasNext)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create shop buy item select menu
 * @param {Array} items
 * @returns {ActionRowBuilder}
 */
function createShopBuySelect(items) {
    if (items.length === 0) {
        return null;
    }

    const options = items.slice(0, 25).map(item => ({
        label: item.name,
        description: `${item.shopPrice} DCoin`,
        value: `buy_${item.id}`,
        emoji: getRarityEmoji(item.rarity)
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_buy_select')
        .setPlaceholder('Chọn vật phẩm để mua...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
}

/**
 * Create shop sell item select menu
 * @param {Array} items
 * @returns {ActionRowBuilder|null}
 */
function createShopSellSelect(items) {
    if (items.length === 0) {
        return null;
    }

    const options = items.slice(0, 25).map(item => {
        // Giá bán = 100% base_value (khớp với shopManager.sellToShop)
        const sellPrice = item.base_value;
        return {
            label: `${item.name} (x${item.quantity})`,
            description: `Bán: ${sellPrice} DCoin/cái`,
            value: `sell_${item.id}`,
            emoji: getRarityEmoji(item.rarity)
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('shop_sell_select')
        .setPlaceholder('Chọn vật phẩm để bán...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
}

/**
 * Create sell quantity buttons
 * @param {number} itemId
 * @param {number} maxQuantity
 * @returns {Array<ActionRowBuilder>}
 */
function createSellQuantityButtons(itemId, maxQuantity) {
    const quantities = [1, 5, 10, maxQuantity].filter(q => q <= maxQuantity);
    const uniqueQuantities = [...new Set(quantities)];

    const row = new ActionRowBuilder();

    uniqueQuantities.forEach(qty => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`sell_confirm_${itemId}_${qty}`)
                .setLabel(qty === maxQuantity ? `Tất cả (${qty})` : `x${qty}`)
                .setStyle(qty === maxQuantity ? ButtonStyle.Danger : ButtonStyle.Primary)
        );
    });

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

/**
 * Create trade action buttons
 * @param {string} tradeId
 * @returns {Array<ActionRowBuilder>}
 */
function createTradeActionButtons(tradeId) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`trade_accept_${tradeId}`)
                .setLabel('✅ Chấp nhận')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`trade_decline_${tradeId}`)
                .setLabel('❌ Từ chối')
                .setStyle(ButtonStyle.Danger)
        );

    return [row];
}

/**
 * Create shop sell pagination buttons
 * @param {boolean} hasPrev
 * @param {boolean} hasNext
 * @returns {ActionRowBuilder}
 */
function createShopSellPaginationButtons(hasPrev, hasNext) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell_prev')
                .setLabel('◀️ Trang trước')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasPrev),
            new ButtonBuilder()
                .setCustomId('shop_sell_next')
                .setLabel('Trang sau ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!hasNext)
        );

    return row;
}

/**
 * Create shop sell action buttons (sell all + back)
 * @returns {ActionRowBuilder}
 */
function createShopSellActionButtons() {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell_all')
                .setLabel('🧹 Bán tất cả')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return row;
}

// Helper
function getRarityEmoji(rarity) {
    const emojis = {
        'COMMON': '⚪',
        'UNCOMMON': '🟢',
        'RARE': '🔵',
        'EPIC': '🟣',
        'LEGENDARY': '🟡'
    };
    return emojis[rarity] || '📦';
}

/**
 * Create Sell All confirmation buttons
 * @param {boolean} hasRareTools - Whether rare tools will be sold
 * @returns {ActionRowBuilder}
 */
function createSellAllConfirmationButtons(hasRareTools = false) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell_all_confirm')
                .setLabel(hasRareTools ? '⚠️ Xác nhận bán' : '✅ Xác nhận bán')
                .setStyle(hasRareTools ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shop_sell')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    return row;
}

/**
 * Create trade menu buttons (gift item, send dcoin)
 * @param {boolean} hasItems - Whether user has items to trade
 * @param {number} balance - User's DCoin balance
 * @returns {Array<ActionRowBuilder>}
 */
function createTradeMenuButtons(hasItems = false, balance = 0) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('trade_gift_item')
                .setLabel('🎁 Tặng vật phẩm')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(!hasItems),
            new ButtonBuilder()
                .setCustomId('trade_send_dcoin')
                .setLabel('💸 Chuyển DCoin')
                .setStyle(ButtonStyle.Success)
                .setDisabled(balance <= 0)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row, row2];
}

module.exports = {
    createShopMenuButtons,
    createShopBuyButtons,
    createShopBuySelect,
    createShopSellSelect,
    createShopSellPaginationButtons,
    createShopSellActionButtons,
    createSellAllConfirmationButtons,
    createSellQuantityButtons,
    createTradeActionButtons,
    createTradeMenuButtons
};
