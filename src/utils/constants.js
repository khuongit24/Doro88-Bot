// Rarity Colors
const RARITY_COLORS = {
    COMMON: 0x9E9E9E,
    UNCOMMON: 0x4CAF50,
    RARE: 0x2196F3,
    EPIC: 0x9C27B0,
    LEGENDARY: 0xFFD700
};

// Rarity Emojis
const RARITY_EMOJIS = {
    COMMON: '⚪',
    UNCOMMON: '🟢',
    RARE: '🔵',
    EPIC: '🟣',
    LEGENDARY: '🟡'
};

// Item Types
const ITEM_TYPES = {
    CONSUMABLE: 'CONSUMABLE',
    COLLECTIBLE: 'COLLECTIBLE',
    EQUIPMENT: 'EQUIPMENT',
    CURRENCY: 'CURRENCY',
    BOOSTER: 'BOOSTER',
    MATERIAL: 'MATERIAL',
    COSMETIC: 'COSMETIC'
};

// Cosmetic Types - Các loại trang trí có thể trang bị
const COSMETIC_TYPES = {
    PROFILE_THEME: 'PROFILE_THEME',       // Theme màu sắc cho profile
    PROFILE_BORDER: 'PROFILE_BORDER',     // Viền khung profile
    PROFILE_BADGE: 'PROFILE_BADGE',       // Huy hiệu hiển thị
    HOME_THEME: 'HOME_THEME'              // Theme cho trang startplaying
};

// Transaction Types
const TRANSACTION_TYPES = {
    EARN: 'EARN',
    SPEND: 'SPEND',
    TRANSFER: 'TRANSFER',
    TRANSFER_OUT: 'TRANSFER_OUT',
    ADMIN_GIFT: 'ADMIN_GIFT',
    GAME_WIN: 'GAME_WIN',
    GAME_LOSS: 'GAME_LOSS'
};

// Game Types
const GAME_TYPES = {
    BLACKJACK: 'BLACKJACK',
    ROULETTE: 'ROULETTE',
    SLOTS: 'SLOTS',
    POKER: 'POKER',
    BACCARAT: 'BACCARAT',
    COINFLIP: 'COINFLIP',
    DICE: 'DICE',
    RPS: 'RPS'
};

// Report Types
const REPORT_TYPES = {
    FEEDBACK: 'FEEDBACK',
    BUG: 'BUG'
};

// Sender Types
const SENDER_TYPES = {
    SYSTEM: 'SYSTEM',
    ADMIN: 'ADMIN',
    EVENT: 'EVENT',
    USER: 'USER'
};

// Card Suits & Values
const CARD_SUITS = ['♠', '♥', '♦', '♣'];
const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Roulette Numbers
const ROULETTE_REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const ROULETTE_BLACKS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Navigation Button IDs
const NAV_BUTTONS = {
    HOME: 'nav_home',
    GACHA: 'nav_gacha',
    CASINO: 'nav_casino',
    MINIGAMES: 'nav_minigames',
    INVENTORY: 'nav_inventory',
    MAILBOX: 'nav_mailbox',
    PROFILE: 'nav_profile',
    LEADERBOARD: 'nav_leaderboard',
    HELP: 'nav_help',
    BACK: 'nav_back',
    DAILY_CHECKIN: 'nav_daily_checkin'
};

// Casino Button IDs
const CASINO_BUTTONS = {
    BLACKJACK: 'casino_blackjack',
    ROULETTE: 'casino_roulette',
    SLOTS: 'casino_slots',
    CRASH: 'casino_crash',
    WHEEL: 'casino_wheel',
    TAIXIU: 'casino_taixiu'
};

// Gacha Button IDs
const GACHA_BUTTONS = {
    PULL_1: 'gacha_pull_1',
    PULL_10: 'gacha_pull_10',
    BANNER_STANDARD: 'gacha_banner_standard',
    BANNER_LIMITED: 'gacha_banner_limited',
    BANNER_PREMIUM: 'gacha_banner_premium',
    BANNER_LUXURY: 'gacha_banner_luxury'
};

// Blackjack Button IDs
const BLACKJACK_BUTTONS = {
    HIT: 'bj_hit',
    STAND: 'bj_stand',
    DOUBLE: 'bj_double',
    SURRENDER: 'bj_surrender',
    BET_50: 'bj_bet_50',
    BET_100: 'bj_bet_100',
    BET_500: 'bj_bet_500',
    BET_1000: 'bj_bet_1000',
    BET_CUSTOM: 'bj_bet_custom',
    PLAY_AGAIN: 'bj_play_again',
    // Insurance buttons
    INSURANCE_YES: 'bj_insurance_yes',
    INSURANCE_NO: 'bj_insurance_no'
};

// Slots Button IDs
const SLOTS_BUTTONS = {
    SPIN: 'slots_spin',
    BET_UP: 'slots_bet_up',
    BET_DOWN: 'slots_bet_down',
    BET_MAX: 'slots_bet_max',
    BET_CUSTOM: 'slots_bet_custom'
};

// Roulette Button IDs
const ROULETTE_BUTTONS = {
    RED: 'roulette_red',
    BLACK: 'roulette_black',
    ODD: 'roulette_odd',
    EVEN: 'roulette_even',
    LOW: 'roulette_low',
    HIGH: 'roulette_high',
    SPIN: 'roulette_spin',
    CLEAR: 'roulette_clear',
    NUMBER: 'roulette_number',
    BET_50: 'roulette_bet_50',
    BET_100: 'roulette_bet_100',
    BET_500: 'roulette_bet_500',
    BET_1000: 'roulette_bet_1000',
    BET_CUSTOM: 'roulette_bet_custom'
};

// Crash Button IDs
const CRASH_BUTTONS = {
    PLAY: 'crash_play',
    BET_50: 'crash_bet_50',
    BET_100: 'crash_bet_100',
    BET_500: 'crash_bet_500',
    BET_1000: 'crash_bet_1000',
    BET_CUSTOM: 'crash_bet_custom',
    TARGET_1_5: 'crash_target_1_5',
    TARGET_2: 'crash_target_2',
    TARGET_3: 'crash_target_3',
    TARGET_5: 'crash_target_5',
    TARGET_10: 'crash_target_10'
};

// Wheel Button IDs
const WHEEL_BUTTONS = {
    SPIN: 'wheel_spin',
    BET_50: 'wheel_bet_50',
    BET_100: 'wheel_bet_100',
    BET_500: 'wheel_bet_500',
    BET_1000: 'wheel_bet_1000',
    BET_CUSTOM: 'wheel_bet_custom'
};

// Mini Games Button IDs
const MINIGAME_BUTTONS = {
    COINFLIP_HEADS: 'mini_coinflip_heads',
    COINFLIP_TAILS: 'mini_coinflip_tails',
    DICE_ROLL: 'mini_dice_roll',
    RPS_ROCK: 'mini_rps_rock',
    RPS_PAPER: 'mini_rps_paper',
    RPS_SCISSORS: 'mini_rps_scissors',
    COINFLIP_BET_CUSTOM: 'mini_coinflip_bet_custom',
    RPS_BET_CUSTOM: 'mini_rps_bet_custom'
};

// Inventory Button IDs
const INVENTORY_BUTTONS = {
    PREV: 'inv_prev',
    NEXT: 'inv_next',
    USE: 'inv_use',
    SELL: 'inv_sell',
    DETAILS: 'inv_details',
    EQUIP: 'inv_equip',
    UNEQUIP: 'inv_unequip',
    COSMETICS: 'inv_cosmetics'
};

// Mailbox Button IDs
const MAILBOX_BUTTONS = {
    PREV: 'mail_prev',
    NEXT: 'mail_next',
    READ: 'mail_read',
    CLAIM: 'mail_claim',
    CLAIM_ALL: 'mail_claim_all',
    DELETE: 'mail_delete',
    SEND: 'mail_send'
};

// Help Button IDs
const HELP_BUTTONS = {
    FEEDBACK: 'help_feedback',
    BUG_REPORT: 'help_bug_report'
};

// Default Tools (cannot be sold)
const DEFAULT_TOOLS = {
    PICKAXE: 'Cuốc Gỗ',       // Default wooden pickaxe
    FISHING_ROD: 'Cần câu Tre' // Default wooden fishing rod
};

// Mining/Fishing Button IDs
const TOOL_BUTTONS = {
    MINING_MENU: 'minigame_mining',
    MINING_DIG: 'mining_dig',
    MINING_CHANGE_TOOL: 'mining_change_tool',
    FISHING_MENU: 'minigame_fishing',
    FISHING_CAST: 'fishing_cast',
    FISHING_CHANGE_TOOL: 'fishing_change_tool',
    GOTO_SHOP_SELL: 'goto_shop_sell'
};

// Interactive Mining V2 Button IDs
const MINING_V2_BUTTONS = {
    START: 'minigame_mining_v2',
    LOCATION_CAVE: 'mining_location_cave',
    LOCATION_DEEP_MINE: 'mining_location_deep_mine',
    LOCATION_VOLCANO: 'mining_location_volcano',
    DIG_UP: 'mining_dig_up',
    DIG_DOWN: 'mining_dig_down',
    DIG_LEFT: 'mining_dig_left',
    DIG_RIGHT: 'mining_dig_right',
    DIG_STRIKE: 'mining_dig_strike',
    EXTRACT_STRIKE: 'mining_extract_strike',
    EXTRACT_PULL: 'mining_extract_pull',
    EXTRACT_FIRE: 'mining_extract_fire',
    CANCEL: 'mining_cancel'
};

// Interactive Fishing V2 Button IDs
const FISHING_V2_BUTTONS = {
    START: 'minigame_fishing_v2',
    LOCATION_SHORE: 'fishing_location_shore',
    LOCATION_DEEP_SEA: 'fishing_location_deep_sea',
    LOCATION_OCEAN_ABYSS: 'fishing_location_ocean_abyss',
    HOOK: 'fishing_hook',
    REEL_ROD: 'fishing_reel_rod',
    REEL_UP: 'fishing_reel_up',
    REEL_DOWN: 'fishing_reel_down',
    CANCEL: 'fishing_cancel'
};

// RPS V2 Button IDs (Best of 3/5)
const RPS_V2_BUTTONS = {
    MODE_SINGLE: 'rps_mode_single',
    MODE_BO3: 'rps_mode_bo3',
    MODE_BO5: 'rps_mode_bo5',
    ROCK: 'rps_v2_rock',
    PAPER: 'rps_v2_paper',
    SCISSORS: 'rps_v2_scissors'
};

// Quick Math V2 Button IDs
const QUICKMATH_V2_BUTTONS = {
    DIFFICULTY_EASY: 'qm_difficulty_easy',
    DIFFICULTY_MEDIUM: 'qm_difficulty_medium',
    DIFFICULTY_HARD: 'qm_difficulty_hard',
    POWERUP_SKIP: 'qm_powerup_skip',
    POWERUP_50_50: 'qm_powerup_50_50',
    POWERUP_TIME: 'qm_powerup_time'
};

// Higher/Lower V2 Button IDs
const HIGHERLOWER_V2_BUTTONS = {
    DOUBLE_OR_NOTHING: 'hl_double_or_nothing'
};

module.exports = {
    RARITY_COLORS,
    RARITY_EMOJIS,
    ITEM_TYPES,
    COSMETIC_TYPES,
    TRANSACTION_TYPES,
    GAME_TYPES,
    REPORT_TYPES,
    SENDER_TYPES,
    CARD_SUITS,
    CARD_VALUES,
    ROULETTE_REDS,
    ROULETTE_BLACKS,
    NAV_BUTTONS,
    CASINO_BUTTONS,
    GACHA_BUTTONS,
    BLACKJACK_BUTTONS,
    SLOTS_BUTTONS,
    ROULETTE_BUTTONS,
    CRASH_BUTTONS,
    WHEEL_BUTTONS,
    MINIGAME_BUTTONS,
    INVENTORY_BUTTONS,
    MAILBOX_BUTTONS,
    HELP_BUTTONS,
    DEFAULT_TOOLS,
    TOOL_BUTTONS,
    MINING_V2_BUTTONS,
    FISHING_V2_BUTTONS,
    RPS_V2_BUTTONS,
    QUICKMATH_V2_BUTTONS,
    HIGHERLOWER_V2_BUTTONS
};
