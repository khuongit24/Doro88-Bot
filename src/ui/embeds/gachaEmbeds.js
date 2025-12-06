const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');
const { RARITY_COLORS, RARITY_EMOJIS } = require('../../utils/constants');

// Import gachaManager để lấy thông tin banner chi tiết
const gachaManager = require('../../games/gacha/gachaManager');

/**
 * Create gacha main embed
 * @param {Array} banners
 * @param {number} balance
 * @param {{pity4:number,pity5:number,rate5Star:number,guarantee5Star:boolean}} pity
 * @param {number} userId - Database user ID để lấy per-banner guarantee
 * @returns {EmbedBuilder}
 */
function createGachaMainEmbed(banners, balance, pity, userId = null) {
    // Calculate current rate as percentage
    const currentRate5Star = pity?.rate5Star ? (pity.rate5Star * 100).toFixed(2) : '0.60';

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎁 GACHA - Hệ thống hòm quà')
        .setDescription(
            '**🎲 Thử vận may của bạn!**\n' +
            'Quay gacha để nhận vật phẩm hiếm và giá trị.\n\n' +
            '**📖 CÁCH CHƠI:**\n' +
            '1️⃣ Chọn **banner** từ dropdown bên dưới\n' +
            '2️⃣ Nhấn **Pull x1** hoặc **Pull x10** để quay\n' +
            '3️⃣ Vật phẩm nhận được sẽ vào **Kho đồ** của bạn\n\n' +
            '**🌟 HỆ THỐNG UP:**\n' +
            '• Standard/Limited/Premium/Luxury: **50/50**\n' +
            '• Tool & Kit Banner: **75/25** (ưu đãi!)\n' +
            '• **Bảo hiểm**: Thua UP → Lần 5★ sau **đảm bảo UP**!\n\n' +
            '**💎 GIÁ TRỊ BANNER:**\n' +
            '`Standard (160)` → `Limited (200)` → `Premium (250)` → `Luxury (500)`\n' +
            '`Tool & Kit (150)` - Banner cuốc & cần câu\n\n' +
            '**📊 PITY** *(tăng tỷ lệ dần)*:\n' +
            '• **5★**: 0.6% → Soft pity từ **74** → Hard pity **90**\n' +
            '• **4★**: 5.1% → Đảm bảo mỗi **10** lần'
        )
        .addFields(
            { name: '💰 Số dư', value: `${formatNumber(balance)} DCoin`, inline: true },
            { name: '🎯 Pity', value: `4★ ${pity?.pity4 ?? 0}/10 • 5★ ${pity?.pity5 ?? 0}/90`, inline: true },
            { name: '📈 Tỷ lệ 5★ hiện tại', value: `${currentRate5Star}%`, inline: true }
        )
        .setFooter({ text: 'Doro88 Bot • Chọn banner để xem chi tiết' })
        .setTimestamp();

    // Add banner info với per-banner guarantee
    const bannerList = banners.map(banner => {
        const cost = banner.cost_per_pull;
        const upRate = banner.banner_type === 'TOOL_KIT' ? '75/25' : '50/50';

        // Check per-banner guarantee
        let guaranteeText = '';
        if (userId) {
            const guarantee = gachaManager.getBannerGuarantee(userId, banner.banner_type);
            if (guarantee.guarantee5Star) {
                guaranteeText = '\n└ 🌟 **NẮM BẮT VẬN MỆNH** - Đảm bảo UP!';
            }
        }

        return `**${banner.name}** (${upRate})\n└ ${formatNumber(cost)} DCoin/lần${guaranteeText}`;
    }).join('\n\n');

    if (bannerList) {
        embed.addFields({ name: '📋 Các banner hiện có', value: bannerList });
    }

    return embed;
}

/**
 * Create banner detail embed
 * @param {Object} banner
 * @param {Array} pool - legacy param, không dùng nữa
 * @param {number} balance
 * @param {{pity4:number,pity5:number}} pity
 * @param {number} userId - Database user ID để lấy per-banner guarantee
 * @returns {EmbedBuilder}
 */
function createBannerDetailEmbed(banner, pool, balance, pity, userId = null) {
    // Import gachaItems để lấy thông tin chính xác của banner
    const gachaItems = require('../../games/gacha/gachaitems');

    // Lấy thông tin chi tiết từ gachaManager (dùng banner.id)
    const bannerDetails = gachaManager.getBannerDetails(banner.id);

    // Lấy upRate trực tiếp từ gachaItems module
    const actualUpRate = gachaItems.getUpRate(banner.banner_type);
    const upRatePercent = Math.round(actualUpRate * 100);
    const upRateDisplay = `${upRatePercent}/${100 - upRatePercent}`;

    // Lấy per-banner guarantee nếu có userId
    let guarantee5Star = false;
    let guarantee4Star = false;
    if (userId) {
        const guarantee = gachaManager.getBannerGuarantee(userId, banner.banner_type);
        guarantee5Star = guarantee.guarantee5Star;
        guarantee4Star = guarantee.guarantee4Star;
    }

    // Build description với thông báo NẮM BẮT VẬN MỆNH
    let description = (banner.description || 'Quay gacha để nhận vật phẩm!') + '\n\n';
    description += `**🎯 Cơ chế UP:** ${upRateDisplay}\n`;

    if (guarantee5Star) {
        description += '🌟 **NẮM BẮT VẬN MỆNH!** - Lần 5★ tiếp theo **ĐẢM BẢO** là vật phẩm UP!\n';
    }
    if (guarantee4Star) {
        description += '💜 **Đang bảo hiểm 4★** - Lần 4★ tiếp theo đảm bảo UP!\n';
    }

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎁 ${banner.name}`)
        .setDescription(description)
        .addFields(
            { name: '💰 Số dư', value: `${formatNumber(balance)} DCoin`, inline: true },
            { name: '💎 Chi phí', value: `${formatNumber(banner.cost_per_pull)} DCoin/lần\nx10: ${formatNumber(banner.cost_per_pull * 10)} DCoin`, inline: true },
            { name: '🎯 Pity', value: `4★ ${pity?.pity4 ?? 0}/10 • 5★ ${pity?.pity5 ?? 0}/90`, inline: true }
        )
        .setFooter({ text: 'Doro88 Bot • Nhấn Pull để quay' })
        .setTimestamp();

    // Hiển thị UP items từ banner details (upItem là tên property từ getBannerDetails)
    const upItems = bannerDetails?.upItem || gachaItems.getUpItems(banner.banner_type);
    if (upItems && upItems.length > 0) {
        const upItemsList = upItems
            .map(item => `⭐ **${item.name}** - ${formatNumber(item.base_value)} DCoin`)
            .join('\n');
        embed.addFields({
            name: `🌟 VẬT PHẨM UP (${upRatePercent}%)`,
            value: upItemsList || 'N/A',
            inline: false
        });
    }

    // Hiển thị vật phẩm thua UP (nếu có)
    const nonUpItems = gachaItems.getNonUpLegendary(banner.banner_type);
    if (nonUpItems && nonUpItems.length > 0) {
        const nonUpList = nonUpItems
            .map(item => `💫 **${item.name}** - ${formatNumber(item.base_value)} DCoin`)
            .join('\n');
        embed.addFields({
            name: `⚡ VẬT PHẨM THUA UP (${100 - upRatePercent}%)`,
            value: nonUpList,
            inline: false
        });
    }

    // Hiển thị tỷ lệ rarity
    const rateInfo = [
        `⭐ LEGENDARY: 0.6% (Soft pity từ pull 74)`,
        `💜 EPIC: 5.1% (Đảm bảo mỗi 10 pull)`,
        `💙 RARE: 15%`,
        `💚 UNCOMMON: 29%`,
        `⚪ COMMON: 50%`
    ].join('\n');

    embed.addFields({ name: '📊 Tỷ lệ Rarity', value: rateInfo });

    return embed;
}

/**
 * Create pull result embed (single)
 * @param {Object} item
 * @param {number} newBalance
 * @param {{pity4:number,pity5:number,rate5Star:number,guarantee5Star:boolean}} pity
 * @param {Object} pullResult - Pull result with lostUp, wonUp, guaranteeUsed flags
 * @returns {EmbedBuilder}
 */
function createPullResultEmbed(item, newBalance, pity, pullResult = {}) {
    const color = RARITY_COLORS[item.rarity] || config.colors.neutral;
    const emoji = RARITY_EMOJIS[item.rarity] || '⚪';

    // Calculate current rate as percentage for display
    const currentRate = pity?.rate5Star ? (pity.rate5Star * 100).toFixed(2) : '0.60';
    const guarantee = pity?.guarantee5Star ? ' 🌟' : '';

    let title = '🎁 Kết quả Gacha';
    if (item.rarity === 'LEGENDARY') {
        title = '🌟✨ LEGENDARY! ✨🌟';
    } else if (item.rarity === 'EPIC') {
        title = '💜 EPIC! 💜';
    }

    let description = `Bạn nhận được:\n\n${emoji} **${item.name}**\n*${item.description || 'Một vật phẩm đặc biệt'}*`;

    // Add special messages for UP system
    if (pullResult.guaranteeUsed) {
        description += `\n\n✨ **BẢO HIỂM ĐÃ KÍCH HOẠT!**\nBạn đã sử dụng bảo hiểm từ lần thua UP trước.`;
    } else if (pullResult.wonUp) {
        description += `\n\n🎯 **THẮNG UP!** Bạn đã ra được vật phẩm UP!`;
    } else if (pullResult.lostUp) {
        // NẮM BẮT VẬN MỆNH - thông báo thua UP
        description += `\n\n🌟 **NẮM BẮT VẬN MỆNH!**\n💫 Lần ra 5★ tiếp theo trên banner này **ĐẢM BẢO** là vật phẩm UP!`;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .addFields(
            { name: '📊 Độ hiếm', value: item.rarity, inline: true },
            { name: '💰 Giá trị', value: `${formatNumber(item.base_value)} DCoin`, inline: true },
            { name: '🎯 Pity', value: `4★ ${pity?.pity4 ?? 0}/10 • 5★ ${pity?.pity5 ?? 0}/90`, inline: true }
        )
        .setFooter({ text: `Số dư: ${formatNumber(newBalance)} DCoin | Tỷ lệ 5★: ${currentRate}%${guarantee} • Doro88 Bot` })
        .setTimestamp();

    return embed;
}

/**
 * Create pull 10 result embed
 * @param {Array} items
 * @param {number} totalCost
 * @param {number} newBalance
 * @param {{pity4:number,pity5:number,rate5Star:number,guarantee5Star:boolean}} pity
 * @param {Object} pullStats - Stats from pull10: {wonUpCount, lostUpCount}
 * @returns {EmbedBuilder}
 */
function createPull10ResultEmbed(items, totalCost, newBalance, pity, pullStats = {}) {
    let bestRarity = 'COMMON';
    const rarityRank = { COMMON: 1, UNCOMMON: 2, RARE: 3, EPIC: 4, LEGENDARY: 5 };

    for (const item of items) {
        if (rarityRank[item.rarity] > rarityRank[bestRarity]) {
            bestRarity = item.rarity;
        }
    }

    const color = RARITY_COLORS[bestRarity] || config.colors.neutral;

    // Calculate current rate for display
    const currentRate = pity?.rate5Star ? (pity.rate5Star * 100).toFixed(2) : '0.60';
    const guarantee = pity?.guarantee5Star ? ' 🌟' : '';

    // Count 5★ and 4★
    const count5Star = items.filter(i => i.rarity === 'LEGENDARY').length;
    const count4Star = items.filter(i => i.rarity === 'EPIC').length;

    let description = 'Bạn nhận được:';
    if (count5Star > 0) {
        description += `\n🌟 **${count5Star} vật phẩm 5★!**`;
    }
    if (count4Star > 0) {
        description += `\n💜 **${count4Star} vật phẩm 4★!**`;
    }

    // Show UP system info
    if (pullStats.wonUpCount > 0) {
        description += `\n\n🎯 **Thắng UP ${pullStats.wonUpCount} lần!**`;
    }
    if (pullStats.lostUpCount > 0) {
        description += `\n\n🌟 **NẮM BẮT VẬN MỆNH!**\n💫 Thua UP ${pullStats.lostUpCount} lần → Lần 5★/4★ sau **ĐẢM BẢO UP**!`;
    }

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎁 Kết quả Gacha x10')
        .setDescription(description)
        .setFooter({ text: `Số dư: ${formatNumber(newBalance)} DCoin | Pity: 4★ ${pity?.pity4 ?? 0}/10 • 5★ ${pity?.pity5 ?? 0}/90 | Rate: ${currentRate}%${guarantee} • Doro88 Bot` })
        .setTimestamp();

    // Group by rarity
    const grouped = {};
    for (const item of items) {
        const key = `${item.rarity}:${item.name}`;
        if (!grouped[key]) {
            grouped[key] = { ...item, count: 0 };
        }
        grouped[key].count++;
    }

    const itemList = Object.values(grouped)
        .sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity])
        .map(item => {
            const emoji = RARITY_EMOJIS[item.rarity];
            const countStr = item.count > 1 ? ` x${item.count}` : '';
            return `${emoji} **${item.name}**${countStr}`;
        })
        .join('\n');

    embed.addFields({ name: '📦 Vật phẩm', value: itemList });

    return embed;
}

module.exports = {
    createGachaMainEmbed,
    createBannerDetailEmbed,
    createPullResultEmbed,
    createPull10ResultEmbed
};
