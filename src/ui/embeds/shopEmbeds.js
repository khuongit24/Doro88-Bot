const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');

/**
 * Create shop main menu embed
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createShopMenuEmbed(balance) {
    return new EmbedBuilder()
        .setTitle('🏪 Cửa hàng Doro88')
        .setDescription(
            '**🏛️ Chào mừng đến Cửa hàng!**\n' +
            'Nơi mua bán và giao dịch vật phẩm.\n\n' +
            '**📖 HƯỚNG DẪN:**\n' +
            '• **Mua đồ**: Dùng DCoin mua vật phẩm từ shop\n' +
            '• **Bán đồ**: Bán vật phẩm trong kho lấy DCoin\n' +
            '• **Giao dịch**: Trade trực tiếp với người chơi khác\n\n' +
            '💡 **Mẹo:** Vật phẩm từ Gacha có thể bán để lấy DCoin!'
        )
        .setColor(config.colors.primary)
        .addFields(
            { name: '🛒 Mua đồ', value: 'Xem & mua vật phẩm\ngiá cố định từ shop', inline: true },
            { name: '💰 Bán đồ', value: 'Bán vật phẩm trong kho*', inline: true },
            { name: '🔄 Giao dịch', value: 'Trade với người khác', inline: true }
        )
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Shop` })
        .setTimestamp();
}

/**
 * Create shop buy embed
 * @param {Array} items
 * @param {number} balance
 * @param {Object} pagination
 * @returns {EmbedBuilder}
 */
function createShopBuyEmbed(items, balance, pagination) {
    const currentPage = pagination.currentPage || pagination.page || 1;
    const totalPages = pagination.totalPages || 1;

    const embed = new EmbedBuilder()
        .setTitle('🛒 Mua vật phẩm')
        .setColor(config.colors.primary)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin | Trang ${currentPage}/${totalPages}` });

    if (items.length === 0) {
        embed.setDescription('Cửa hàng đang hết hàng!');
    } else {
        const desc = items.map((item, i) => {
            const emoji = getRarityEmoji(item.rarity);
            return `${i + 1}. ${emoji} **${item.name}** - ${formatNumber(item.shopPrice)} 💰`;
        }).join('\n');
        embed.setDescription(desc);
    }

    return embed;
}

/**
 * Create shop sell embed (user's inventory)
 * @param {Array} items
 * @param {number} balance
 * @param {Object} pagination
 * @returns {EmbedBuilder}
 */
function createShopSellEmbed(items, balance, pagination) {
    const currentPage = pagination.currentPage || pagination.page || 1;
    const totalPages = pagination.totalPages || 1;

    const embed = new EmbedBuilder()
        .setTitle('💰 Bán vật phẩm')
        .setDescription('Chọn vật phẩm để bán\n*(Giá bán = 100% giá trị cơ bản)*')
        .setColor(config.colors.warning)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin | Trang ${currentPage}/${totalPages}` });

    if (items.length === 0) {
        embed.setDescription('Bạn không có vật phẩm nào để bán!');
    } else {
        const desc = items.map((item, i) => {
            const emoji = getRarityEmoji(item.rarity);
            // CÂN BẰNG KINH TẾ v3.0: Giá bán = 100% base_value
            const sellPrice = Math.floor(item.base_value);
            const totalPrice = sellPrice * item.quantity;
            return `${i + 1}. ${emoji} **${item.name}** x${item.quantity}\n   └ ${formatNumber(sellPrice)} 💰/cái (Tổng: ${formatNumber(totalPrice)} 💰)`;
        }).join('\n');
        embed.setDescription(embed.data.description + '\n\n' + desc);
    }

    return embed;
}

/**
 * Create trade menu embed
 * @param {Array} pendingTrades
 * @returns {EmbedBuilder}
 */
function createTradeMenuEmbed(pendingTrades = [], balance = 0) {
    const embed = new EmbedBuilder()
        .setTitle('🔄 Trung tâm Giao dịch')
        .setColor(config.colors.info);

    let description = `💰 **Số dư hiện tại:** ${formatNumber(balance)} DCoin\n\n`;
    description += `**🎁 Tặng vật phẩm**\nChuyển item từ kho cho người chơi khác\n\n`;
    description += `**💸 Chuyển DCoin**\nGửi tiền cho bạn bè\n\n`;

    if (pendingTrades.length > 0) {
        description += `\n**📨 Giao dịch đang chờ (${pendingTrades.length}):**\n`;
        pendingTrades.forEach((trade, i) => {
            const timeLeft = Math.ceil((trade.expiresAt - Date.now()) / 60000);
            const direction = trade.fromDiscordId ? '📤 Gửi' : '📥 Nhận';
            description += `${i + 1}. ${direction} **${trade.itemName}** x${trade.quantity}\n   💰 ${formatNumber(trade.price)} DCoin | ⏰ ${timeLeft} phút\n`;
        });
    }

    embed.setDescription(description);
    embed.setFooter({ text: 'Chọn một hành động bên dưới' });

    return embed;
}

/**
 * Create trade offer embed
 * @param {Object} trade
 * @param {string} sellerName
 * @returns {EmbedBuilder}
 */
function createTradeOfferEmbed(trade, sellerName) {
    return new EmbedBuilder()
        .setTitle('📨 Đề nghị giao dịch')
        .setDescription(`**${sellerName}** muốn bán cho bạn:`)
        .setColor(config.colors.warning)
        .addFields(
            { name: '📦 Vật phẩm', value: `${trade.itemName} x${trade.quantity}`, inline: true },
            { name: '💰 Giá', value: `${formatNumber(trade.price)} DCoin`, inline: true }
        )
        .setFooter({ text: `ID: ${trade.id} | Hết hạn sau 15 phút` });
}

/**
 * Create transaction result embed
 * @param {boolean} success
 * @param {string} message
 * @param {Object} details
 * @returns {EmbedBuilder}
 */
function createTransactionResultEmbed(success, message, details = {}) {
    const embed = new EmbedBuilder()
        .setTitle(success ? '✅ Giao dịch thành công!' : '❌ Giao dịch thất bại')
        .setDescription(message)
        .setColor(success ? config.colors.success : config.colors.error);

    if (details.item) {
        embed.addFields(
            { name: '📦 Vật phẩm', value: `${details.item.name} x${details.quantity || 1}`, inline: true }
        );
    }

    if (details.price !== undefined) {
        embed.addFields(
            { name: success ? '💰 Nhận được' : '💸 Đã trả', value: `${formatNumber(details.price)} DCoin`, inline: true }
        );
    }

    if (details.newBalance !== undefined) {
        embed.addFields(
            { name: '💵 Số dư mới', value: formatNumber(details.newBalance), inline: true }
        );
    }

    return embed;
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
 * Create Sell All confirmation embed with warning about rare tools
 * @param {Array} items - Items that will be sold
 * @param {number} totalPrice - Total DCoin value
 * @param {Array} rareTools - List of rare tools that will be sold
 * @returns {EmbedBuilder}
 */
function createSellAllConfirmationEmbed(items, totalPrice, rareTools = []) {
    const embed = new EmbedBuilder()
        .setTitle('⚠️ Xác nhận bán tất cả')
        .setColor(config.colors.warning);

    let description = `Bạn sắp bán **${items.length} loại vật phẩm**.\n\n`;
    description += `💰 **Tổng giá trị:** ${formatNumber(totalPrice)} DCoin\n\n`;

    if (rareTools.length > 0) {
        description += `🚨 **CẢNH BÁO!** Bạn đang bán các công cụ quý hiếm:\n`;
        rareTools.forEach(tool => {
            description += `• ${getRarityEmoji(tool.rarity)} **${tool.name}** x${tool.quantity}\n`;
        });
        description += `\n⚠️ *Những công cụ này rất khó kiếm lại!*`;
    }

    embed.setDescription(description);
    embed.setFooter({ text: 'Nhấn "Xác nhận" để bán hoặc "Hủy" để quay lại' });

    return embed;
}

module.exports = {
    createShopMenuEmbed,
    createShopBuyEmbed,
    createShopSellEmbed,
    createTradeMenuEmbed,
    createTradeOfferEmbed,
    createTransactionResultEmbed,
    createSellAllConfirmationEmbed
};
