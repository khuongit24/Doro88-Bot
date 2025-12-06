/**
 * BANNER LUXURY - Danh sách vật phẩm
 * Banner xa xỉ cao cấp nhất với giá 500 DCoin/pull
 * 
 * Cơ chế UP: 50/50
 * - Khi ra 5★: 50% là UP item, 50% là thua UP
 * - Nếu thua UP → Lần 5★ tiếp theo ĐẢM BẢO là UP item
 * 
 * Đặc điểm:
 * - Vật phẩm UP có giá trị CỰC CAO (cao nhất game)
 * - Tỷ lệ ra EPIC và LEGENDARY cao nhất
 * - Vật phẩm theo chủ đề "Vũ Trụ & Vĩnh Hằng"
 */

const BANNER_LUXURY_ITEMS = {
    // ============= VẬT PHẨM UP (FEATURED) =============
    // CÂN BẰNG v4.0: RTP 95% - User feel good khi gacha!
    // Cost = 1200 DCoin/pull, Target EV = 1140 DCoin (95%)
    UP_ITEM: {
        name: '💎 Ngọc Trai Vũ Trụ',
        description: '⭐ VẬT PHẨM UP ⭐ Viên ngọc trai chứa đựng cả vũ trụ bên trong',
        rarity: 'LEGENDARY',
        type: 'COLLECTIBLE',
        base_value: 33270,  // ×1.358 for 95% RTP
        is_featured: true,
        drop_rate: 0.003
    },

    // ============= VẬT PHẨM THUA UP (NON-FEATURED 5★) =============
    // CÂN BẰNG v4.0: RTP 95% - User feel good!
    NON_UP_LEGENDARY: [
        {
            name: 'Trái Tim Ngôi Sao',
            description: 'Trái tim của một ngôi sao đã chết, chứa năng lượng vô tận',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 20910,  // ×1.358 for 95% RTP
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Mảnh Thiên Thạch Vàng',
            description: 'Mảnh thiên thạch quý hiếm từ rìa vũ trụ',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 22810,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Chuỗi Hạt Ngân Hà',
            description: 'Chuỗi hạt chứa các thiên hà thu nhỏ',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 24720,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Áo Choàng Thời Không',
            description: 'Áo choàng có thể bẻ cong không gian và thời gian',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 26620,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Găng Tay Vô Cực',
            description: 'Găng tay có thể điều khiển các nguyên tố vũ trụ',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 28520,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Đá Vĩnh Hằng',
            description: 'Viên đá từ thuở khai thiên lập địa',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 21860,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'La Bàn Định Mệnh',
            description: 'La bàn chỉ hướng tới số phận của bạn',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 19960,  // ×1.358
            is_featured: false,
            drop_rate: 0.000429
        }
    ],

    // ============= VẬT PHẨM 4★ EPIC =============
    // CÂN BẰNG v4.0: RTP 95%
    EPIC_ITEMS: [
        {
            name: 'Mảnh Sao Băng',
            description: 'Mảnh vỡ từ một ngôi sao băng',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 2660,  // ×1.358 for 95% RTP
            is_featured: false,
            drop_rate: 0.024
        },
        {
            name: 'Bụi Thiên Hà',
            description: 'Bụi lấp lánh từ thiên hà xa xôi',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 2470,  // ×1.358
            is_featured: false,
            drop_rate: 0.024
        },
        {
            name: 'Tinh Thể Mặt Trời',
            description: 'Tinh thể kết tinh từ ánh sáng mặt trời',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 2850,  // ×1.358
            is_featured: false,
            drop_rate: 0.024
        },
        {
            name: 'Lông Vũ Thiên Thần',
            description: 'Lông vũ từ một thiên thần huyền thoại',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 3040,  // ×1.358
            is_featured: false,
            drop_rate: 0.024
        },
        {
            name: 'Nước Mắt Phượng Hoàng',
            description: 'Giọt nước mắt có sức chữa lành của phượng hoàng',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 2950,  // ×1.358
            is_featured: false,
            drop_rate: 0.024
        }
    ],

    // ============= VẬT PHẨM 3★ RARE =============
    // CÂN BẰNG v4.0: RTP 95%
    RARE_ITEMS: [
        {
            name: 'Hồng Ngọc Sao',
            description: 'Hồng ngọc với ngôi sao bên trong',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 860,  // ×1.358 for 95% RTP
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Thạch Anh Tím',
            description: 'Thạch anh tím có năng lượng chữa lành',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 800,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Ngọc Bích Hoàn Hảo',
            description: 'Viên ngọc bích không tì vết',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 920,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Ngọc Lam Thiên',
            description: 'Ngọc lam màu xanh trời trong vắt',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 736,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Hoàng Ngọc Quý',
            description: 'Viên hoàng ngọc vàng rực rỡ',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 982,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        }
    ],

    // ============= VẬT PHẨM 2★ UNCOMMON =============
    // CÂN BẰNG v4.0: RTP 95%
    UNCOMMON_ITEMS: [
        {
            name: 'Mảnh Kim Loại Ngoài Hành Tinh',
            description: 'Kim loại không tìm thấy trên Trái Đất',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 197,  // ×1.358 for 95% RTP
            is_featured: false,
            drop_rate: 0.045
        },
        {
            name: 'Tinh Thể Tuyết Vĩnh Cửu',
            description: 'Tinh thể tuyết không bao giờ tan',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 185,  // ×1.358
            is_featured: false,
            drop_rate: 0.045
        },
        {
            name: 'Cát Vàng Từ Sao Hỏa',
            description: 'Cát vàng đỏ từ hành tinh đỏ',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 160,  // ×1.358
            is_featured: false,
            drop_rate: 0.045
        },
        {
            name: 'Đá Phát Quang',
            description: 'Viên đá tự phát sáng trong đêm',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 172,  // ×1.358
            is_featured: false,
            drop_rate: 0.045
        },
        {
            name: 'Thủy Tinh Biển',
            description: 'Thủy tinh hình thành từ cát biển',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 166,  // ×1.358
            is_featured: false,
            drop_rate: 0.045
        }
    ],

    // ============= VẬT PHẨM 1★ COMMON =============
    // CÂN BẰNG v4.0: RTP 95%
    COMMON_ITEMS: [
        {
            name: 'Sỏi Từ Mặt Trăng',
            description: 'Viên sỏi nhỏ từ mặt trăng',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 68,  // ×1.358 for 95% RTP
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Bụi Sao',
            description: 'Bụi lấp lánh từ các ngôi sao',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 56,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Mảnh Băng Vệ Tinh',
            description: 'Mảnh băng từ vệ tinh Europa',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 61,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Hạt Cát Vũ Trụ',
            description: 'Hạt cát siêu nhỏ từ vũ trụ',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 49,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        },
        {
            name: 'Mảnh Kim Cương Thô',
            description: 'Mảnh kim cương chưa mài giũa',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 73,  // ×1.358
            is_featured: false,
            drop_rate: 0.05
        }
    ]
};

// Thông tin banner
const BANNER_INFO = {
    name: 'Luxury Banner',
    description: 'Banner xa xỉ cao cấp nhất với vật phẩm chủ đề Vũ Trụ & Vĩnh Hằng',
    banner_type: 'LUXURY',
    cost_per_pull: 500,  // Giảm từ 1200 (~78 ngày cho 5★)
    up_rate: 0.5, // 50/50 system
    
    // Tỷ lệ rarity (cao nhất trong tất cả banner)
    rates: {
        LEGENDARY: 0.006,   // 0.6%
        EPIC: 0.12,         // 12%
        RARE: 0.25,         // 25%
        UNCOMMON: 0.225,    // 22.5%
        COMMON: 0.399       // 39.9% (phần còn lại)
    }
};

/**
 * Lấy tất cả items của banner này
 * @returns {Array}
 */
function getAllItems() {
    const items = [];
    items.push(BANNER_LUXURY_ITEMS.UP_ITEM);
    items.push(...BANNER_LUXURY_ITEMS.NON_UP_LEGENDARY);
    items.push(...BANNER_LUXURY_ITEMS.EPIC_ITEMS);
    items.push(...BANNER_LUXURY_ITEMS.RARE_ITEMS);
    items.push(...BANNER_LUXURY_ITEMS.UNCOMMON_ITEMS);
    items.push(...BANNER_LUXURY_ITEMS.COMMON_ITEMS);
    return items;
}

/**
 * Lấy UP item của banner
 * @returns {Object}
 */
function getUpItem() {
    return BANNER_LUXURY_ITEMS.UP_ITEM;
}

/**
 * Lấy danh sách items thua UP
 * @returns {Array}
 */
function getNonUpLegendary() {
    return BANNER_LUXURY_ITEMS.NON_UP_LEGENDARY;
}

/**
 * Lấy items theo rarity
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(rarity) {
    switch (rarity) {
        case 'LEGENDARY':
            return [BANNER_LUXURY_ITEMS.UP_ITEM, ...BANNER_LUXURY_ITEMS.NON_UP_LEGENDARY];
        case 'EPIC':
            return BANNER_LUXURY_ITEMS.EPIC_ITEMS;
        case 'RARE':
            return BANNER_LUXURY_ITEMS.RARE_ITEMS;
        case 'UNCOMMON':
            return BANNER_LUXURY_ITEMS.UNCOMMON_ITEMS;
        case 'COMMON':
            return BANNER_LUXURY_ITEMS.COMMON_ITEMS;
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
        return [BANNER_LUXURY_ITEMS.UP_ITEM];
    }
    return [];
}

/**
 * Lấy non-featured items
 * @param {string} rarity
 * @returns {Array}
 */
function getNonFeaturedItems(rarity) {
    if (rarity === 'LEGENDARY') {
        return BANNER_LUXURY_ITEMS.NON_UP_LEGENDARY;
    }
    return getItemsByRarity(rarity);
}

module.exports = {
    BANNER_INFO,
    BANNER_LUXURY_ITEMS,
    getAllItems,
    getUpItem,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems
};
