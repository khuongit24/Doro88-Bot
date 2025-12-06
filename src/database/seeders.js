const { getConnection, get, run, all, transaction, exec } = require('./connection');
const logger = require('../utils/logger');

// Import banner configs để đồng bộ với file-based gacha system
const {
    BANNER_STANDARD,
    BANNER_LIMITED,
    BANNER_PREMIUM,
    BANNER_LUXURY,
    BANNER_TOOLKIT,
    getAllUniqueItems
} = require('../games/gacha/gachaitems');

/**
 * Seed initial data
 * 
 * QUAN TRỌNG: Hệ thống gacha mới lấy items từ file (src/games/gacha/gachaitems/)
 * thay vì từ database gacha_pools. Seeders chỉ cần:
 * 1. Đảm bảo banners tồn tại trong database (để track pity)
 * 2. Tạo các items cơ bản (materials, equipment) cho mining/fishing
 * 3. KHÔNG cần tạo gacha_pools (vì items lấy từ file)
 */
function seedDatabase() {
    logger.info('Seeding database...');

    // ============= TẠO BANNERS =============
    // Đảm bảo banners tồn tại để track pity và history
    seedBanners();

    // ============= TẠO ITEMS CƠ BẢN =============
    // Chỉ tạo items cho mining/fishing, không cần collectibles (gacha lấy từ file)
    seedBasicItems();

    // ============= TẠO GACHA ITEMS TỪ FILE VÀO DATABASE =============
    // Đảm bảo tất cả items từ gachaitems files tồn tại trong database
    seedGachaItemsFromFiles();

    logger.info('Database seeding completed successfully');
}

/**
 * Seed gacha banners
 * Banners cần tồn tại trong DB để:
 * - Track pity counter per user per banner
 * - Store gacha history
 * - Store guarantee states
 */
function seedBanners() {
    logger.info('Seeding gacha banners...');

    function ensureBanner(name, description, type, cost) {
        const existing = get('SELECT id FROM gacha_banners WHERE banner_type = ?', [type]);
        if (existing && existing.id) {
            // Update thông tin banner nếu đã tồn tại
            run(`UPDATE gacha_banners SET name = ?, description = ?, cost_per_pull = ?, is_active = 1 WHERE id = ?`, 
                [name, description, cost, existing.id]);
            return existing.id;
        }
        const res = run(`
            INSERT INTO gacha_banners (name, description, banner_type, cost_per_pull, is_active)
            VALUES (?, ?, ?, ?, ?)
        `, [name, description, type, cost, 1]);
        return res.lastInsertRowid;
    }

    // Tạo 5 banners với giá từ file config
    ensureBanner(BANNER_STANDARD.name, BANNER_STANDARD.description, 'STANDARD', BANNER_STANDARD.cost_per_pull);
    ensureBanner(BANNER_LIMITED.name, BANNER_LIMITED.description, 'LIMITED', BANNER_LIMITED.cost_per_pull);
    ensureBanner(BANNER_PREMIUM.name, BANNER_PREMIUM.description, 'PREMIUM', BANNER_PREMIUM.cost_per_pull);
    ensureBanner(BANNER_LUXURY.name, BANNER_LUXURY.description, 'LUXURY', BANNER_LUXURY.cost_per_pull);
    ensureBanner(BANNER_TOOLKIT.name, BANNER_TOOLKIT.description, 'TOOL_KIT', BANNER_TOOLKIT.cost_per_pull);

    logger.info('Banners seeded successfully');
}

/**
 * Seed items từ gachaitems files vào database
 * Đảm bảo tất cả items từ file tồn tại trong database để có thể track inventory
 */
function seedGachaItemsFromFiles() {
    logger.info('Seeding gacha items from files...');

    const allGachaItems = getAllUniqueItems();
    let created = 0;
    let updated = 0;

    for (const item of allGachaItems) {
        const existing = get('SELECT id FROM items WHERE name = ?', [item.name]);
        
        if (!existing) {
            // Tạo item mới
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
                    JSON.stringify(item.metadata || {})
                ]);
                created++;
            } catch (error) {
                logger.error('Failed to create gacha item', { name: item.name, error: error.message });
            }
        } else {
            // Cập nhật item nếu đã tồn tại (đảm bảo sync)
            try {
                run(`
                    UPDATE items SET description = ?, rarity = ?, type = ?, base_value = ?, metadata = ?
                    WHERE name = ?
                `, [
                    item.description,
                    item.rarity,
                    item.type,
                    item.base_value,
                    JSON.stringify(item.metadata || {}),
                    item.name
                ]);
                updated++;
            } catch (error) {
                logger.error('Failed to update gacha item', { name: item.name, error: error.message });
            }
        }
    }

    logger.info('Gacha items seeded from files', { created, updated, total: allGachaItems.length });
}

/**
 * Seed basic items cho mining/fishing
 * Không bao gồm gacha collectibles (đã có trong gachaitems files)
 */
function seedBasicItems() {
    logger.info('Seeding basic items...');

    const basicItems = [
        // ============= CUỐC ĐÀO MỎ =============
        { name: 'Cuốc Gỗ', description: 'Cuốc đào mỏ cơ bản làm từ gỗ', rarity: 'COMMON', type: 'EQUIPMENT', value: 100 },
        { name: 'Cuốc Đá', description: 'Cuốc đào mỏ bằng đá, tăng 5% tỉ lệ quặng hiếm', rarity: 'UNCOMMON', type: 'EQUIPMENT', value: 250 },
        { name: 'Cuốc Sắt', description: 'Cuốc sắt chắc chắn, tăng 10% tỉ lệ quặng hiếm', rarity: 'RARE', type: 'EQUIPMENT', value: 2000 },
        { name: 'Cuốc Vàng', description: 'Cuốc dát vàng sang trọng, tăng 20% tỉ lệ quặng hiếm', rarity: 'EPIC', type: 'EQUIPMENT', value: 8000 },
        { name: 'Cuốc Kim Cương', description: 'Cuốc huyền thoại nạm kim cương, tăng 35% tỉ lệ quặng hiếm', rarity: 'LEGENDARY', type: 'EQUIPMENT', value: 25000 },

        // ============= CẦN CÂU =============
        { name: 'Cần câu Tre', description: 'Cần câu cơ bản làm từ tre', rarity: 'COMMON', type: 'EQUIPMENT', value: 100 },
        { name: 'Cần câu Gỗ', description: 'Cần câu gỗ chắc chắn, tăng 5% tỉ lệ cá hiếm', rarity: 'UNCOMMON', type: 'EQUIPMENT', value: 250 },
        { name: 'Cần câu Carbon', description: 'Cần câu carbon nhẹ và bền, tăng 10% tỉ lệ cá hiếm', rarity: 'RARE', type: 'EQUIPMENT', value: 2000 },
        { name: 'Cần câu Titan', description: 'Cần câu titan cao cấp, tăng 20% tỉ lệ cá hiếm', rarity: 'EPIC', type: 'EQUIPMENT', value: 8000 },
        { name: 'Cần câu Huyền Thoại', description: 'Cần câu thần thoại, tăng 35% tỉ lệ cá hiếm', rarity: 'LEGENDARY', type: 'EQUIPMENT', value: 25000 },

        // ============= QUẶNG (VẬT LIỆU ĐÀO MỎ) =============
        { name: 'Than đá', description: 'Quặng than đá thông thường', rarity: 'COMMON', type: 'MATERIAL', value: 5 },
        { name: 'Quặng đồng', description: 'Quặng đồng có màu nâu đỏ', rarity: 'COMMON', type: 'MATERIAL', value: 10 },
        { name: 'Quặng sắt', description: 'Quặng sắt rắn chắc', rarity: 'UNCOMMON', type: 'MATERIAL', value: 25 },
        { name: 'Quặng bạc', description: 'Quặng bạc sáng lấp lánh', rarity: 'UNCOMMON', type: 'MATERIAL', value: 50 },
        { name: 'Quặng vàng', description: 'Quặng vàng quý giá', rarity: 'RARE', type: 'MATERIAL', value: 100 },
        { name: 'Hồng ngọc', description: 'Đá quý màu đỏ rực rỡ', rarity: 'RARE', type: 'MATERIAL', value: 200 },
        { name: 'Ngọc lục bảo', description: 'Đá quý màu xanh lục', rarity: 'EPIC', type: 'MATERIAL', value: 400 },
        { name: 'Kim cương', description: 'Viên kim cương sáng lấp lánh', rarity: 'EPIC', type: 'MATERIAL', value: 800 },
        { name: 'Quặng Mythril', description: 'Quặng huyền thoại màu xanh dương', rarity: 'LEGENDARY', type: 'MATERIAL', value: 1500 },
        { name: 'Quặng Adamantite', description: 'Quặng siêu hiếm từ lòng đất', rarity: 'LEGENDARY', type: 'MATERIAL', value: 3000 },

        // ============= CÁ (VẬT LIỆU CÂU CÁ) =============
        { name: 'Cá nhỏ', description: 'Cá nhỏ thông thường', rarity: 'COMMON', type: 'MATERIAL', value: 5 },
        { name: 'Cá mòi', description: 'Cá mòi tươi ngon', rarity: 'COMMON', type: 'MATERIAL', value: 8 },
        { name: 'Cá thu', description: 'Cá thu béo ngậy', rarity: 'UNCOMMON', type: 'MATERIAL', value: 20 },
        { name: 'Cá hồi', description: 'Cá hồi thơm ngon', rarity: 'UNCOMMON', type: 'MATERIAL', value: 40 },
        { name: 'Cá ngừ', description: 'Cá ngừ đại dương', rarity: 'RARE', type: 'MATERIAL', value: 80 },
        { name: 'Cá kiếm', description: 'Cá kiếm với mũi nhọn đặc trưng', rarity: 'RARE', type: 'MATERIAL', value: 150 },
        { name: 'Bạch tuộc', description: 'Bạch tuộc 8 xúc tu', rarity: 'EPIC', type: 'MATERIAL', value: 300 },
        { name: 'Cá vàng huyền thoại', description: 'Cá vàng phát sáng kỳ diệu', rarity: 'EPIC', type: 'MATERIAL', value: 600 },
        { name: 'Rồng biển', description: 'Sinh vật huyền thoại từ đáy biển', rarity: 'LEGENDARY', type: 'MATERIAL', value: 1200 },
        { name: 'Kraken con', description: 'Quái vật biển cả nhỏ', rarity: 'LEGENDARY', type: 'MATERIAL', value: 2500 },

        // ============= VẬT PHẨM ĐẶC BIỆT TỪ CÂU CÁ =============
        { name: 'Rương kho báu', description: 'Rương kho báu cổ xưa từ đáy biển', rarity: 'EPIC', type: 'MATERIAL', value: 500 },
        { name: 'Cổ vật biển', description: 'Cổ vật bí ẩn từ nền văn minh đã mất', rarity: 'LEGENDARY', type: 'MATERIAL', value: 2000 },
    ];

    // Insert items (chỉ insert nếu chưa tồn tại)
    for (const item of basicItems) {
        const existing = get('SELECT id FROM items WHERE name = ?', [item.name]);
        if (!existing) {
            run(`
                INSERT INTO items (name, description, rarity, type, base_value, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [item.name, item.description, item.rarity, item.type, item.value, item.metadata || null]);
        }
    }

    logger.info('Basic items seeded successfully');
}

module.exports = { seedDatabase };
