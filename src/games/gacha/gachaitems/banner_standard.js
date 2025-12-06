/**
 * BANNER STANDARD - Danh sách vật phẩm
 * Banner cơ bản với giá 160 DCoin/pull
 * 
 * Cơ chế UP: 50/50
 * - Khi ra 5★: 50% là UP item, 50% là thua UP
 * - Nếu thua UP → Lần 5★ tiếp theo ĐẢM BẢO là UP item
 * 
 * Cấu trúc:
 * - 1 UP item (5★ LEGENDARY - giá trị cao nhất)
 * - 7 thua UP items (5★ LEGENDARY - giá trị thấp hơn)
 * - Các item 4★ EPIC
 * - Các item 3★ RARE, 2★ UNCOMMON, 1★ COMMON
 */

const BANNER_STANDARD_ITEMS = {
    // ============= VẬT PHẨM UP (FEATURED) =============
    // CÂN BẰNG v4.0: Values adjusted for RTP 95% với sell 100%
    // Cost = 300 DCoin/pull, Target EV = 210 DCoin
    UP_ITEM: {
        name: '🌟 Kiếm Vận Mệnh',
        description: '⭐ VẬT PHẨM UP ⭐ Thanh kiếm huyền thoại mang lại vận may',
        rarity: 'LEGENDARY',
        type: 'COLLECTIBLE',
        base_value: 6696,  // Giảm từ 8000 để balance RTP 95%
        is_featured: true,
        drop_rate: 0.003 // 50% của tổng rate 5★ (0.6%)
    },

    // ============= VẬT PHẨM THUA UP (NON-FEATURED 5★) =============
    // CÂN BẰNG v4.0: Scale ×1.313 để đạt RTP 95%
    // 7 items thua UP - khi thua 50/50 sẽ ra 1 trong số này
    NON_UP_LEGENDARY: [
        {
            name: 'Vương trượng hoàng gia',
            description: 'Vương trượng của vua cờ bạc huyền thoại',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 4596,  // Giảm từ 5500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Ngọc rồng 7 màu',
            description: 'Viên ngọc huyền thoại từ truyền thuyết',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 5252,  // Giảm từ 6200
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Bùa tối thượng',
            description: 'Bùa may mắn tối thượng của các bậc thầy',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 4858,  // Giảm từ 5800
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Bánh xe vận mệnh',
            description: 'Bánh xe cổ xưa định đoạt số phận',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 4596,  // Giảm từ 5500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Hộp Pandora',
            description: 'Hộp thần thoại chứa mọi điều kỳ diệu',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 5515,  // Giảm từ 6500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Mặt nạ huyền bí',
            description: 'Mặt nạ cổ đại đầy quyền năng bí ẩn',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 5055,  // Giảm từ 6000
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Bình rượu thần',
            description: 'Bình rượu vô tận từ truyền thuyết xa xưa',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 5909,  // Giảm từ 7000
            is_featured: false,
            drop_rate: 0.000429
        }
    ],

    // ============= VẬT PHẨM 4★ EPIC =============
    // CÂN BẰNG v4.0: Scale ×1.313 để đạt RTP 95%
    EPIC_ITEMS: [
        {
            name: 'Vương miện may mắn',
            description: 'Vương miện dát vàng mang lại may mắn',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 722,  // Giảm từ 850
            is_featured: false,
            drop_rate: 0.0102
        },
        {
            name: 'Chip casino kim cương',
            description: 'Chip casino nạm kim cương quý giá',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 840,  // Giảm từ 1000
            is_featured: false,
            drop_rate: 0.0102
        },
        {
            name: 'Bộ bài huyền thoại',
            description: 'Bộ bài từ thời cổ đại đầy bí ẩn',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 919,  // Giảm từ 1100
            is_featured: false,
            drop_rate: 0.0102
        },
        {
            name: 'Hộp bí ẩn vàng',
            description: 'Hộp vàng ròng chứa báu vật quý giá',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1011,  // Giảm từ 1200
            is_featured: false,
            drop_rate: 0.0102
        },
        {
            name: 'Khối rubik may mắn',
            description: 'Rubik 7 màu huyền bí đầy phép thuật',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 801,  // Giảm từ 950
            is_featured: false,
            drop_rate: 0.0102
        }
    ],

    // ============= VẬT PHẨM 3★ RARE =============
    // CÂN BẰNG v4.0: Scale ×1.313 để đạt RTP 95%
    RARE_ITEMS: [
        {
            name: 'Horseshoe vàng',
            description: 'Móng ngựa vàng may mắn từ phương Tây',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 171,  // Giảm từ 200
            is_featured: false,
            drop_rate: 0.03
        },
        {
            name: 'Chip casino vàng',
            description: 'Chip casino bằng vàng nguyên chất',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 210,  // Giảm từ 250
            is_featured: false,
            drop_rate: 0.03
        },
        {
            name: 'Xúc xắc pha lê',
            description: 'Xúc xắc bằng pha lê trong suốt',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 197,  // Giảm từ 230
            is_featured: false,
            drop_rate: 0.03
        },
        {
            name: 'Bùa thần may mắn',
            description: 'Bùa may mắn cấp cao từ đền thờ',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 230,  // Giảm từ 270
            is_featured: false,
            drop_rate: 0.03
        },
        {
            name: 'Hộp bí ẩn bạc',
            description: 'Hộp bạc sáng bóng chứa điều kỳ diệu',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 236,  // Giảm từ 280
            is_featured: false,
            drop_rate: 0.03
        }
    ],

    // ============= VẬT PHẨM 2★ UNCOMMON =============
    // CÂN BẰNG v4.0: Scale ×1.313 để đạt RTP 95%
    UNCOMMON_ITEMS: [
        {
            name: 'Bùa hộ mệnh',
            description: 'Bùa mang lại may mắn nhỏ hàng ngày',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 55,  // Giảm từ 65
            is_featured: false,
            drop_rate: 0.058 // 29% / 5 items
        },
        {
            name: 'Hộp bí ẩn nhỏ',
            description: 'Hộp nhỏ chứa điều bất ngờ',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 63,  // Giảm từ 75
            is_featured: false,
            drop_rate: 0.058
        },
        {
            name: 'Chip casino bạc',
            description: 'Chip casino bằng bạc sáng bóng',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 76,  // Giảm từ 90
            is_featured: false,
            drop_rate: 0.058
        },
        {
            name: 'Bộ bài mini',
            description: 'Bộ bài 52 lá mini nhỏ gọn',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 68,  // Giảm từ 80
            is_featured: false,
            drop_rate: 0.058
        },
        {
            name: 'Cỏ 4 lá',
            description: 'Cỏ 4 lá hiếm mang lại may mắn',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 59,  // Giảm từ 70
            is_featured: false,
            drop_rate: 0.058
        }
    ],

    // ============= VẬT PHẨM 1★ COMMON =============
    // CÂN BẰNG v4.0: Scale ×1.313 để đạt RTP 95%
    COMMON_ITEMS: [
        {
            name: 'Đồng xu may mắn',
            description: 'Một đồng xu cũ nhưng may mắn',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 17,  // Giảm từ 20
            is_featured: false,
            drop_rate: 0.10 // 50% / 5 items
        },
        {
            name: 'Lá bài cũ',
            description: 'Một lá bài từ bộ bài cũ kỹ',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 17,  // Giảm từ 20
            is_featured: false,
            drop_rate: 0.10
        },
        {
            name: 'Xúc xắc may mắn',
            description: 'Xúc xắc 6 mặt bằng gỗ thông thường',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 21,  // Giảm từ 25
            is_featured: false,
            drop_rate: 0.10
        },
        {
            name: 'Chip casino đồng',
            description: 'Chip casino bằng đồng đơn giản',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 25,  // Giảm từ 30
            is_featured: false,
            drop_rate: 0.10
        },
        {
            name: 'Vé số hết hạn',
            description: 'Một tờ vé số đã hết hạn vô giá trị',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 13,  // Giảm từ 15
            is_featured: false,
            drop_rate: 0.10
        }
    ]
};

// Thông tin banner
const BANNER_INFO = {
    name: 'Standard Banner',
    description: 'Banner chuẩn với tất cả items cơ bản',
    banner_type: 'STANDARD',
    cost_per_pull: 160,  // Giảm từ 300 để F2P friendly (~25 ngày cho 5★)
    up_rate: 0.5, // 50/50 system
    
    // Tỷ lệ rarity
    rates: {
        LEGENDARY: 0.006,   // 0.6%
        EPIC: 0.051,        // 5.1%
        RARE: 0.15,         // 15%
        UNCOMMON: 0.29,     // 29%
        COMMON: 0.503       // 50.3% (phần còn lại)
    }
};

/**
 * Lấy tất cả items của banner này
 * @returns {Array} Mảng tất cả items
 */
function getAllItems() {
    const items = [];
    
    // Add UP item
    items.push(BANNER_STANDARD_ITEMS.UP_ITEM);
    
    // Add non-UP legendary
    items.push(...BANNER_STANDARD_ITEMS.NON_UP_LEGENDARY);
    
    // Add EPIC items
    items.push(...BANNER_STANDARD_ITEMS.EPIC_ITEMS);
    
    // Add RARE items
    items.push(...BANNER_STANDARD_ITEMS.RARE_ITEMS);
    
    // Add UNCOMMON items
    items.push(...BANNER_STANDARD_ITEMS.UNCOMMON_ITEMS);
    
    // Add COMMON items
    items.push(...BANNER_STANDARD_ITEMS.COMMON_ITEMS);
    
    return items;
}

/**
 * Lấy UP item của banner
 * @returns {Object} UP item
 */
function getUpItem() {
    return BANNER_STANDARD_ITEMS.UP_ITEM;
}

/**
 * Lấy danh sách items thua UP (non-featured 5★)
 * @returns {Array} Mảng items thua UP
 */
function getNonUpLegendary() {
    return BANNER_STANDARD_ITEMS.NON_UP_LEGENDARY;
}

/**
 * Lấy items theo rarity
 * @param {string} rarity - LEGENDARY, EPIC, RARE, UNCOMMON, COMMON
 * @returns {Array} Mảng items theo rarity
 */
function getItemsByRarity(rarity) {
    switch (rarity) {
        case 'LEGENDARY':
            return [BANNER_STANDARD_ITEMS.UP_ITEM, ...BANNER_STANDARD_ITEMS.NON_UP_LEGENDARY];
        case 'EPIC':
            return BANNER_STANDARD_ITEMS.EPIC_ITEMS;
        case 'RARE':
            return BANNER_STANDARD_ITEMS.RARE_ITEMS;
        case 'UNCOMMON':
            return BANNER_STANDARD_ITEMS.UNCOMMON_ITEMS;
        case 'COMMON':
            return BANNER_STANDARD_ITEMS.COMMON_ITEMS;
        default:
            return [];
    }
}

/**
 * Lấy featured items (UP items) cho rarity cụ thể
 * @param {string} rarity
 * @returns {Array}
 */
function getFeaturedItems(rarity) {
    if (rarity === 'LEGENDARY') {
        return [BANNER_STANDARD_ITEMS.UP_ITEM];
    }
    return [];
}

/**
 * Lấy non-featured items cho rarity cụ thể
 * @param {string} rarity
 * @returns {Array}
 */
function getNonFeaturedItems(rarity) {
    if (rarity === 'LEGENDARY') {
        return BANNER_STANDARD_ITEMS.NON_UP_LEGENDARY;
    }
    return getItemsByRarity(rarity);
}

module.exports = {
    BANNER_INFO,
    BANNER_STANDARD_ITEMS,
    getAllItems,
    getUpItem,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems
};
