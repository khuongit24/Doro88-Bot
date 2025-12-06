const { get, all, run } = require('../database/connection');
const userManager = require('./userManager');
const itemManager = require('./itemManager');
const inventoryManager = require('./inventoryManager');
const economyManager = require('./economyManager');
const { TRANSACTION_TYPES, DEFAULT_TOOLS, COSMETIC_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');
const { transaction } = require('../database/connection');

// Active trades in memory
const activeTrades = new Map();

// ============= SHOP ITEMS - Vật phẩm buff hợp lý =============
// Shop chỉ bán các consumables/boosters với giá cân bằng
// KHÔNG bán công cụ (cuốc, cần câu) - chỉ có qua gacha
const SHOP_ITEMS = [
    // ===== BOOSTERS - Tăng tiền thắng =====
    {
        id: 'boost_x1_5_1h',
        name: 'Lucky Charm Mini',
        description: 'Tăng 1.5x DCoin khi thắng game trong 1 giờ',
        type: 'BOOSTER',
        rarity: 'UNCOMMON',
        price: 300,        // Giá hợp lý cho boost nhỏ
        base_value: 200,
        metadata: { multiplier: 1.5, duration: 3600 }
    },
    {
        id: 'boost_x2_30m',
        name: 'Lucky Charm x2',
        description: 'Tăng 2x DCoin khi thắng game trong 30 phút',
        type: 'BOOSTER',
        rarity: 'RARE',
        price: 500,
        base_value: 350,
        metadata: { multiplier: 2, duration: 1800 }
    },
    {
        id: 'boost_x2_1h',
        name: 'Super Lucky Charm',
        description: 'Tăng 2x DCoin khi thắng game trong 1 giờ',
        type: 'BOOSTER',
        rarity: 'EPIC',
        price: 800,
        base_value: 600,
        metadata: { multiplier: 2, duration: 3600 }
    },
    
    // ===== CONSUMABLES - Vật phẩm tiêu hao =====
    {
        id: 'daily_reset',
        name: 'Daily Reset Ticket',
        description: 'Reset lại nhiệm vụ daily để nhận thưởng thêm 1 lần',
        type: 'CONSUMABLE',
        rarity: 'RARE',
        price: 500,
        base_value: 400,
        metadata: { effect: 'reset_daily' }
    },
    {
        id: 'mining_boost',
        name: 'Bột Năng Lượng',
        description: 'Tăng 20% tỉ lệ quặng hiếm trong 30 phút đào mỏ',
        type: 'CONSUMABLE',
        rarity: 'UNCOMMON',
        price: 200,
        base_value: 150,
        metadata: { effect: 'mining_boost', bonus: 0.20, duration: 1800 }
    },
    {
        id: 'fishing_boost',
        name: 'Mồi Câu Cao Cấp',
        description: 'Tăng 20% tỉ lệ cá hiếm trong 30 phút câu cá',
        type: 'CONSUMABLE',
        rarity: 'UNCOMMON',
        price: 200,
        base_value: 150,
        metadata: { effect: 'fishing_boost', bonus: 0.20, duration: 1800 }
    },
    
    // ===== XP BOOSTERS - Tăng XP =====
    {
        id: 'xp_boost_small',
        name: 'XP Potion Small',
        description: 'Tăng 25% XP nhận được trong 1 giờ',
        type: 'BOOSTER',
        rarity: 'UNCOMMON',
        price: 250,
        base_value: 180,
        metadata: { xp_multiplier: 1.25, duration: 3600 }
    },
    {
        id: 'xp_boost_medium',
        name: 'XP Potion Medium',
        description: 'Tăng 50% XP nhận được trong 1 giờ',
        type: 'BOOSTER',
        rarity: 'RARE',
        price: 450,
        base_value: 350,
        metadata: { xp_multiplier: 1.5, duration: 3600 }
    },
    
    // ===================================================================
    // ===== COSMETICS CAO CẤP - Trang trí Profile & Home =====
    // ===================================================================
    
    // ===== PROFILE THEMES - Thay đổi màu sắc profile =====
    {
        id: 'theme_ocean',
        name: '🌊 Ocean Breeze Theme',
        description: 'Theme xanh dương thanh bình như đại dương. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 15000,
        base_value: 15000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'ocean',
            color: 0x0077BE,
            emoji: '🌊'
        }
    },
    {
        id: 'theme_sunset',
        name: '🌅 Sunset Glow Theme',
        description: 'Theme cam đỏ ấm áp như hoàng hôn. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 15000,
        base_value: 15000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'sunset',
            color: 0xFF6B35,
            emoji: '🌅'
        }
    },
    {
        id: 'theme_galaxy',
        name: '🌌 Galaxy Dream Theme',
        description: 'Theme tím huyền bí như dải ngân hà. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 35000,
        base_value: 35000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'galaxy',
            color: 0x9B59B6,
            emoji: '🌌'
        }
    },
    {
        id: 'theme_golden',
        name: '✨ Golden Luxury Theme',
        description: 'Theme vàng sang trọng dành cho người chơi đẳng cấp. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'LEGENDARY',
        price: 80000,
        base_value: 80000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'golden',
            color: 0xFFD700,
            emoji: '✨'
        }
    },
    {
        id: 'theme_neon',
        name: '💜 Neon Cyber Theme',
        description: 'Theme neon sặc sỡ phong cách cyberpunk. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 40000,
        base_value: 40000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'neon',
            color: 0xE040FB,
            emoji: '💜'
        }
    },
    {
        id: 'theme_forest',
        name: '🌲 Enchanted Forest Theme',
        description: 'Theme xanh lá tự nhiên như rừng cổ tích. Thay đổi màu sắc profile của bạn!',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 15000,
        base_value: 15000,
        metadata: { 
            cosmetic_type: 'PROFILE_THEME',
            theme_id: 'forest',
            color: 0x2E7D32,
            emoji: '🌲'
        }
    },
    
    // ===== PROFILE BORDERS - Khung viền profile =====
    {
        id: 'border_silver',
        name: '🔘 Silver Frame',
        description: 'Khung viền bạc đơn giản nhưng tinh tế cho profile của bạn.',
        type: 'COSMETIC',
        rarity: 'UNCOMMON',
        price: 8000,
        base_value: 8000,
        metadata: { 
            cosmetic_type: 'PROFILE_BORDER',
            border_id: 'silver',
            style: '╔══╗\n║  ║\n╚══╝'
        }
    },
    {
        id: 'border_gold',
        name: '🟡 Golden Frame',
        description: 'Khung viền vàng sang trọng cho profile của bạn.',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 20000,
        base_value: 20000,
        metadata: { 
            cosmetic_type: 'PROFILE_BORDER',
            border_id: 'gold',
            style: '✦═══✦\n║   ║\n✦═══✦'
        }
    },
    {
        id: 'border_diamond',
        name: '💎 Diamond Frame',
        description: 'Khung viền kim cương lấp lánh, thể hiện đẳng cấp!',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 50000,
        base_value: 50000,
        metadata: { 
            cosmetic_type: 'PROFILE_BORDER',
            border_id: 'diamond',
            style: '💎═══💎\n║    ║\n💎═══💎'
        }
    },
    {
        id: 'border_legendary',
        name: '👑 Royal Crown Frame',
        description: 'Khung viền hoàng gia với vương miện, dành cho bậc thầy!',
        type: 'COSMETIC',
        rarity: 'LEGENDARY',
        price: 100000,
        base_value: 100000,
        metadata: { 
            cosmetic_type: 'PROFILE_BORDER',
            border_id: 'royal',
            style: '👑═══👑\n║    ║\n🏆═══🏆'
        }
    },
    
    // ===== PROFILE BADGES - Huy hiệu hiển thị =====
    {
        id: 'badge_lucky',
        name: '🍀 Lucky Clover Badge',
        description: 'Huy hiệu cỏ 4 lá may mắn hiển thị trên profile của bạn.',
        type: 'COSMETIC',
        rarity: 'UNCOMMON',
        price: 5000,
        base_value: 5000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'lucky',
            emoji: '🍀',
            title: 'Lucky Player'
        }
    },
    {
        id: 'badge_whale',
        name: '🐋 Big Whale Badge',
        description: 'Huy hiệu cá voi - dành cho những tay chơi lớn!',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 25000,
        base_value: 25000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'whale',
            emoji: '🐋',
            title: 'Big Spender'
        }
    },
    {
        id: 'badge_dragon',
        name: '🐉 Dragon Lord Badge',
        description: 'Huy hiệu rồng quyền lực - thể hiện sức mạnh tối thượng!',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 60000,
        base_value: 60000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'dragon',
            emoji: '🐉',
            title: 'Dragon Lord'
        }
    },
    {
        id: 'badge_emperor',
        name: '👑 Emperor Badge',
        description: 'Huy hiệu Hoàng Đế - biểu tượng quyền lực tối cao!',
        type: 'COSMETIC',
        rarity: 'LEGENDARY',
        price: 150000,
        base_value: 150000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'emperor',
            emoji: '👑',
            title: 'Emperor'
        }
    },
    {
        id: 'badge_star',
        name: '⭐ Rising Star Badge',
        description: 'Huy hiệu ngôi sao - dành cho những ngôi sao đang lên!',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 18000,
        base_value: 18000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'star',
            emoji: '⭐',
            title: 'Rising Star'
        }
    },
    {
        id: 'badge_vip',
        name: '💜 VIP Badge',
        description: 'Huy hiệu VIP - thể hiện bạn là khách hàng thượng đẳng!',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 45000,
        base_value: 45000,
        metadata: { 
            cosmetic_type: 'PROFILE_BADGE',
            badge_id: 'vip',
            emoji: '💜',
            title: 'VIP Member'
        }
    },
    
    // ===== HOME THEMES - Theme cho trang chủ =====
    {
        id: 'home_casino',
        name: '🎰 Casino Royale Home',
        description: 'Trang chủ phong cách casino sang trọng với màu đỏ đen cổ điển.',
        type: 'COSMETIC',
        rarity: 'RARE',
        price: 20000,
        base_value: 20000,
        metadata: { 
            cosmetic_type: 'HOME_THEME',
            theme_id: 'casino',
            color: 0xB71C1C,
            emoji: '🎰',
            title: '🎰 CASINO ROYALE 🎰'
        }
    },
    {
        id: 'home_space',
        name: '🚀 Space Station Home',
        description: 'Trang chủ phong cách trạm không gian với màu xanh đen huyền bí.',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 45000,
        base_value: 45000,
        metadata: { 
            cosmetic_type: 'HOME_THEME',
            theme_id: 'space',
            color: 0x1A237E,
            emoji: '🚀',
            title: '🚀 SPACE STATION 🚀'
        }
    },
    {
        id: 'home_treasure',
        name: '💰 Treasure Island Home',
        description: 'Trang chủ phong cách đảo kho báu với màu vàng kim.',
        type: 'COSMETIC',
        rarity: 'EPIC',
        price: 50000,
        base_value: 50000,
        metadata: { 
            cosmetic_type: 'HOME_THEME',
            theme_id: 'treasure',
            color: 0xFFC107,
            emoji: '💰',
            title: '💰 TREASURE ISLAND 💰'
        }
    },
    {
        id: 'home_dragon',
        name: '🐲 Dragon Palace Home',
        description: 'Trang chủ phong cách cung điện rồng với màu đỏ vàng hoàng gia.',
        type: 'COSMETIC',
        rarity: 'LEGENDARY',
        price: 120000,
        base_value: 120000,
        metadata: { 
            cosmetic_type: 'HOME_THEME',
            theme_id: 'dragon',
            color: 0xD32F2F,
            emoji: '🐲',
            title: '🐲 DRAGON PALACE 🐲'
        }
    }
];

// Cache shop items với item IDs từ database
let shopItemsCache = null;

/**
 * Create a trade offer
 * @param {string} fromDiscordId - Seller
 * @param {string} toDiscordId - Buyer 
 * @param {number} itemId
 * @param {number} quantity
 * @param {number} price - asking price in DCoin
 * @returns {Object}
 */
function createTradeOffer(fromDiscordId, toDiscordId, itemId, quantity, price) {
    if (fromDiscordId === toDiscordId) {
        return { error: 'cannot_trade_self' };
    }

    const fromUser = userManager.getUser(fromDiscordId);
    const toUser = userManager.getUser(toDiscordId);

    if (!fromUser || !toUser) {
        return { error: 'user_not_found' };
    }

    // Check if seller has the item
    if (!inventoryManager.hasItem(fromDiscordId, itemId, quantity)) {
        return { error: 'insufficient_items' };
    }

    const item = itemManager.getItemById(itemId);
    if (!item) {
        return { error: 'item_not_found' };
    }

    const tradeId = `trade_${Date.now()}_${fromDiscordId}`;
    const trade = {
        id: tradeId,
        fromDiscordId,
        toDiscordId,
        itemId,
        itemName: item.name,
        quantity,
        price,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
    };

    activeTrades.set(tradeId, trade);

    logger.info('Trade offer created', { tradeId, from: fromDiscordId, to: toDiscordId, item: item.name });
    return trade;
}

/**
 * Accept a trade offer
 * @param {string} tradeId
 * @param {string} buyerDiscordId
 * @returns {Object}
 */
function acceptTrade(tradeId, buyerDiscordId) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
        return { error: 'trade_not_found' };
    }

    if (trade.toDiscordId !== buyerDiscordId) {
        return { error: 'not_recipient' };
    }

    if (trade.status !== 'pending') {
        return { error: 'trade_not_pending' };
    }

    if (Date.now() > trade.expiresAt) {
        activeTrades.delete(tradeId);
        return { error: 'trade_expired' };
    }

    // Check buyer has enough DCoin
    if (!economyManager.canAfford(buyerDiscordId, trade.price)) {
        return { error: 'insufficient_balance' };
    }

    // Check seller still has item
    if (!inventoryManager.hasItem(trade.fromDiscordId, trade.itemId, trade.quantity)) {
        activeTrades.delete(tradeId);
        return { error: 'seller_no_items' };
    }

    try {
        // Transfer DCoin from buyer to seller
        economyManager.deductDCoin(buyerDiscordId, trade.price, TRANSACTION_TYPES.SPEND, `Trade: mua ${trade.itemName}`);
        economyManager.addDCoin(trade.fromDiscordId, trade.price, TRANSACTION_TYPES.EARN, `Trade: bán ${trade.itemName}`);

        // Transfer item from seller to buyer
        inventoryManager.removeItem(trade.fromDiscordId, trade.itemId, trade.quantity);
        inventoryManager.addItem(buyerDiscordId, trade.itemId, trade.quantity);

        trade.status = 'completed';
        activeTrades.delete(tradeId);

        logger.info('Trade completed', { tradeId, buyer: buyerDiscordId, seller: trade.fromDiscordId });
        return { success: true, trade };
    } catch (error) {
        logger.error('Trade error', { tradeId, error: error.message });
        return { error: 'trade_failed' };
    }
}

/**
 * Decline a trade offer
 * @param {string} tradeId
 * @param {string} discordId
 * @returns {Object}
 */
function declineTrade(tradeId, discordId) {
    const trade = activeTrades.get(tradeId);

    if (!trade) {
        return { error: 'trade_not_found' };
    }

    if (trade.toDiscordId !== discordId && trade.fromDiscordId !== discordId) {
        return { error: 'not_participant' };
    }

    trade.status = 'declined';
    activeTrades.delete(tradeId);

    logger.info('Trade declined', { tradeId, by: discordId });
    return { success: true };
}

/**
 * Get pending trades for a user
 * @param {string} discordId
 * @returns {Array}
 */
function getPendingTrades(discordId) {
    const trades = [];
    const now = Date.now();

    for (const [id, trade] of activeTrades) {
        if (trade.expiresAt < now) {
            activeTrades.delete(id);
            continue;
        }
        if (trade.toDiscordId === discordId || trade.fromDiscordId === discordId) {
            trades.push(trade);
        }
    }

    return trades;
}

/**
 * Sell item to shop (NPC)
 * Note: Default wooden tools (Cuốc Gỗ and Cần câu Tre) cannot be sold
 * CÂN BẰNG KINH TẾ v3.0: Giá bán = 100% base_value (item values đã được điều chỉnh trong banners)
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {Object}
 */
function sellToShop(discordId, itemId, quantity = 1) {
    const invItem = inventoryManager.getInventoryItem(discordId, itemId);

    if (!invItem || invItem.quantity < quantity) {
        return { error: 'insufficient_items' };
    }

    // Check if this is a default tool that cannot be sold
    if (invItem.name === DEFAULT_TOOLS.PICKAXE || invItem.name === DEFAULT_TOOLS.FISHING_ROD) {
        return { error: 'cannot_sell_default_tool' };
    }

    // CÂN BẰNG KINH TẾ v3.0: Giá bán = 100% base_value
    // Item values trong gacha banners đã được điều chỉnh để đạt RTP ~70%
    const sellPrice = Math.floor(invItem.base_value) * quantity;

    try {
        inventoryManager.removeItem(discordId, itemId, quantity);
        economyManager.addDCoin(discordId, sellPrice, TRANSACTION_TYPES.EARN, `Bán ${quantity}x ${invItem.name}`);

        logger.info('Item sold to shop', { discordId, itemId, quantity, price: sellPrice });
        return {
            success: true,
            item: invItem,
            quantity,
            price: sellPrice
        };
    } catch (error) {
        logger.error('Sell to shop error', { discordId, itemId, error: error.message });
        return { error: 'sell_failed' };
    }
}

/**
 * Backward-compatible alias used by buttonHandler
 * Delegates to sellToShop.
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {Object}
 */
function sellItem(discordId, itemId, quantity = 1) {
    return sellToShop(discordId, itemId, quantity);
}

/**
 * Sell all inventory items to shop at 100% base value
 * Note: Default wooden tools (Cuốc Gỗ and Cần câu Tre) are excluded and cannot be sold
 * @param {string} discordId
 * @returns {Object} { success, totalPrice, soldCount }
 */
function sellAllToShop(discordId) {
    const items = inventoryManager.getAllInventoryItems(discordId);
    if (!items || items.length === 0) {
        return { error: 'no_items' };
    }

    // Filter out default tools that cannot be sold
    const sellableItems = items.filter(item => 
        item.name !== DEFAULT_TOOLS.PICKAXE && 
        item.name !== DEFAULT_TOOLS.FISHING_ROD
    );

    if (sellableItems.length === 0) {
        return { error: 'no_sellable_items' };
    }

    try {
        const result = transaction(() => {
            let totalPrice = 0;
            let soldCount = 0;
            for (const invItem of sellableItems) {
                if (invItem.quantity <= 0) continue;
                // Giá bán = base_value (100%) - công bằng cho người chơi
                const priceForItem = invItem.base_value * invItem.quantity;
                // Remove entire quantity
                inventoryManager.removeItem(discordId, invItem.id, invItem.quantity);
                totalPrice += priceForItem;
                soldCount += invItem.quantity;
            }

            if (totalPrice > 0) {
                economyManager.addDCoin(discordId, totalPrice, TRANSACTION_TYPES.EARN, `Bán tất cả vật phẩm (${soldCount} món)`);
            }

            return { success: true, totalPrice, soldCount };
        });

        logger.info('Sold all items to shop', { discordId, totalPrice: result.totalPrice, soldCount: result.soldCount });
        return result;
    } catch (error) {
        logger.error('Sell all to shop error', { discordId, error: error.message });
        return { error: 'sell_failed' };
    }
}

/**
 * Get shop items (items available for purchase)
 * Shop bán các vật phẩm buff/consumables với giá cân bằng
 * @returns {Array}
 */
function getShopItems() {
    // Ensure shop items exist in database
    ensureShopItemsInDatabase();
    
    // Return shop items with their database IDs
    // IMPORTANT: shopButtons.js uses `item.id` for select menu values
    return SHOP_ITEMS.map(item => {
        const dbItem = get('SELECT id FROM items WHERE name = ?', [item.name]);
        return {
            ...item,
            id: dbItem ? dbItem.id : null,     // For select menu compatibility
            itemId: dbItem ? dbItem.id : null, // Alternative accessor
            shopPrice: item.price
        };
    }).filter(item => item.id !== null);
}

/**
 * Ensure all shop items exist in database
 */
function ensureShopItemsInDatabase() {
    for (const item of SHOP_ITEMS) {
        const existing = get('SELECT id FROM items WHERE name = ?', [item.name]);
        if (!existing) {
            try {
                run(`
                    INSERT INTO items (name, description, rarity, type, base_value, metadata)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    item.name,
                    item.description,
                    item.rarity,
                    item.type,
                    item.base_value,
                    JSON.stringify(item.metadata)
                ]);
                logger.info('Created shop item in database', { name: item.name });
            } catch (error) {
                logger.error('Failed to create shop item', { name: item.name, error: error.message });
            }
        }
    }
}

/**
 * Buy item from shop
 * @param {string} discordId
 * @param {number} itemId
 * @param {number} quantity
 * @returns {Object}
 */
function buyFromShop(discordId, itemId, quantity = 1) {
    // Find the shop item
    const shopItems = getShopItems();
    const shopItem = shopItems.find(item => item.itemId === itemId);
    
    if (!shopItem) {
        return { error: 'not_for_sale' };
    }
    
    const totalPrice = shopItem.price * quantity;
    
    // Check if user can afford
    if (!economyManager.canAfford(discordId, totalPrice)) {
        return { error: 'insufficient_balance', required: totalPrice };
    }
    
    try {
        const result = transaction(() => {
            // Deduct DCoin
            economyManager.deductDCoin(discordId, totalPrice, TRANSACTION_TYPES.SPEND, `Mua ${quantity}x ${shopItem.name}`);
            
            // Add item to inventory
            const added = inventoryManager.addItem(discordId, itemId, quantity);
            if (!added) {
                throw new Error('Failed to add item to inventory');
            }
            
            return { success: true };
        });
        
        logger.info('Item bought from shop', { discordId, itemId, quantity, price: totalPrice });
        
        return {
            success: true,
            item: shopItem,
            quantity,
            price: totalPrice,
            newBalance: economyManager.getBalance(discordId)
        };
    } catch (error) {
        logger.error('Buy from shop error', { discordId, itemId, error: error.message });
        return { error: 'purchase_failed' };
    }
}

/**
 * Clean up expired trades
 */
function cleanupExpiredTrades() {
    const now = Date.now();
    for (const [id, trade] of activeTrades) {
        if (trade.expiresAt < now) {
            activeTrades.delete(id);
        }
    }
}

// Cleanup every minute
setInterval(cleanupExpiredTrades, 60000);

module.exports = {
    createTradeOffer,
    acceptTrade,
    declineTrade,
    getPendingTrades,
    sellToShop,
    sellItem,
    sellAllToShop,
    getShopItems,
    buyFromShop,
    cleanupExpiredTrades
};
