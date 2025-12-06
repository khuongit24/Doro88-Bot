require('dotenv').config();

module.exports = {
    // Bot Configuration
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    // Admin IDs (from env or default)
    adminIds: (process.env.ADMIN_IDS || '1019539342621949983').split(',').filter(id => id.trim()),

    // Database
    databasePath: process.env.DATABASE_PATH || './data/doro88.db',

    // Economy Settings
    // ENTERTAINMENT MODE v3.0 - Bot giải trí local với bạn bè
    // Mục tiêu: Vui, gây nghiện, dễ chơi - không cần quá khắt khe
    economy: {
        startingBalance: 3000,  // Tăng lên - đủ để thử nhiều content ngay từ đầu
        dailyReward: 500,       // Tăng lên - mỗi ngày có đủ để chơi vui
        dailyStreakBonus: 100,  // Tăng lên - streak có ý nghĩa hơn
        maxDailyStreak: 7,
    },

    // Gacha Settings
    // Giá đã được cân bằng để EV ~70-85% (tránh lạm phát)
    gacha: {
        standardCost: 300,
        premiumCost: 600,
        luxuryCost: 1200,
        softPityStart: 50,
        softPityIncrease: 0.02,
        hardPity: 90,
        // Display rates only; actual selection uses 5★ 0.6%, 4★ 5.1% base
        rates: {
            LEGENDARY: 0.006,
            EPIC: 0.051,
            RARE: 0.15,
            UNCOMMON: 0.29,
            COMMON: 0.503
        }
    },

    // Casino Settings
    casino: {
        minBet: 10,
        maxBet: 1000000,
        blackjack: {
            deckCount: 6,
            blackjackPayout: 1.5,
        },
        slots: {
            defaultBet: 50,
            symbols: {
                '🍒': { value: 2, weight: 25 },
                '🍋': { value: 3, weight: 20 },
                '🍊': { value: 5, weight: 18 },
                '🍇': { value: 10, weight: 15 },
                '💎': { value: 25, weight: 10 },
                '7️⃣': { value: 50, weight: 7 },
                '🎰': { value: 100, weight: 5 }
            }
        },
        roulette: {
            payouts: {
                straight: 35,
                split: 17,
                color: 1,
                oddEven: 1,
                half: 1,
                dozen: 2
            }
        }
    },

    // UI Settings
    colors: {
        primary: 0xFFD700,
        success: 0x00D166,
        error: 0xFF6B6B,
        info: 0x5865F2,
        warning: 0xFFA500,
        neutral: 0x99AAB5
    },

    // Session Settings
    session: {
        timeout: 300000, // 5 minutes
        maxPerUser: 1
    }
};
