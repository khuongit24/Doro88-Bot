/**
 * BANNER TOOL & KIT - Danh sách vật phẩm
 * Banner đặc biệt cho cuốc đào mỏ và cần câu với giá 150 DCoin/pull
 * 
 * Cơ chế UP: 75/25 (ưu đãi hơn 50/50)
 * - Khi ra 5★: 75% là UP item, 25% là thua UP
 * - Nếu thua UP → Lần 5★ tiếp theo ĐẢM BẢO là UP item
 * 
 * Đặc điểm:
 * - Chứa cuốc và cần câu từ UNCOMMON đến LEGENDARY
 * - KHÔNG chứa cuốc gỗ và cần câu tre (item mặc định)
 * - Có thêm vật liệu low-value làm item filler
 */

const BANNER_TOOLKIT_ITEMS = {
    // ============= VẬT PHẨM UP (FEATURED) - 2 item =============
    // CÂN BẰNG v4.0: Tăng values để RTP 95% với sell 100%
    // Tool Kit có 2 UP item (Cuốc Kim Cương và Cần câu Huyền Thoại)
    UP_ITEMS: [
        {
            name: 'Cuốc Kim Cương',
            description: '⭐ VẬT PHẨM UP ⭐ Cuốc huyền thoại nạm kim cương, tăng 35% tỉ lệ quặng hiếm',
            rarity: 'LEGENDARY',
            type: 'EQUIPMENT',
            base_value: 3341,  // Scaled ×0.616 for 70% RTP with 250 cost
            is_featured: true,
            drop_rate: 0.0015, // 50% của rate 5★ chia cho 2 UP items
            tool_type: 'PICKAXE',
            bonus: 0.35 // 35% tỉ lệ quặng hiếm
        },
        {
            name: 'Cần câu Huyền Thoại',
            description: '⭐ VẬT PHẨM UP ⭐ Cần câu thần thoại, tăng 35% tỉ lệ cá hiếm',
            rarity: 'LEGENDARY',
            type: 'EQUIPMENT',
            base_value: 3341,  // Scaled ×0.616 for 70% RTP
            is_featured: true,
            drop_rate: 0.0015,
            tool_type: 'FISHING_ROD',
            bonus: 0.35 // 35% tỉ lệ cá hiếm
        }
    ],

    // ============= VẬT PHẨM THUA UP (NON-FEATURED LEGENDARY) =============
    // CÂN BẰNG v4.0: Tăng values để RTP 95%
    // Vật phẩm LEGENDARY khi thua UP (25% chance khi ra 5★)
    NON_UP_LEGENDARY: [
        {
            name: 'Mảnh Thiên Thạch',
            description: 'Mảnh thiên thạch hiếm từ vũ trụ, chứa năng lượng huyền bí',
            rarity: 'LEGENDARY',
            type: 'MATERIAL',
            base_value: 1670,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.0015
        },
        {
            name: 'Ngọc Rồng Cổ',
            description: 'Ngọc rồng cổ đại chứa sức mạnh huyền bí từ thời thượng cổ',
            rarity: 'LEGENDARY',
            type: 'MATERIAL',
            base_value: 1670,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.0015
        }
    ],

    // ============= VẬT PHẨM 4★ EPIC - Cuốc và Cần câu cao cấp =============
    // CÂN BẰNG v4.0: Tăng values để RTP 95%
    EPIC_ITEMS: [
        {
            name: 'Cuốc Vàng',
            description: 'Cuốc dát vàng sang trọng, tăng 20% tỉ lệ quặng hiếm',
            rarity: 'EPIC',
            type: 'EQUIPMENT',
            base_value: 754,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.03,
            tool_type: 'PICKAXE',
            bonus: 0.20
        },
        {
            name: 'Cần câu Titan',
            description: 'Cần câu titan cao cấp, tăng 20% tỉ lệ cá hiếm',
            rarity: 'EPIC',
            type: 'EQUIPMENT',
            base_value: 754,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.03,
            tool_type: 'FISHING_ROD',
            bonus: 0.20
        }
    ],

    // ============= VẬT PHẨM 3★ RARE - Cuốc và Cần câu trung cấp =============
    // CÂN BẰNG v4.0: Tăng values để RTP 95%
    RARE_ITEMS: [
        {
            name: 'Cuốc Sắt',
            description: 'Cuốc sắt chắc chắn, tăng 10% tỉ lệ quặng hiếm',
            rarity: 'RARE',
            type: 'EQUIPMENT',
            base_value: 333,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.07,
            tool_type: 'PICKAXE',
            bonus: 0.10
        },
        {
            name: 'Cần câu Carbon',
            description: 'Cần câu carbon nhẹ và bền, tăng 10% tỉ lệ cá hiếm',
            rarity: 'RARE',
            type: 'EQUIPMENT',
            base_value: 333,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.07,
            tool_type: 'FISHING_ROD',
            bonus: 0.10
        }
    ],

    // ============= VẬT PHẨM 2★ UNCOMMON - Cuốc và Cần câu cơ bản =============
    // CÂN BẰNG v4.0: Tăng values để RTP 95%
    UNCOMMON_ITEMS: [
        {
            name: 'Cuốc Đá',
            description: 'Cuốc đào mỏ bằng đá, tăng 5% tỉ lệ quặng hiếm',
            rarity: 'UNCOMMON',
            type: 'EQUIPMENT',
            base_value: 117,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.12,
            tool_type: 'PICKAXE',
            bonus: 0.05
        },
        {
            name: 'Cần câu Gỗ',
            description: 'Cần câu gỗ chắc chắn, tăng 5% tỉ lệ cá hiếm',
            rarity: 'UNCOMMON',
            type: 'EQUIPMENT',
            base_value: 117,  // Scaled ×0.616 for 70% RTP
            is_featured: false,
            drop_rate: 0.12,
            tool_type: 'FISHING_ROD',
            bonus: 0.05
        }
    ],

    // ============= VẬT PHẨM 1★ COMMON - Vật liệu filler =============
    // CÂN BẰNG v4.0: Scaled ×0.616 for 70% RTP with 250 cost
    COMMON_ITEMS: [
        {
            name: 'Than đá',
            description: 'Quặng than đá thông thường',
            rarity: 'COMMON',
            type: 'MATERIAL',
            base_value: 30,  // Scaled ×0.616
            is_featured: false,
            drop_rate: 0.08
        },
        {
            name: 'Quặng đồng',
            description: 'Quặng đồng có màu nâu đỏ',
            rarity: 'COMMON',
            type: 'MATERIAL',
            base_value: 46,  // Scaled ×0.616
            is_featured: false,
            drop_rate: 0.08
        },
        {
            name: 'Cá nhỏ',
            description: 'Cá nhỏ thông thường',
            rarity: 'COMMON',
            type: 'MATERIAL',
            base_value: 30,  // Scaled ×0.616
            is_featured: false,
            drop_rate: 0.08
        },
        {
            name: 'Cá mòi',
            description: 'Cá mòi tươi ngon',
            rarity: 'COMMON',
            type: 'MATERIAL',
            base_value: 38,  // Scaled ×0.616
            is_featured: false,
            drop_rate: 0.08
        },
        {
            name: 'Dây thừng',
            description: 'Dây thừng để sửa chữa công cụ',
            rarity: 'COMMON',
            type: 'MATERIAL',
            base_value: 46,  // Scaled ×0.616
            is_featured: false,
            drop_rate: 0.08
        }
    ]
};

// Thông tin banner
const BANNER_INFO = {
    name: 'Tool & Kit Banner',
    description: 'Banner đặc biệt cho cuốc đào mỏ và cần câu. Cơ chế UP: 75/25',
    banner_type: 'TOOL_KIT',
    cost_per_pull: 120,  // Giảm từ 250 (~19 ngày cho 5★)
    up_rate: 0.75, // 75/25 system - ưu đãi hơn 50/50

    // Tỷ lệ rarity
    rates: {
        LEGENDARY: 0.003,   // 0.3% (chia đều cho 2 UP items)
        EPIC: 0.06,         // 6%
        RARE: 0.14,         // 14%
        UNCOMMON: 0.24,     // 24%
        COMMON: 0.557       // 55.7% (phần còn lại)
    }
};

/**
 * Lấy tất cả items của banner này
 * @returns {Array}
 */
function getAllItems() {
    const items = [];
    items.push(...BANNER_TOOLKIT_ITEMS.UP_ITEMS);
    items.push(...BANNER_TOOLKIT_ITEMS.EPIC_ITEMS);
    items.push(...BANNER_TOOLKIT_ITEMS.RARE_ITEMS);
    items.push(...BANNER_TOOLKIT_ITEMS.UNCOMMON_ITEMS);
    items.push(...BANNER_TOOLKIT_ITEMS.COMMON_ITEMS);
    return items;
}

/**
 * Lấy UP items của banner (có 2 items)
 * @returns {Array}
 */
function getUpItems() {
    return BANNER_TOOLKIT_ITEMS.UP_ITEMS;
}

/**
 * Lấy UP item ngẫu nhiên (vì có 2 UP items)
 * @returns {Object}
 */
function getUpItem() {
    const upItems = BANNER_TOOLKIT_ITEMS.UP_ITEMS;
    return upItems[Math.floor(Math.random() * upItems.length)];
}

/**
 * Lấy danh sách items thua UP (Mảnh Thiên Thạch và Ngọc Rồng Cổ)
 * @returns {Array}
 */
function getNonUpLegendary() {
    return BANNER_TOOLKIT_ITEMS.NON_UP_LEGENDARY || [];
}

/**
 * Lấy items theo rarity
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(rarity) {
    switch (rarity) {
        case 'LEGENDARY':
            return BANNER_TOOLKIT_ITEMS.UP_ITEMS;
        case 'EPIC':
            return BANNER_TOOLKIT_ITEMS.EPIC_ITEMS;
        case 'RARE':
            return BANNER_TOOLKIT_ITEMS.RARE_ITEMS;
        case 'UNCOMMON':
            return BANNER_TOOLKIT_ITEMS.UNCOMMON_ITEMS;
        case 'COMMON':
            return BANNER_TOOLKIT_ITEMS.COMMON_ITEMS;
        default:
            return [];
    }
}

/**
 * Lấy featured items
 * @param {string} rarity
 * @returns {Array}
 */
function getFeaturedItems(rarity) {
    if (rarity === 'LEGENDARY') {
        return BANNER_TOOLKIT_ITEMS.UP_ITEMS;
    }
    return [];
}

/**
 * Lấy non-featured items
 * @param {string} rarity
 * @returns {Array}
 */
function getNonFeaturedItems(rarity) {
    // Tool Kit không có non-featured LEGENDARY
    if (rarity === 'LEGENDARY') {
        return [];
    }
    return getItemsByRarity(rarity);
}

/**
 * Lấy các công cụ (pickaxe hoặc fishing rod)
 * @param {string} toolType - 'PICKAXE' hoặc 'FISHING_ROD'
 * @returns {Array}
 */
function getToolsByType(toolType) {
    const allItems = getAllItems();
    return allItems.filter(item => item.tool_type === toolType);
}

/**
 * Kiểm tra xem banner này có hỗ trợ 75/25 không
 * @returns {boolean}
 */
function isEnhancedUpRate() {
    return true;
}

module.exports = {
    BANNER_INFO,
    BANNER_TOOLKIT_ITEMS,
    getAllItems,
    getUpItem,
    getUpItems,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems,
    getToolsByType,
    isEnhancedUpRate
};
