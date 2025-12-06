/**
 * BANNER PREMIUM - Danh sách vật phẩm
 * Banner cao cấp với giá 250 DCoin/pull
 * 
 * Cơ chế UP: 50/50
 * - Khi ra 5★: 50% là UP item, 50% là thua UP
 * - Nếu thua UP → Lần 5★ tiếp theo ĐẢM BẢO là UP item
 * 
 * Đặc điểm:
 * - Vật phẩm UP có giá trị RẤT CAO
 * - Tỷ lệ ra EPIC và LEGENDARY cao hơn Limited
 * - Vật phẩm theo chủ đề "Hoàng Gia & Quyền Lực"
 */

const BANNER_PREMIUM_ITEMS = {
    // ============= VẬT PHẨM UP (FEATURED) =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95% với sell 100%
    // Cost = 600 DCoin/pull, Target EV = 420 DCoin
    UP_ITEM: {
        name: '👑 Vương Miện Bất Tử',
        description: '⭐ VẬT PHẨM UP ⭐ Vương miện huyền thoại của vị vua bất tử',
        rarity: 'LEGENDARY',
        type: 'COLLECTIBLE',
        base_value: 16095,  // Tăng từ 8000 (×1.55)
        is_featured: true,
        drop_rate: 0.003
    },

    // ============= VẬT PHẨM THUA UP (NON-FEATURED 5★) =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95%
    NON_UP_LEGENDARY: [
        {
            name: 'Ngọc Tỷ Hoàng Đế',
            description: 'Ngọc tỷ của hoàng đế cổ đại với quyền lực tuyệt đối',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 11033,  // Tăng từ 5500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Áo Giáp Rồng Vàng',
            description: 'Áo giáp làm từ vảy rồng vàng huyền thoại',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 12071,  // Tăng từ 6000
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Thanh Gươm Ánh Sáng',
            description: 'Thanh gươm phát sáng có thể chém tan bóng tối',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 11682,  // Tăng từ 5800
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Ngai Vàng Thu Nhỏ',
            description: 'Mô hình thu nhỏ của ngai vàng hoàng gia',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 10514,  // Tăng từ 5200
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Cung Tên Ánh Trăng',
            description: 'Cung tên được ban phước từ nữ thần mặt trăng',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 11293,  // Tăng từ 5600
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Khiên Phượng Hoàng',
            description: 'Khiên được rèn từ lửa phượng hoàng',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 11812,  // Tăng từ 5900
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Vòng Cổ Sao Băng',
            description: 'Vòng cổ chứa mảnh vỡ từ sao băng cổ đại',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 12461,  // Tăng từ 6200
            is_featured: false,
            drop_rate: 0.000429
        }
    ],

    // ============= VẬT PHẨM 4★ EPIC =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95%
    EPIC_ITEMS: [
        {
            name: 'Nhẫn Hoàng Tộc',
            description: 'Nhẫn gia truyền của hoàng tộc',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1408,  // Tăng từ 700
            is_featured: false,
            drop_rate: 0.018
        },
        {
            name: 'Vương Hốt Ngà',
            description: 'Vương hốt bằng ngà voi quý hiếm',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1610,  // Tăng từ 800
            is_featured: false,
            drop_rate: 0.018
        },
        {
            name: 'Mề Đay Chiến Công',
            description: 'Mề đay trao cho những chiến binh anh hùng',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1311,  // Tăng từ 650
            is_featured: false,
            drop_rate: 0.018
        },
        {
            name: 'Bảo Kiếm Hộ Mệnh',
            description: 'Bảo kiếm bảo vệ chủ nhân khỏi tai họa',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1811,  // Tăng từ 900
            is_featured: false,
            drop_rate: 0.018
        },
        {
            name: 'Ngọc Bội Rồng',
            description: 'Ngọc bội khắc hình rồng thiêng',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1512,  // Tăng từ 750
            is_featured: false,
            drop_rate: 0.018
        }
    ],

    // ============= VẬT PHẨM 3★ RARE =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95%
    RARE_ITEMS: [
        {
            name: 'Quạt Hoàng Hậu',
            description: 'Quạt lụa của hoàng hậu đương triều',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 363,  // Tăng từ 180
            is_featured: false,
            drop_rate: 0.04
        },
        {
            name: 'Trâm Cài Vàng',
            description: 'Trâm cài tóc bằng vàng ròng',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 402,  // Tăng từ 200
            is_featured: false,
            drop_rate: 0.04
        },
        {
            name: 'Bình Hoa Hoàng Gia',
            description: 'Bình hoa cổ từ cung điện hoàng gia',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 325,  // Tăng từ 160
            is_featured: false,
            drop_rate: 0.04
        },
        {
            name: 'Thư Pháp Cổ',
            description: 'Bức thư pháp của danh nhân',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 383,  // Tăng từ 190
            is_featured: false,
            drop_rate: 0.04
        },
        {
            name: 'Hộp Đựng Châu Báu',
            description: 'Hộp gỗ quý dùng cất giữ châu báu',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 441,  // Tăng từ 220
            is_featured: false,
            drop_rate: 0.04
        }
    ],

    // ============= VẬT PHẨM 2★ UNCOMMON =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95%
    UNCOMMON_ITEMS: [
        {
            name: 'Túi Gấm',
            description: 'Túi gấm thêu hoa văn đẹp',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 110,  // Tăng từ 55
            is_featured: false,
            drop_rate: 0.052
        },
        {
            name: 'Bút Lông Cao Cấp',
            description: 'Bút lông dùng viết chiếu chỉ',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 96,  // Tăng từ 48
            is_featured: false,
            drop_rate: 0.052
        },
        {
            name: 'Mực Tàu Thượng Hạng',
            description: 'Mực tàu chất lượng cao',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 91,  // Tăng từ 45
            is_featured: false,
            drop_rate: 0.052
        },
        {
            name: 'Giấy Dó Cung Đình',
            description: 'Giấy dó dùng trong cung đình',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 80,  // Tăng từ 40
            is_featured: false,
            drop_rate: 0.052
        },
        {
            name: 'Nến Sáp Ong',
            description: 'Nến làm từ sáp ong nguyên chất',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 105,  // Tăng từ 52
            is_featured: false,
            drop_rate: 0.052
        }
    ],

    // ============= VẬT PHẨM 1★ COMMON =============
    // CÂN BẰNG v4.0: Scale ×1.298 để đạt RTP 95%
    COMMON_ITEMS: [
        {
            name: 'Xu Đồng Cổ',
            description: 'Đồng xu cổ từ thời hoàng gia',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 32,  // Tăng từ 16
            is_featured: false,
            drop_rate: 0.06
        },
        {
            name: 'Mảnh Gốm Sứ',
            description: 'Mảnh vỡ từ đồ gốm sứ cổ',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 26,  // Tăng từ 13
            is_featured: false,
            drop_rate: 0.06
        },
        {
            name: 'Vải Lụa Cũ',
            description: 'Mảnh vải lụa cũ kỹ nhưng quý',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 29,  // Tăng từ 14
            is_featured: false,
            drop_rate: 0.06
        },
        {
            name: 'Hạt Ngọc Trai Nhỏ',
            description: 'Hạt ngọc trai nhỏ xinh xắn',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 36,  // Tăng từ 18
            is_featured: false,
            drop_rate: 0.06
        },
        {
            name: 'Móc Khóa Cổ',
            description: 'Móc khóa bằng đồng cổ xưa',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 22,  // Tăng từ 11
            is_featured: false,
            drop_rate: 0.06
        }
    ]
};

// Thông tin banner
const BANNER_INFO = {
    name: 'Premium Banner',
    description: 'Banner cao cấp với vật phẩm chủ đề Hoàng Gia & Quyền Lực',
    banner_type: 'PREMIUM',
    cost_per_pull: 280,  // Giảm từ 600 (~44 ngày cho 5★)
    up_rate: 0.5, // 50/50 system
    
    // Tỷ lệ rarity (cao hơn Limited)
    rates: {
        LEGENDARY: 0.006,   // 0.6%
        EPIC: 0.09,         // 9%
        RARE: 0.20,         // 20%
        UNCOMMON: 0.26,     // 26%
        COMMON: 0.444       // 44.4% (phần còn lại)
    }
};

/**
 * Lấy tất cả items của banner này
 * @returns {Array}
 */
function getAllItems() {
    const items = [];
    items.push(BANNER_PREMIUM_ITEMS.UP_ITEM);
    items.push(...BANNER_PREMIUM_ITEMS.NON_UP_LEGENDARY);
    items.push(...BANNER_PREMIUM_ITEMS.EPIC_ITEMS);
    items.push(...BANNER_PREMIUM_ITEMS.RARE_ITEMS);
    items.push(...BANNER_PREMIUM_ITEMS.UNCOMMON_ITEMS);
    items.push(...BANNER_PREMIUM_ITEMS.COMMON_ITEMS);
    return items;
}

/**
 * Lấy UP item của banner
 * @returns {Object}
 */
function getUpItem() {
    return BANNER_PREMIUM_ITEMS.UP_ITEM;
}

/**
 * Lấy danh sách items thua UP
 * @returns {Array}
 */
function getNonUpLegendary() {
    return BANNER_PREMIUM_ITEMS.NON_UP_LEGENDARY;
}

/**
 * Lấy items theo rarity
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(rarity) {
    switch (rarity) {
        case 'LEGENDARY':
            return [BANNER_PREMIUM_ITEMS.UP_ITEM, ...BANNER_PREMIUM_ITEMS.NON_UP_LEGENDARY];
        case 'EPIC':
            return BANNER_PREMIUM_ITEMS.EPIC_ITEMS;
        case 'RARE':
            return BANNER_PREMIUM_ITEMS.RARE_ITEMS;
        case 'UNCOMMON':
            return BANNER_PREMIUM_ITEMS.UNCOMMON_ITEMS;
        case 'COMMON':
            return BANNER_PREMIUM_ITEMS.COMMON_ITEMS;
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
        return [BANNER_PREMIUM_ITEMS.UP_ITEM];
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
        return BANNER_PREMIUM_ITEMS.NON_UP_LEGENDARY;
    }
    return getItemsByRarity(rarity);
}

module.exports = {
    BANNER_INFO,
    BANNER_PREMIUM_ITEMS,
    getAllItems,
    getUpItem,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems
};
