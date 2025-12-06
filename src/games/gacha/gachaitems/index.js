/**
 * GACHA ITEMS INDEX
 * Export tất cả các banner items từ một nơi
 */

const bannerStandard = require('./banner_standard');
const bannerLimited = require('./banner_limited');
const bannerPremium = require('./banner_premium');
const bannerLuxury = require('./banner_luxury');
const bannerToolkit = require('./banner_toolkit');

// Map banner type to module
const BANNER_MODULES = {
    'STANDARD': bannerStandard,
    'LIMITED': bannerLimited,
    'PREMIUM': bannerPremium,
    'LUXURY': bannerLuxury,
    'TOOL_KIT': bannerToolkit
};

/**
 * Lấy module của banner theo loại
 * @param {string} bannerType - STANDARD, LIMITED, PREMIUM, LUXURY, TOOL_KIT
 * @returns {Object|null}
 */
function getBannerModule(bannerType) {
    return BANNER_MODULES[bannerType] || null;
}

/**
 * Lấy thông tin banner
 * @param {string} bannerType
 * @returns {Object|null}
 */
function getBannerInfo(bannerType) {
    const module = getBannerModule(bannerType);
    return module ? module.BANNER_INFO : null;
}

/**
 * Lấy tất cả items của banner
 * @param {string} bannerType
 * @returns {Array}
 */
function getAllItems(bannerType) {
    const module = getBannerModule(bannerType);
    return module ? module.getAllItems() : [];
}

/**
 * Lấy UP item của banner
 * @param {string} bannerType
 * @returns {Object|Array|null}
 */
function getUpItem(bannerType) {
    const module = getBannerModule(bannerType);
    if (!module) return null;
    
    // Tool Kit có nhiều UP items
    if (bannerType === 'TOOL_KIT' && module.getUpItems) {
        return module.getUpItems();
    }
    return module.getUpItem();
}

/**
 * Lấy items thua UP
 * @param {string} bannerType
 * @returns {Array}
 */
function getNonUpLegendary(bannerType) {
    const module = getBannerModule(bannerType);
    return module ? module.getNonUpLegendary() : [];
}

/**
 * Lấy items theo rarity
 * @param {string} bannerType
 * @param {string} rarity
 * @returns {Array}
 */
function getItemsByRarity(bannerType, rarity) {
    const module = getBannerModule(bannerType);
    return module ? module.getItemsByRarity(rarity) : [];
}

/**
 * Lấy featured items
 * @param {string} bannerType
 * @param {string} rarity
 * @returns {Array}
 */
function getFeaturedItems(bannerType, rarity) {
    const module = getBannerModule(bannerType);
    return module ? module.getFeaturedItems(rarity) : [];
}

/**
 * Lấy non-featured items
 * @param {string} bannerType
 * @param {string} rarity
 * @returns {Array}
 */
function getNonFeaturedItems(bannerType, rarity) {
    const module = getBannerModule(bannerType);
    return module ? module.getNonFeaturedItems(rarity) : [];
}

/**
 * Lấy UP rate của banner
 * @param {string} bannerType
 * @returns {number} - 0.5 cho 50/50, 0.75 cho 75/25
 */
function getUpRate(bannerType) {
    const info = getBannerInfo(bannerType);
    return info ? info.up_rate : 0.5;
}

/**
 * Kiểm tra xem banner có phải Tool Kit không
 * @param {string} bannerType
 * @returns {boolean}
 */
function isToolKitBanner(bannerType) {
    return bannerType === 'TOOL_KIT';
}

/**
 * Lấy tỷ lệ rarity của banner
 * @param {string} bannerType
 * @returns {Object}
 */
function getRarityRates(bannerType) {
    const info = getBannerInfo(bannerType);
    return info ? info.rates : {
        LEGENDARY: 0.006,
        EPIC: 0.051,
        RARE: 0.15,
        UNCOMMON: 0.29,
        COMMON: 0.503
    };
}

/**
 * Lấy danh sách tất cả banner types
 * @returns {Array}
 */
function getAllBannerTypes() {
    return Object.keys(BANNER_MODULES);
}

/**
 * Lấy tất cả unique items từ tất cả banners
 * Dùng cho việc seed database
 * @returns {Array}
 */
function getAllUniqueItems() {
    const itemMap = new Map();
    
    getAllBannerTypes().forEach(type => {
        const items = getAllItems(type);
        items.forEach(item => {
            // Dùng tên làm key để đảm bảo unique
            if (!itemMap.has(item.name)) {
                itemMap.set(item.name, item);
            }
        });
    });
    
    return Array.from(itemMap.values());
}

module.exports = {
    // Modules
    bannerStandard,
    bannerLimited,
    bannerPremium,
    bannerLuxury,
    bannerToolkit,
    BANNER_MODULES,
    
    // Banner constants (for easy access)
    BANNER_STANDARD: bannerStandard.BANNER_INFO,
    BANNER_LIMITED: bannerLimited.BANNER_INFO,
    BANNER_PREMIUM: bannerPremium.BANNER_INFO,
    BANNER_LUXURY: bannerLuxury.BANNER_INFO,
    BANNER_TOOLKIT: bannerToolkit.BANNER_INFO,
    
    // Functions
    getBannerModule,
    getBannerInfo,
    getAllItems,
    getUpItem,
    getNonUpLegendary,
    getItemsByRarity,
    getFeaturedItems,
    getNonFeaturedItems,
    getUpRate,
    isToolKitBanner,
    getRarityRates,
    getAllBannerTypes,
    getAllUniqueItems,
    
    // Helper function to get items by banner type (alias)
    getItemsByBannerType: getAllItems
};
