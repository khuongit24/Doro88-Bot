const { StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

/**
 * Get emoji for rarity
 * @param {string} rarity
 * @returns {string}
 */
function getRarityEmoji(rarity) {
    const emojis = {
        'LEGENDARY': '🟡',
        'EPIC': '🟣',
        'RARE': '🔵',
        'UNCOMMON': '🟢',
        'COMMON': '⚪'
    };
    return emojis[rarity] || '⚪';
}

/**
 * Create pickaxe select menu for mining
 * @param {Array} pickaxes - Array of pickaxe items
 * @returns {ActionRowBuilder}
 */
function createPickaxeSelectMenu(pickaxes) {
    if (!pickaxes || pickaxes.length === 0) {
        return null;
    }

    const options = pickaxes.slice(0, 25).map(pickaxe => ({
        label: pickaxe.name,
        description: `${pickaxe.rarity} • +${Math.round(pickaxe.bonus.bonusRarity * 100)}% quặng hiếm`,
        value: `pickaxe_${pickaxe.id}`,
        emoji: getRarityEmoji(pickaxe.rarity)
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId('mining_pickaxe_select')
        .setPlaceholder('⛏️ Chọn cuốc để đào...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create fishing rod select menu for fishing
 * @param {Array} rods - Array of fishing rod items
 * @returns {ActionRowBuilder}
 */
function createFishingRodSelectMenu(rods) {
    if (!rods || rods.length === 0) {
        return null;
    }

    const options = rods.slice(0, 25).map(rod => ({
        label: rod.name,
        description: `${rod.rarity} • +${Math.round(rod.bonus.bonusRarity * 100)}% cá hiếm`,
        value: `rod_${rod.id}`,
        emoji: getRarityEmoji(rod.rarity)
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId('fishing_rod_select')
        .setPlaceholder('🎣 Chọn cần câu để câu...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create help category dropdown
 * @returns {ActionRowBuilder}
 */
function createHelpSelectMenu() {
    const select = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder('📚 Chọn mục hướng dẫn...')
        .addOptions([
            {
                label: '🎮 Bắt đầu chơi',
                description: 'Hướng dẫn cơ bản cho người mới',
                value: 'start',
                emoji: '🆕'
            },
            {
                label: '🎁 Hệ thống Gacha',
                description: 'Quay vật phẩm, pity system, tỷ lệ drop',
                value: 'gacha',
                emoji: '🎰'
            },
            {
                label: '🎰 Casino Games',
                description: 'Xì dách, Roulette, Slots, Tài Xỉu, Crash...',
                value: 'casino',
                emoji: '🃏'
            },
            {
                label: '🎲 Mini Games',
                description: 'Tung xu, Cào số, Oẳn tù tì, Đoán số...',
                value: 'minigames',
                emoji: '🎯'
            },
            {
                label: '💰 Hệ thống DCoin',
                description: 'Cách kiếm tiền, tiêu tiền, mẹo hay',
                value: 'economy',
                emoji: '💵'
            },
            {
                label: '📦 Quản lý Kho đồ',
                description: 'Xem, bán và sử dụng vật phẩm',
                value: 'inventory',
                emoji: '🗃️'
            },
            {
                label: '📬 Hòm thư & Quà',
                description: 'Nhận quà, đọc thư, gửi thư',
                value: 'mail',
                emoji: '✉️'
            },
            {
                label: '🏪 Cửa hàng',
                description: 'Mua bán, giao dịch vật phẩm',
                value: 'shop',
                emoji: '🛒'
            },
            {
                label: '⭐ Hệ thống Level',
                description: 'Cách lên level, kiếm XP, phần thưởng',
                value: 'level',
                emoji: '📈'
            },
        ]);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create gacha banner select menu
 * @param {Array} banners
 * @returns {ActionRowBuilder}
 */
function createBannerSelectMenu(banners) {
    const options = banners.map(banner => ({
        label: banner.name,
        description: `${banner.cost_per_pull} DCoin/lần`,
        value: `banner_${banner.id}`,
        emoji: banner.banner_type === 'LUXURY' ? '👑' : banner.banner_type === 'PREMIUM' ? '💎' : banner.banner_type === 'LIMITED' ? '⏰' : '🎁'
    }));

    const select = new StringSelectMenuBuilder()
        .setCustomId('gacha_banner')
        .setPlaceholder('🎁 Chọn banner...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create inventory item select menu
 * @param {Array} items
 * @param {number} page
 * @returns {ActionRowBuilder}
 */
function createInventorySelectMenu(items, page = 1) {
    const options = items.slice(0, 25).map((item, index) => ({
        label: `${item.name} x${item.quantity}`,
        description: `${item.rarity} • ${item.base_value} DCoin`,
        value: `item_${item.id}`,
        emoji: getRarityEmoji(item.rarity)
    }));

    if (options.length === 0) {
        options.push({
            label: 'Kho trống',
            description: 'Hãy thử gacha để có vật phẩm!',
            value: 'empty'
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('inventory_item')
        .setPlaceholder('📦 Chọn vật phẩm để xem chi tiết...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create mail select menu
 * @param {Array} mails
 * @returns {ActionRowBuilder}
 */
function createMailSelectMenu(mails) {
    const options = mails.slice(0, 25).map(mail => ({
        label: mail.subject,
        description: mail.is_claimed ? 'Đã nhận' : 'Chưa nhận',
        value: `mail_${mail.id}`,
        emoji: mail.is_claimed ? '📪' : '📬'
    }));

    if (options.length === 0) {
        options.push({
            label: 'Không có thư',
            description: 'Hòm thư trống',
            value: 'empty'
        });
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('mail_item')
        .setPlaceholder('📬 Chọn thư để đọc...')
        .addOptions(options);

    return new ActionRowBuilder().addComponents(select);
}

/**
 * Create cosmetic select menu for equipping/unequipping cosmetics
 * @param {Array} cosmetics - Array of cosmetic items owned by user
 * @param {Object} equipped - Currently equipped cosmetics
 * @returns {ActionRowBuilder|null}
 */
function createCosmeticSelectMenu(cosmetics, equipped = {}) {
    if (!cosmetics || cosmetics.length === 0) {
        return null;
    }

    // Map cosmetic type to emojis
    const typeEmoji = {
        'PROFILE_THEME': '🎨',
        'PROFILE_BORDER': '🖼️',
        'PROFILE_BADGE': '🏅',
        'HOME_THEME': '🏠'
    };

    const typeNames = {
        'PROFILE_THEME': 'Theme Profile',
        'PROFILE_BORDER': 'Khung Profile',
        'PROFILE_BADGE': 'Huy hiệu',
        'HOME_THEME': 'Theme Home'
    };

    // Check if a cosmetic is currently equipped
    const isEquipped = (item) => {
        const cosmeticType = item.metadata?.cosmetic_type;
        if (!cosmeticType) return false;

        const equippedMap = {
            'PROFILE_THEME': equipped.profile_theme,
            'PROFILE_BORDER': equipped.profile_border,
            'PROFILE_BADGE': equipped.profile_badge,
            'HOME_THEME': equipped.home_theme
        };

        // Compare with parseInt since DB stores as TEXT
        return parseInt(equippedMap[cosmeticType]) === item.id;
    };

    const options = cosmetics.slice(0, 25).map(item => {
        const cosmeticType = item.metadata?.cosmetic_type || 'UNKNOWN';
        const emoji = typeEmoji[cosmeticType] || '✨';
        const typeName = typeNames[cosmeticType] || 'Unknown';
        const equipped = isEquipped(item);

        return {
            label: `${equipped ? '✅ ' : ''}${item.name}`,
            description: `${typeName} • ${item.rarity}${equipped ? ' (Đang trang bị)' : ''}`,
            value: `cosmetic_${item.id}`,
            emoji: emoji
        };
    });

    // Add unequip options if there are equipped items
    const unequipOptions = [];
    if (equipped.profile_theme) {
        unequipOptions.push({
            label: '❌ Tháo Theme Profile',
            description: 'Bỏ trang bị theme profile hiện tại',
            value: 'unequip_PROFILE_THEME',
            emoji: '🎨'
        });
    }
    if (equipped.profile_border) {
        unequipOptions.push({
            label: '❌ Tháo Khung Profile',
            description: 'Bỏ trang bị khung profile hiện tại',
            value: 'unequip_PROFILE_BORDER',
            emoji: '🖼️'
        });
    }
    if (equipped.profile_badge) {
        unequipOptions.push({
            label: '❌ Tháo Huy hiệu',
            description: 'Bỏ trang bị huy hiệu hiện tại',
            value: 'unequip_PROFILE_BADGE',
            emoji: '🏅'
        });
    }
    if (equipped.home_theme) {
        unequipOptions.push({
            label: '❌ Tháo Theme Home',
            description: 'Bỏ trang bị theme home hiện tại',
            value: 'unequip_HOME_THEME',
            emoji: '🏠'
        });
    }

    // Combine options - unequip first, then cosmetics
    const allOptions = [...unequipOptions, ...options].slice(0, 25);

    if (allOptions.length === 0) {
        return null;
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId('cosmetic_select')
        .setPlaceholder('✨ Chọn cosmetic để trang bị...')
        .addOptions(allOptions);

    return new ActionRowBuilder().addComponents(select);
}

module.exports = {
    createHelpSelectMenu,
    createBannerSelectMenu,
    createInventorySelectMenu,
    createMailSelectMenu,
    createPickaxeSelectMenu,
    createFishingRodSelectMenu,
    createCosmeticSelectMenu
};
