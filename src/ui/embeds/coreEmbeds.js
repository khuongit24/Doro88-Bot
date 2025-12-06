const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber, formatDCoin } = require('../../utils/helpers');
const { RARITY_COLORS, RARITY_EMOJIS } = require('../../utils/constants');
const levelManager = require('../../managers/levelManager');
const userManager = require('../../managers/userManager');
const { getShopItems } = require('../../managers/shopManager');

/**
 * Create home page embed
 * @param {Object} user
 * @param {Object} stats
 * @param {Object} options - Additional options
 * @param {boolean} options.hasCheckedInToday - Whether user has checked in today
 * @param {string} options.timeUntilReset - Time until daily reset
 * @returns {EmbedBuilder}
 */
function createHomeEmbed(user, stats, options = {}) {
    const { hasCheckedInToday = false, timeUntilReset = '' } = options;

    // Get level info
    const levelInfo = levelManager.getUserLevelInfo(user.discord_id);
    const level = levelInfo?.level || user.level || 1;
    const progressBar = levelInfo ? levelManager.createProgressBar(levelInfo.percentage, 8) : '░░░░░░░░';
    const xpText = levelInfo?.isMaxLevel ? 'MAX' : `${levelInfo?.currentXP || 0}/${levelInfo?.requiredXP || 100}`;

    // Get equipped home theme cosmetic
    const equippedCosmetics = userManager.getEquippedCosmetics(user.discord_id);
    let homeTheme = null;
    let embedColor = config.colors.primary;
    let titlePrefix = '🎮';

    if (equippedCosmetics.home_theme) {
        const shopItems = getShopItems();
        homeTheme = shopItems.find(item => item.id === equippedCosmetics.home_theme);
        if (homeTheme && homeTheme.metadata) {
            embedColor = homeTheme.metadata.color || config.colors.primary;
            titlePrefix = homeTheme.metadata.emoji || '🎮';
        }
    }

    let description = `Chào mừng bạn đến với **Doro88**!\nChọn một trò chơi bên dưới để bắt đầu.\n\n⭐ **Level ${level}** ${progressBar} (${xpText} XP)`;

    // Show home theme if equipped
    if (homeTheme) {
        description = `${homeTheme.metadata?.title || homeTheme.name}\n\n` + description;
    }

    // Show daily checkin status
    if (hasCheckedInToday && timeUntilReset) {
        description += `\n\n❌ Bạn đã điểm danh hôm nay rồi!\nQuay lại sau: **${timeUntilReset}**`;
    }

    // Show comeback bonus message if user is broke
    if (user.dcoin < 50) {
        description += '\n\n💡 **Hết tiền?** Chơi 🎫 **Cào xổ số** (chỉ 25 DCoin) hoặc các mini games miễn phí!';
    }

    return new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${titlePrefix} DORO88 - Trung tâm giải trí`)
        .setDescription(description)
        .addFields(
            { name: '💰 Số dư', value: `\`${formatNumber(user.dcoin)} DCoin\``, inline: true },
            { name: '📦 Vật phẩm', value: `\`${stats.inventoryCount} items\``, inline: true },
            { name: '📬 Thư mới', value: `\`${stats.unreadMailCount} thư\``, inline: true }
        )
        .setFooter({ text: `Doro88 Bot • Lv.${level} • Xếp hạng: #${stats.rank}` })
        .setTimestamp();
}

/**
 * Create profile embed
 * @param {Object} user
 * @param {Object} stats
 * @returns {EmbedBuilder}
 */
function createProfileEmbed(user, stats) {
    // Get level info
    const levelInfo = levelManager.getUserLevelInfo(user.discord_id);
    const level = levelInfo?.level || user.level || 1;
    const totalXP = levelInfo?.totalXP || user.total_xp || 0;
    const progressBar = levelInfo ? levelManager.createProgressBar(levelInfo.percentage, 10) : '░░░░░░░░░░';
    const xpText = levelInfo?.isMaxLevel ? '✨ MAX LEVEL ✨' : `${levelInfo?.currentXP || 0}/${levelInfo?.requiredXP || 100} XP`;
    const nextMilestone = levelInfo?.nextMilestone;

    // Get equipped cosmetics
    const equippedCosmetics = userManager.getEquippedCosmetics(user.discord_id);
    const shopItems = getShopItems();

    // Get cosmetic items from shop (convert IDs to int since DB stores as TEXT)
    const profileTheme = equippedCosmetics.profile_theme ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_theme)) : null;
    const profileBorder = equippedCosmetics.profile_border ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_border)) : null;
    const profileBadge = equippedCosmetics.profile_badge ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_badge)) : null;

    // Determine embed color from theme
    let embedColor = config.colors.info;
    if (profileTheme && profileTheme.metadata && profileTheme.metadata.color) {
        embedColor = profileTheme.metadata.color;
    }

    // Build title with badge
    let title = `👤 Hồ sơ: ${user.username}`;
    if (profileBadge && profileBadge.metadata) {
        title = `${profileBadge.metadata.emoji || '🏅'} Hồ sơ: ${user.username}`;
    }

    // Build level description
    let levelDescription = `**Level ${level}**\n${progressBar}\n${xpText}`;
    if (nextMilestone) {
        levelDescription += `\n\n📍 Mốc tiếp theo: **Lv.${nextMilestone.level}** (+${formatNumber(nextMilestone.dcoin)} DCoin)`;
    }

    // Add cosmetics display section
    let cosmeticsDisplay = [];
    if (profileTheme) {
        cosmeticsDisplay.push(`🎨 **Theme**: ${profileTheme.name}`);
    }
    if (profileBorder) {
        cosmeticsDisplay.push(`🖼️ **Khung**: ${profileBorder.name}`);
    }
    if (profileBadge) {
        cosmeticsDisplay.push(`🏅 **Huy hiệu**: ${profileBadge.metadata?.title || profileBadge.name}`);
    }

    if (cosmeticsDisplay.length > 0) {
        levelDescription += `\n\n✨ **Trang bị:**\n${cosmeticsDisplay.join('\n')}`;
    }

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(title)
        .setDescription(levelDescription)
        .addFields(
            { name: '💰 Số dư', value: formatNumber(user.dcoin) + ' DCoin', inline: true },
            { name: '📈 Tổng kiếm được', value: formatNumber(user.total_earned) + ' DCoin', inline: true },
            { name: '📉 Tổng tiêu', value: formatNumber(user.total_spent) + ' DCoin', inline: true },
            { name: '🏆 Xếp hạng', value: `#${stats.rank}`, inline: true },
            { name: '⭐ Tổng XP', value: formatNumber(totalXP), inline: true },
            { name: '🎯 Pity', value: `4★ ${user.pity4_counter || 0}/10 • 5★ ${user.pity5_counter || 0}/90`, inline: true },
            { name: '📦 Vật phẩm', value: formatNumber(stats.inventoryCount), inline: true },
            { name: '🔥 Daily streak', value: `${user.daily_streak} ngày`, inline: true },
            { name: '📅 Tham gia', value: new Date(user.created_at).toLocaleDateString('vi-VN'), inline: true }
        )
        .setFooter({ text: 'Doro88 Bot' })
        .setTimestamp();

    return embed;
}

/**
 * Create inventory embed
 * @param {Array} items
 * @param {Object} pagination
 * @param {string} username
 * @returns {EmbedBuilder}
 */
function createInventoryEmbed(items, pagination, username) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`📦 Kho đồ của ${username}`)
        .setFooter({ text: `Trang ${pagination.currentPage}/${pagination.totalPages} • Doro88 Bot` })
        .setTimestamp();

    if (items.length === 0) {
        embed.setDescription('*Kho đồ trống!*\nHãy thử gacha để nhận vật phẩm.');
    } else {
        // Giá bán = 100% base_value (khớp với shopManager.sellToShop)
        const description = items.map(item => {
            const emoji = RARITY_EMOJIS[item.rarity] || '⚪';
            const sellPrice = item.base_value;
            return `${emoji} **${item.name}** x${item.quantity}\n└ ${item.rarity} • Bán: ${formatNumber(sellPrice)} DCoin/cái`;
        }).join('\n\n');

        embed.setDescription(description);
    }

    return embed;
}

/**
 * Create item detail embed
 * @param {Object} item
 * @returns {EmbedBuilder}
 */
function createItemDetailEmbed(item) {
    const color = RARITY_COLORS[item.rarity] || config.colors.neutral;
    const emoji = RARITY_EMOJIS[item.rarity] || '⚪';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${item.name}`)
        .setDescription(item.description || '*Không có mô tả*')
        .addFields(
            { name: '📊 Độ hiếm', value: item.rarity, inline: true },
            { name: '📦 Loại', value: item.type, inline: true },
            { name: '💰 Giá trị', value: `${formatNumber(item.base_value)} DCoin`, inline: true },
            { name: '🔢 Số lượng', value: formatNumber(item.quantity), inline: true }
        )
        .setFooter({ text: 'Doro88 Bot' })
        .setTimestamp();

    if (item.image_url) {
        embed.setThumbnail(item.image_url);
    }

    return embed;
}

/**
 * Create leaderboard embed
 * @param {Array} users
 * @param {number} userRank
 * @returns {EmbedBuilder}
 */
function createLeaderboardEmbed(users, userRank) {
    const medals = ['🥇', '🥈', '🥉'];

    const description = users.map((user, index) => {
        const medal = medals[index] || `**${index + 1}.**`;
        const level = user.level || 1;
        return `${medal} ${user.username}\n└ Lv.${level} • ${formatNumber(user.dcoin)} DCoin`;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🏆 Bảng xếp hạng DCoin')
        .setDescription(description || '*Chưa có dữ liệu*')
        .setFooter({ text: `Xếp hạng của bạn: #${userRank} • Doro88 Bot` })
        .setTimestamp();
}

/**
 * Create success embed
 * @param {string} message
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(message) {
    return new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ ${message}`);
}

/**
 * Create error embed
 * @param {string} message
 * @param {string} tip - Optional helpful tip
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(message, tip = null) {
    let description = `❌ ${message}`;
    if (tip) {
        description += `\n\n💡 **Tip:** ${tip}`;
    }
    return new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription(description);
}

/**
 * Create warning embed
 * @param {string} message
 * @returns {EmbedBuilder}
 */
function createWarningEmbed(message) {
    return new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`⚠️ ${message}`);
}

/**
 * Create cosmetics management embed
 * @param {string} discordId
 * @param {Array} ownedCosmetics - Cosmetic items owned by the user
 * @returns {EmbedBuilder}
 */
function createCosmeticsEmbed(discordId, ownedCosmetics) {
    const equippedCosmetics = userManager.getEquippedCosmetics(discordId);
    const shopItems = getShopItems();

    // Get equipped items details (convert IDs to int for comparison since DB stores as TEXT)
    const profileTheme = equippedCosmetics.profile_theme ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_theme)) : null;
    const profileBorder = equippedCosmetics.profile_border ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_border)) : null;
    const profileBadge = equippedCosmetics.profile_badge ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.profile_badge)) : null;
    const homeTheme = equippedCosmetics.home_theme ?
        shopItems.find(i => i.id === parseInt(equippedCosmetics.home_theme)) : null;

    let description = '**✨ QUẢN LÝ TRANG BỊ ✨**\n\n';

    // Currently equipped section
    description += '**📌 Đang trang bị:**\n';
    description += `🎨 Theme Profile: ${profileTheme ? profileTheme.name : '*Chưa có*'}\n`;
    description += `🖼️ Khung Profile: ${profileBorder ? profileBorder.name : '*Chưa có*'}\n`;
    description += `🏅 Huy hiệu: ${profileBadge ? (profileBadge.metadata?.title || profileBadge.name) : '*Chưa có*'}\n`;
    description += `🏠 Theme Home: ${homeTheme ? homeTheme.name : '*Chưa có*'}\n`;

    // Available cosmetics
    description += '\n**🎁 Cosmetics sở hữu:**\n';

    if (ownedCosmetics.length === 0) {
        description += '*Bạn chưa có cosmetic nào!*\n';
        description += '💡 Mua cosmetics tại **Cửa hàng** để trang trí profile và home!';
    } else {
        // Group by type
        const grouped = {
            PROFILE_THEME: [],
            PROFILE_BORDER: [],
            PROFILE_BADGE: [],
            HOME_THEME: []
        };

        for (const item of ownedCosmetics) {
            if (item.metadata?.cosmetic_type && grouped[item.metadata.cosmetic_type]) {
                grouped[item.metadata.cosmetic_type].push(item);
            }
        }

        if (grouped.PROFILE_THEME.length > 0) {
            description += '\n🎨 **Theme Profile:**\n';
            grouped.PROFILE_THEME.forEach(item => {
                const isEquipped = parseInt(equippedCosmetics.profile_theme) === item.id;
                description += `${isEquipped ? '✅' : '⬜'} ${item.name}\n`;
            });
        }

        if (grouped.PROFILE_BORDER.length > 0) {
            description += '\n🖼️ **Khung Profile:**\n';
            grouped.PROFILE_BORDER.forEach(item => {
                const isEquipped = parseInt(equippedCosmetics.profile_border) === item.id;
                description += `${isEquipped ? '✅' : '⬜'} ${item.name}\n`;
            });
        }

        if (grouped.PROFILE_BADGE.length > 0) {
            description += '\n🏅 **Huy hiệu:**\n';
            grouped.PROFILE_BADGE.forEach(item => {
                const isEquipped = parseInt(equippedCosmetics.profile_badge) === item.id;
                description += `${isEquipped ? '✅' : '⬜'} ${item.metadata?.title || item.name}\n`;
            });
        }

        if (grouped.HOME_THEME.length > 0) {
            description += '\n🏠 **Theme Home:**\n';
            grouped.HOME_THEME.forEach(item => {
                const isEquipped = parseInt(equippedCosmetics.home_theme) === item.id;
                description += `${isEquipped ? '✅' : '⬜'} ${item.name}\n`;
            });
        }
    }

    description += '\n💡 Chọn cosmetic từ menu bên dưới để trang bị!';

    return new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('✨ Quản lý Trang bị')
        .setDescription(description)
        .setFooter({ text: 'Doro88 Bot • Chọn cosmetic để trang bị' })
        .setTimestamp();
}

module.exports = {
    createHomeEmbed,
    createProfileEmbed,
    createInventoryEmbed,
    createItemDetailEmbed,
    createLeaderboardEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createCosmeticsEmbed
};
