/**
 * BANNER LIMITED - Danh sách vật phẩm
 * Banner giới hạn thời gian với giá 200 DCoin/pull
 * 
 * Cơ chế UP: 50/50
 * - Khi ra 5★: 50% là UP item, 50% là thua UP
 * - Nếu thua UP → Lần 5★ tiếp theo ĐẢM BẢO là UP item
 * 
 * Đặc điểm:
 * - Vật phẩm UP có giá trị CAO HƠN Standard
 * - Tỷ lệ ra EPIC và LEGENDARY cao hơn một chút
 * - Vật phẩm theo chủ đề "Tiên tri & Huyền bí"
 */

const BANNER_LIMITED_ITEMS = {
    // ============= VẬT PHẨM UP (FEATURED) =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95% với sell 100%
    // Cost = 400 DCoin/pull, Target EV = 280 DCoin
    UP_ITEM: {
        name: '🔮 Quả Cầu Tiên Tri',
        description: '⭐ VẬT PHẨM UP ⭐ Quả cầu thần bí có thể nhìn thấy tương lai',
        rarity: 'LEGENDARY',
        type: 'COLLECTIBLE',
        base_value: 10002,  // Giảm từ 10000 (×0.77)
        is_featured: true,
        drop_rate: 0.003
    },

    // ============= VẬT PHẨM THUA UP (NON-FEATURED 5★) =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95%
    NON_UP_LEGENDARY: [
        {
            name: 'Gương Thần Kỳ',
            description: 'Gương cổ xưa phản chiếu linh hồn người nhìn',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 6495,  // Giảm từ 6500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Sách Pháp Thuật Cổ',
            description: 'Cuốn sách chứa đựng tri thức từ thời đại đã mất',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 7015,  // Giảm từ 7000
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Đồng Hồ Thời Gian',
            description: 'Đồng hồ huyền bí có thể điều khiển dòng chảy thời gian',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 7534,  // Giảm từ 7500
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Bàn Cơ Linh Hồn',
            description: 'Bàn cơ giao tiếp với thế giới bên kia',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 6235,  // Giảm từ 6200
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Ngọc Mắt Rồng',
            description: 'Viên ngọc mắt của rồng cổ đại có khả năng tiên tri',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 8054,  // Giảm từ 8000
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Cây Đũa Phép',
            description: 'Đũa phép của phù thủy huyền thoại',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 6755,  // Giảm từ 6800
            is_featured: false,
            drop_rate: 0.000429
        },
        {
            name: 'Bình Đựng Linh Hồn',
            description: 'Bình cổ xưa giam giữ những linh hồn mạnh mẽ',
            rarity: 'LEGENDARY',
            type: 'COLLECTIBLE',
            base_value: 7145,  // Giảm từ 7200
            is_featured: false,
            drop_rate: 0.000429
        }
    ],

    // ============= VẬT PHẨM 4★ EPIC =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95%
    EPIC_ITEMS: [
        {
            name: 'Lá Bài Tarot Huyền Bí',
            description: 'Bộ bài Tarot có thể tiên đoán số phận',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 948,  // Giảm từ 950
            is_featured: false,
            drop_rate: 0.015
        },
        {
            name: 'Thủy Tinh Cầu Nhỏ',
            description: 'Quả cầu thủy tinh mini để xem bói',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1052,  // Giảm từ 1050
            is_featured: false,
            drop_rate: 0.015
        },
        {
            name: 'Bùa Trừ Tà',
            description: 'Bùa có sức mạnh xua đuổi tà ma',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 883,  // Giảm từ 880
            is_featured: false,
            drop_rate: 0.015
        },
        {
            name: 'Nhẫn Phù Thủy',
            description: 'Nhẫn tăng cường sức mạnh phép thuật',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1156,  // Giảm từ 1150
            is_featured: false,
            drop_rate: 0.015
        },
        {
            name: 'Áo Choàng Bóng Đêm',
            description: 'Áo choàng có thể hòa mình vào bóng tối',
            rarity: 'EPIC',
            type: 'COLLECTIBLE',
            base_value: 1195,  // Giảm từ 1200
            is_featured: false,
            drop_rate: 0.015
        }
    ],

    // ============= VẬT PHẨM 3★ RARE =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95%
    RARE_ITEMS: [
        {
            name: 'Nến Huyền Bí',
            description: 'Nến không bao giờ tắt khi thắp',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 247,  // Giảm từ 250
            is_featured: false,
            drop_rate: 0.035
        },
        {
            name: 'Rune Cổ Đại',
            description: 'Viên đá khắc chữ rune bí ẩn',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 299,  // Giảm từ 300
            is_featured: false,
            drop_rate: 0.035
        },
        {
            name: 'Mực Viết Tàng Hình',
            description: 'Mực viết chỉ hiện ra dưới ánh trăng',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 221,  // Giảm từ 220
            is_featured: false,
            drop_rate: 0.035
        },
        {
            name: 'Hộp Nhạc Ma Quái',
            description: 'Hộp nhạc phát ra giai điệu ám ảnh',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 279,  // Giảm từ 280
            is_featured: false,
            drop_rate: 0.035
        },
        {
            name: 'Chìa Khóa Bí Mật',
            description: 'Chìa khóa có thể mở mọi ổ khóa',
            rarity: 'RARE',
            type: 'COLLECTIBLE',
            base_value: 318,  // Giảm từ 320
            is_featured: false,
            drop_rate: 0.035
        }
    ],

    // ============= VẬT PHẨM 2★ UNCOMMON =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95%
    UNCOMMON_ITEMS: [
        {
            name: 'Đá Mặt Trăng',
            description: 'Viên đá phát sáng dưới ánh trăng',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 75,  // Giảm từ 75
            is_featured: false,
            drop_rate: 0.055
        },
        {
            name: 'Bột Phép Thuật',
            description: 'Bột lấp lánh dùng trong phép thuật',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 65,  // Giảm từ 65
            is_featured: false,
            drop_rate: 0.055
        },
        {
            name: 'Lông Vũ Phượng Hoàng',
            description: 'Lông vũ từ một con phượng hoàng trẻ',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 95,  // Giảm từ 95
            is_featured: false,
            drop_rate: 0.055
        },
        {
            name: 'Thuốc Ngủ Nhẹ',
            description: 'Lọ thuốc giúp ngủ ngon và mơ đẹp',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 70,  // Giảm từ 70
            is_featured: false,
            drop_rate: 0.055
        },
        {
            name: 'Tranh Vẽ Bí Ẩn',
            description: 'Bức tranh thay đổi theo thời gian',
            rarity: 'UNCOMMON',
            type: 'COLLECTIBLE',
            base_value: 84,  // Giảm từ 85
            is_featured: false,
            drop_rate: 0.055
        }
    ],

    // ============= VẬT PHẨM 1★ COMMON =============
    // CÂN BẰNG v4.0: Scale ×1.299 để đạt RTP 95%
    COMMON_ITEMS: [
        {
            name: 'Nến Thơm',
            description: 'Nến thơm với mùi hương dễ chịu',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 25,  // Giảm từ 25
            is_featured: false,
            drop_rate: 0.07
        },
        {
            name: 'Sỏi May Mắn',
            description: 'Viên sỏi nhỏ xinh được cho là may mắn',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 19,  // Giảm từ 20
            is_featured: false,
            drop_rate: 0.07
        },
        {
            name: 'Vỏ Ốc Biển',
            description: 'Vỏ ốc có thể nghe tiếng sóng biển',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 22,  // Giảm từ 22
            is_featured: false,
            drop_rate: 0.07
        },
        {
            name: 'Bút Lông Ngỗng',
            description: 'Bút lông để viết những lá thư cổ điển',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 19,  // Giảm từ 20
            is_featured: false,
            drop_rate: 0.07
        },
        {
            name: 'Giấy Da Cũ',
            description: 'Giấy da cũ kỹ có vẻ quan trọng',
            rarity: 'COMMON',
            type: 'COLLECTIBLE',
            base_value: 16,  // Giảm từ 15
            is_featured: false,
            drop_rate: 0.07
        }
    ]
};

// Thông tin banner
const BANNER_INFO = {
    name: 'Limited Banner',
    description: 'Banner giới hạn thời gian với vật phẩm chủ đề Tiên Tri & Huyền Bí',
    banner_type: 'LIMITED',
    cost_per_pull: 200,  // Giảm từ 400 (~31 ngày cho 5★)
    up_rate: 0.5, // 50/50 system
    
    // Tỷ lệ rarity (cao hơn Standard)
    rates: {
        LEGENDARY: 0.006,   // 0.6%
        EPIC: 0.075,        // 7.5%
        RARE: 0.175,        // 17.5%
        UNCOMMON: 0.275,    // 27.5%
        COMMON: 0.469       // 46.9% (phần còn lại)
    }
};

/**
 * Lấy tất cả items của banner này
 * @returns {Array}
 */
function getAllItems() {
    const items = [];
    items.push(BANNER_LIMITED_ITEMS.UP_ITEM);
    items.push(...BANNER_LIMITED_ITEMS.NON_UP_LEGENDARY);
    items.push(...BANNER_LIMITED_ITEMS.EPIC_ITEMS);
    items.push(...BANNER_LIMITED_ITEMS.RARE_ITEMS);
    items.push(...BANNER_LIMITED_ITEMS.UNCOMMON_ITEMS);
    items.push(...BANNER_LIMITED_ITEMS.COMMON_ITEMS);
    return items;
}

/**
 * Lấy UP item của banner
 * @returns {Object}
 */
function getUpItem() {
    return BANNER_LIMITED_ITEMS.UP_ITEM;
}

/**
 * Lấy danh sách items thua UP
 * @returns {Array}
 */
function getNonUpLegendary() {
    return BANNER_LIMITED_ITEMS.NON_UP_LEGENDARY;
}

/**
 * Lấy items theo rarity
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(rarity) {
    switch (rarity) {
        case 'LEGENDARY':
            return [BANNER_LIMITED_ITEMS.UP_ITEM, ...BANNER_LIMITED_ITEMS.NON_UP_LEGENDARY];
        case 'EPIC':
            return BANNER_LIMITED_ITEMS.EPIC_ITEMS;
        case 'RARE':
            return BANNER_LIMITED_ITEMS.RARE_ITEMS;
        case 'UNCOMMON':
            return BANNER_LIMITED_ITEMS.UNCOMMON_ITEMS;
        case 'COMMON':
            return BANNER_LIMITED_ITEMS.COMMON_ITEMS;
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
        return [BANNER_LIMITED_ITEMS.UP_ITEM];
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
        return BANNER_LIMITED_ITEMS.NON_UP_LEGENDARY;
    }
    return getItemsByRarity(rarity);
}

module.exports = {
    BANNER_INFO,
    BANNER_LIMITED_ITEMS,
    getAllItems,
    getUpItem,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems
};
