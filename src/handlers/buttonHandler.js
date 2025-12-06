/**
 * Button Handler - PERFORMANCE OPTIMIZED
 * 
 * Tối ưu hóa:
 * 1. Tất cả require() được đặt ở đầu file (không dynamic require trong runtime)
 * 2. ActiveGames Map có cơ chế tự động cleanup để tránh memory leak
 * 3. Các helper functions được cache để tái sử dụng
 */

// ============= DISCORD.JS IMPORTS (Hoisted to top for performance) =============
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// ============= MANAGERS =============
const sessionManager = require('../managers/sessionManager');
const userManager = require('../managers/userManager');
const economyManager = require('../managers/economyManager');
const levelManager = require('../managers/levelManager');
const inventoryManager = require('../managers/inventoryManager');
const mailboxManager = require('../managers/mailboxManager');
const shopManager = require('../managers/shopManager');
const itemManager = require('../managers/itemManager');

// ============= GAMES - GACHA =============
const gachaManager = require('../games/gacha/gachaManager');

// ============= GAMES - CASINO =============
const blackjack = require('../games/casino/blackjack');
const roulette = require('../games/casino/roulette');
const slots = require('../games/casino/slots');
const crash = require('../games/casino/crash');
const wheel = require('../games/casino/wheel');
const taixiu = require('../games/casino/taixiu');

// ============= GAMES - MINI =============
const coinflip = require('../games/mini/coinflip');
const rps = require('../games/mini/rps');
const luckyNumber = require('../games/mini/luckyNumber');
const higherLower = require('../games/mini/higherLower');
const quickMath = require('../games/mini/quickMath');
const mysteryBox = require('../games/mini/mysteryBox');
const mining = require('../games/mini/mining');
const fishing = require('../games/mini/fishing');
const scratchCard = require('../games/mini/scratchCard');

// ============= INTERACTIVE GAMES HANDLER =============
const { handleInteractiveGameButton } = require('./interactiveGamesHandler');

// ============= UI - EMBEDS (All hoisted to top) =============
const { createHomeEmbed, createProfileEmbed, createInventoryEmbed, createLeaderboardEmbed, createSuccessEmbed, createErrorEmbed, createCosmeticsEmbed } = require('../ui/embeds/coreEmbeds');
const { createGachaMainEmbed, createPullResultEmbed, createPull10ResultEmbed } = require('../ui/embeds/gachaEmbeds');
const { createCasinoMenuEmbed, createBlackjackBetEmbed, createBlackjackEmbed, createRouletteEmbed, createSlotsEmbed, createSlotsWaitingEmbed, createCrashEmbed, createCrashResultEmbed, createWheelEmbed, createWheelResultEmbed } = require('../ui/embeds/casinoEmbeds');
const { createMailboxEmbed, createHelpEmbed, createDailyRewardEmbed } = require('../ui/embeds/secondaryEmbeds');
const { createLuckyNumberEmbed, createLuckyNumberResultEmbed, createHigherLowerEmbed, createHigherLowerResultEmbed, createQuickMathEmbed, createQuickMathResultEmbed, createMysteryBoxEmbed, createMysteryBoxResultEmbed, createDiceEmbed, createDiceResultEmbed, createMiniGamesMenuEmbed, createCoinFlipEmbed, createCoinFlipResultEmbed, createRPSEmbed, createRPSResultEmbed, createMiningEmbed, createMiningResultEmbed, createFishingEmbed, createFishingResultEmbed, createScratchCardEmbed, createScratchCardResultEmbed } = require('../ui/embeds/miniGameEmbeds');
const { createShopMenuEmbed, createShopBuyEmbed, createShopSellEmbed, createTransactionResultEmbed, createTradeMenuEmbed, createSellAllConfirmationEmbed } = require('../ui/embeds/shopEmbeds');

// ============= UI - BUTTONS (All hoisted to top) =============
const { createMainNavButtons, createGachaButtons, createCasinoMenuButtons, createInventoryButtons, createMailboxButtons, createHelpButtons, createBackButtonRow, createDailyCheckinResultButtons } = require('../ui/buttons/navigationButtons');
const { createBlackjackBetButtons, createBlackjackGameButtons, createBlackjackEndButtons, createBlackjackInsuranceButtons, createSlotsButtons, createRouletteBetButtons, createCoinFlipButtons, createRPSButtons, createCrashButtons, createCrashResultButtons, createWheelButtons, createWheelResultButtons } = require('../ui/buttons/gameButtons');
const { createLuckyNumberButtons, createHigherLowerButtons, createQuickMathButtons, createMysteryBoxButtons, createDiceBetButtons, createDiceTripleBetButtons, createDiceTotalBetButtons, createDiceBetAmountButtons, createPlayAgainButtons, createMiniGamesMenuButtons, createMiningButtons, createMiningResultButtons, createFishingButtons, createFishingResultButtons, createScratchCardButtons, createScratchCardResultButtons } = require('../ui/buttons/miniGameButtons');
const { createShopMenuButtons, createShopBuyButtons, createShopSellSelect, createSellQuantityButtons, createShopBuySelect, createShopSellPaginationButtons, createShopSellActionButtons, createTradeMenuButtons, createSellAllConfirmationButtons } = require('../ui/buttons/shopButtons');

// ============= UI - MENUS =============
const { createHelpSelectMenu, createBannerSelectMenu, createInventorySelectMenu, createMailSelectMenu, createPickaxeSelectMenu, createFishingRodSelectMenu, createCosmeticSelectMenu } = require('../ui/menus/selectMenus');

// ============= UI - MODALS =============
const { createBetModal, createLuckyNumberGuessModal, createMailComposeModal } = require('../ui/modals/gameModals');

// ============= UTILS & CONFIG =============
const { NAV_BUTTONS, GACHA_BUTTONS, CASINO_BUTTONS, BLACKJACK_BUTTONS, SLOTS_BUTTONS, ROULETTE_BUTTONS, CRASH_BUTTONS, WHEEL_BUTTONS, MINIGAME_BUTTONS, INVENTORY_BUTTONS, MAILBOX_BUTTONS, HELP_BUTTONS, TOOL_BUTTONS, DEFAULT_TOOLS, MINING_V2_BUTTONS, FISHING_V2_BUTTONS, RPS_V2_BUTTONS, TRANSACTION_TYPES, RARITY_EMOJIS } = require('../utils/constants');
const { formatNumber, isToday, timeUntilMidnight } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config');

// ============= ACTIVE GAMES STORAGE WITH AUTO-CLEANUP =============
const GAME_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes - reduced from 30 for better memory (most games finish quickly)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Cleanup every 5 minutes
const MAX_ACTIVE_GAMES = 2000; // Giới hạn số lượng game để tránh memory leak

// Track game creation timestamps for cleanup
const gameTimestamps = new Map();
const _activeGamesMap = new Map();

// Proxy to automatically track timestamps on set() and enforce size limit
const activeGames = new Proxy(_activeGamesMap, {
    get(target, prop) {
        if (prop === 'set') {
            return (key, value) => {
                // Enforce size limit to prevent memory leak
                if (target.size >= MAX_ACTIVE_GAMES && !target.has(key)) {
                    // First try to cleanup expired games
                    cleanupExpiredGames();

                    // If still at limit, force remove oldest entry
                    if (target.size >= MAX_ACTIVE_GAMES) {
                        const oldestKey = gameTimestamps.keys().next().value;
                        if (oldestKey) {
                            target.delete(oldestKey);
                            gameTimestamps.delete(oldestKey);
                        }
                    }
                }

                target.set(key, value);
                gameTimestamps.set(key, Date.now());
                return activeGames; // Return proxy for chaining
            };
        }
        if (prop === 'delete') {
            return (key) => {
                gameTimestamps.delete(key);
                return target.delete(key);
            };
        }
        if (prop === 'clear') {
            return () => {
                gameTimestamps.clear();
                return target.clear();
            };
        }
        // For get, has, size, forEach, etc. - use original
        const value = target[prop];
        return typeof value === 'function' ? value.bind(target) : value;
    }
});

/**
 * Cleanup expired games to prevent memory leaks
 */
function cleanupExpiredGames() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, timestamp] of gameTimestamps.entries()) {
        if (now - timestamp > GAME_EXPIRY_MS) {
            _activeGamesMap.delete(key);
            gameTimestamps.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.debug('Cleaned up expired active games', { count: cleaned, remaining: _activeGamesMap.size });
    }
}

// Start periodic cleanup
setInterval(cleanupExpiredGames, CLEANUP_INTERVAL_MS);

/**
 * Handle button interactions
 * @param {ButtonInteraction} interaction
 */
async function handleButton(interaction) {
    const userId = interaction.user.id;
    const customId = interaction.customId;
    const messageId = interaction.message.id;
    const channelId = interaction.channelId;

    // Skip validation for help buttons (public)
    if (customId.startsWith('help_')) {
        try {
            await interaction.deferUpdate();
            // Handle help buttons directly
            return;
        } catch (error) {
            logger.error('Help button error', { customId, error: error.message });
            return;
        }
    }

    // PLAYER ISOLATION: Check if this user is the owner of this embed
    // Use interactionMetadata to get the original user who invoked the command
    const originalOwnerId = interaction.message.interactionMetadata?.user?.id;

    if (originalOwnerId && originalOwnerId !== userId) {
        // This user is NOT the owner of this embed - block them!
        await interaction.reply({
            content: '❌ Đây không phải embed của bạn! Dùng `/startplaying` để mở menu riêng.',
            ephemeral: true
        });
        logger.info('Blocked user from clicking another user\'s embed', {
            clickerId: userId,
            ownerId: originalOwnerId,
            messageId
        });
        return;
    }

    // Get or create session for the user
    let session = sessionManager.getSession(userId);

    // If no session exists, create one automatically
    if (!session) {
        // Auto-create session for this message
        session = sessionManager.createSession(userId, messageId, channelId);
        logger.info('Auto-created session for button click', { userId, messageId });
    }

    // Update session to track current message (user may have multiple old embeds)
    if (session.messageId !== messageId) {
        session.messageId = messageId;
        session.channelId = channelId;
        session.updateActivity();
        logger.debug('Session updated to current message', { userId, messageId });
    }

    try {
        // For modals, we must not defer before showModal
        // NOTE: createBetModal is now imported at top of file for performance
        if (customId === SLOTS_BUTTONS.BET_CUSTOM) {
            const modal = createBetModal('slots');
            await interaction.showModal(modal);
            return;
        }
        if (customId === MINIGAME_BUTTONS.COINFLIP_BET_CUSTOM) {
            const modal = createBetModal('coinflip');
            await interaction.showModal(modal);
            return;
        }
        if (customId === MINIGAME_BUTTONS.RPS_BET_CUSTOM) {
            const modal = createBetModal('rps');
            await interaction.showModal(modal);
            return;
        }
        // Blackjack custom bet modal
        if (customId === BLACKJACK_BUTTONS.BET_CUSTOM) {
            const modal = createBetModal('blackjack');
            await interaction.showModal(modal);
            return;
        }
        // Roulette custom bet modal
        if (customId === 'roulette_bet_custom') {
            const modal = createBetModal('roulette');
            await interaction.showModal(modal);
            return;
        }
        // Dice custom bet button: show modal before any defer
        if (customId.startsWith('dice_bet_') && customId.endsWith('_custom')) {
            // Extract bet type from customId: dice_bet_TYPE_custom
            const parts = customId.replace('dice_bet_', '').replace('_custom', '');
            const betType = parts; // e.g., "under_7", "over_7", etc.

            // NOTE: createBetModal is now imported at top of file for performance
            const modal = createBetModal(`dice_${betType}`);
            await interaction.showModal(modal);
            return;
        }
        // Crash custom bet modal
        if (customId === CRASH_BUTTONS.BET_CUSTOM) {
            const modal = createBetModal('crash');
            await interaction.showModal(modal);
            return;
        }
        // Wheel custom bet modal
        if (customId === WHEEL_BUTTONS.BET_CUSTOM) {
            const modal = createBetModal('wheel');
            await interaction.showModal(modal);
            return;
        }
        // Mail send button - show compose modal
        if (customId === MAILBOX_BUTTONS.SEND) {
            const modal = createMailComposeModal();
            await interaction.showModal(modal);
            return;
        }
        // RPS custom bet modal - must be shown before deferUpdate
        // NOTE: ModalBuilder, TextInputBuilder, etc. are now imported at top of file
        if (customId === 'rps_custom_bet') {
            const modal = new ModalBuilder()
                .setCustomId('rps_custom_bet_modal')
                .setTitle('💰 Nhập số tiền cược');

            const betInput = new TextInputBuilder()
                .setCustomId('rps_bet_amount')
                .setLabel('Số tiền muốn cược (VD: 500)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 500')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10);

            const row = new ActionRowBuilder().addComponents(betInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return;
        }
        // Lucky Number custom guess modal
        if (customId === 'lucky_custom_guess') {
            const game = luckyNumber.getGame(userId);
            if (!game) {
                await interaction.reply({ content: '❌ Chưa có game đang chơi!', ephemeral: true });
                return;
            }
            // Calculate current range based on guesses
            let low = 1, high = 100;
            for (const g of game.guesses) {
                if (g < game.targetNumber && g > low) low = g + 1;
                if (g > game.targetNumber && g < high) high = g - 1;
            }
            const modal = createLuckyNumberGuessModal(low, high);
            await interaction.showModal(modal);
            return;
        }

        await interaction.deferUpdate();

        // Navigation buttons
        if (customId === NAV_BUTTONS.HOME) {
            await navigateHome(interaction, userId);
        } else if (customId === NAV_BUTTONS.DAILY_CHECKIN) {
            await handleDailyCheckin(interaction, userId);
        } else if (customId === NAV_BUTTONS.GACHA) {
            await navigateGacha(interaction, userId);
        } else if (customId === NAV_BUTTONS.CASINO) {
            await navigateCasino(interaction, userId);
        } else if (customId === NAV_BUTTONS.MINIGAMES) {
            await navigateMiniGames(interaction, userId);
        } else if (customId === 'nav_shop') {
            await navigateShop(interaction, userId);
        } else if (customId === NAV_BUTTONS.INVENTORY) {
            await navigateInventory(interaction, userId);
        } else if (customId === NAV_BUTTONS.MAILBOX) {
            await navigateMailbox(interaction, userId);
        } else if (customId === NAV_BUTTONS.PROFILE) {
            await navigateProfile(interaction, userId);
        } else if (customId === NAV_BUTTONS.LEADERBOARD) {
            await navigateLeaderboard(interaction, userId);
        } else if (customId === NAV_BUTTONS.HELP) {
            await navigateHelp(interaction);
        }
        // Gacha buttons
        else if (customId === GACHA_BUTTONS.PULL_1) {
            await handleGachaPull(interaction, userId, 1);
        } else if (customId === GACHA_BUTTONS.PULL_10) {
            await handleGachaPull(interaction, userId, 10);
        }
        // Casino buttons
        else if (customId === CASINO_BUTTONS.BLACKJACK) {
            await navigateBlackjack(interaction, userId);
        } else if (customId === CASINO_BUTTONS.SLOTS) {
            await navigateSlots(interaction, userId);
        } else if (customId === CASINO_BUTTONS.ROULETTE) {
            await navigateRoulette(interaction, userId);
        } else if (customId === CASINO_BUTTONS.CRASH) {
            await navigateCrash(interaction, userId);
        } else if (customId === CASINO_BUTTONS.WHEEL) {
            await navigateWheel(interaction, userId);
        } else if (customId === CASINO_BUTTONS.TAIXIU) {
            await handleDiceMenu(interaction, userId);
        }
        // Crash buttons
        else if (customId.startsWith('crash_')) {
            await handleCrash(interaction, userId, customId);
        }
        // Wheel buttons
        else if (customId.startsWith('wheel_')) {
            await handleWheel(interaction, userId, customId);
        }
        // Blackjack buttons
        else if (customId.startsWith('bj_bet_') || customId.startsWith('bj_replay_')) {
            await handleBlackjackBet(interaction, userId, customId);
        } else if (customId === BLACKJACK_BUTTONS.HIT) {
            await handleBlackjackHit(interaction, userId);
        } else if (customId === BLACKJACK_BUTTONS.STAND) {
            await handleBlackjackStand(interaction, userId);
        } else if (customId === BLACKJACK_BUTTONS.DOUBLE) {
            await handleBlackjackDouble(interaction, userId);
        } else if (customId === BLACKJACK_BUTTONS.SURRENDER) {
            await handleBlackjackSurrender(interaction, userId);
        } else if (customId === BLACKJACK_BUTTONS.INSURANCE_YES) {
            await handleBlackjackInsurance(interaction, userId, true);
        } else if (customId === BLACKJACK_BUTTONS.INSURANCE_NO) {
            await handleBlackjackInsurance(interaction, userId, false);
        } else if (customId === BLACKJACK_BUTTONS.PLAY_AGAIN) {
            await navigateBlackjack(interaction, userId);
        }
        // Slots buttons
        else if (customId === SLOTS_BUTTONS.SPIN) {
            await handleSlotsSpin(interaction, userId);
        } else if (customId === SLOTS_BUTTONS.BET_UP) {
            await handleSlotsBetChange(interaction, userId, 'up');
        } else if (customId === SLOTS_BUTTONS.BET_DOWN) {
            await handleSlotsBetChange(interaction, userId, 'down');
        } else if (customId === SLOTS_BUTTONS.BET_MAX) {
            await handleSlotsBetChange(interaction, userId, 'max');
        }
        // Roulette buttons
        else if (customId.startsWith('roulette_')) {
            await handleRouletteBet(interaction, userId, customId);
        }
        // Mini games - Navigation
        else if (customId === 'mini_coinflip' || customId === 'minigame_coinflip') {
            await navigateCoinFlip(interaction, userId);
        } else if (customId === 'mini_rps' || customId === 'minigame_rps') {
            // Route to RPS mode selection (Single/Bo3/Bo5)
            await handleInteractiveGameButton(interaction, userId, 'rps_mode_select', activeGames);
        } else if (customId === 'mini_dice') {
            await navigateDice(interaction, userId);
        } else if (customId.startsWith('mini_coinflip_')) {
            await handleCoinFlip(interaction, userId, customId);
        } else if (customId.startsWith('mini_rps_')) {
            // Legacy single-round RPS for backward compatibility
            await handleInteractiveGameButton(interaction, userId, customId.replace('mini_rps_', 'rps_v2_'), activeGames);
        }

        // Shop buttons
        else if (customId === 'shop_buy') {
            await handleShopBuy(interaction, userId);
        } else if (customId === 'shop_sell') {
            await handleShopSell(interaction, userId);
        } else if (customId === 'shop_trade') {
            await handleShopTrade(interaction, userId);
        } else if (customId === 'shop_buy_prev' || customId === 'shop_buy_next') {
            await handleShopBuyPagination(interaction, userId, customId);
        } else if (customId === 'shop_sell_prev' || customId === 'shop_sell_next') {
            await handleShopSellPagination(interaction, userId, customId);
        } else if (customId === 'shop_sell_all') {
            await handleShopSellAllConfirmation(interaction, userId);
        } else if (customId === 'shop_sell_all_confirm') {
            await handleShopSellAllExecute(interaction, userId);
        } else if (customId.startsWith('sell_confirm_')) {
            await handleSellConfirm(interaction, userId, customId);
        } else if (customId.startsWith('buy_confirm_')) {
            await handleBuyConfirm(interaction, userId, customId);
        }
        // Trade buttons
        else if (customId === 'trade_gift_item') {
            await handleTradeGiftItem(interaction, userId);
        } else if (customId === 'trade_send_dcoin') {
            await handleTradeSendDCoin(interaction, userId);
        } else if (customId.startsWith('trade_gift_confirm_')) {
            await handleTradeGiftConfirm(interaction, userId, customId);
        }
        // NEW Mini Games
        else if (customId === 'minigame_lucky_number') {
            await handleLuckyNumberStart(interaction, userId);
        } else if (customId.startsWith('lucky_guess_')) {
            await handleLuckyNumberGuess(interaction, userId, customId);
        } else if (customId === 'lucky_cancel') {
            await handleLuckyNumberCancel(interaction, userId);
        } else if (customId === 'minigame_higher_lower') {
            await handleHigherLowerStart(interaction, userId);
        } else if (customId === 'hl_higher' || customId === 'hl_lower') {
            await handleHigherLowerGuess(interaction, userId, customId);
        } else if (customId === 'hl_cashout') {
            await handleHigherLowerCashout(interaction, userId);
        } else if (customId === 'hl_double_or_nothing') {
            await handleHigherLowerDoubleOrNothing(interaction, userId);
        } else if (customId === 'hl_cancel') {
            await handleHigherLowerCancel(interaction, userId);
        } else if (customId === 'minigame_quick_math') {
            await handleQuickMathStart(interaction, userId);
        } else if (customId.startsWith('qm_difficulty_')) {
            await handleQuickMathDifficultySelect(interaction, userId, customId);
        } else if (customId.startsWith('qm_answer_')) {
            await handleQuickMathAnswer(interaction, userId, customId);
        } else if (customId === 'qm_powerup_skip') {
            await handleQuickMathPowerup(interaction, userId, 'skip');
        } else if (customId === 'qm_powerup_50_50') {
            await handleQuickMathPowerup(interaction, userId, 'fiftyFifty');
        } else if (customId === 'qm_powerup_time') {
            await handleQuickMathPowerup(interaction, userId, 'extraTime');
        } else if (customId === 'minigame_mystery_box') {
            await handleMysteryBoxMenu(interaction, userId);
        } else if (customId.startsWith('box_')) {
            await handleMysteryBoxOpen(interaction, userId, customId);
        } else if (customId === 'minigame_dice') {
            await handleDiceMenu(interaction, userId);
        } else if (customId === 'dice_category_triple') {
            await handleDiceTripleCategory(interaction, userId);
        } else if (customId === 'dice_category_total') {
            await handleDiceTotalCategory(interaction, userId, 1);
        } else if (customId === 'dice_total_page_1') {
            await handleDiceTotalCategory(interaction, userId, 1);
        } else if (customId === 'dice_total_page_2') {
            await handleDiceTotalCategory(interaction, userId, 2);
        } else if (customId.startsWith('dice_') && !customId.startsWith('dice_bet_')) {
            await handleDiceSelectBet(interaction, userId, customId);
        } else if (customId.startsWith('dice_bet_')) {
            // Intercept custom bet to show modal before any defer
            if (customId.endsWith('_custom')) {
                // NOTE: createBetModal is now imported at top of file
                const modal = createBetModal('dice');
                await interaction.showModal(modal);
                return;
            }
            await handleDiceRoll(interaction, userId, customId);
        }
        // Mining handlers - now routes to interactive version
        else if (customId === 'minigame_mining' ||
            customId === 'minigame_mining_v2' ||
            customId.startsWith('mining_v2_') ||
            customId.startsWith('mining_location_') ||
            customId.startsWith('mining_dig_') ||
            customId.startsWith('mining_extract_') ||
            customId === 'mining_cancel') {
            await handleInteractiveGameButton(interaction, userId, customId, activeGames);
        } else if (customId === 'mining_select_tool') {
            await handleMiningSelectTool(interaction, userId);
        } else if (customId === 'mining_change_tool') {
            await handleMiningSelectTool(interaction, userId);
        }
        // Fishing handlers - now routes to interactive version
        else if (customId === 'minigame_fishing' ||
            customId === 'minigame_fishing_v2' ||
            customId.startsWith('fishing_v2_') ||
            customId.startsWith('fishing_location_') ||
            customId === 'fishing_hook' ||
            customId.startsWith('fishing_reel_') ||
            customId === 'fishing_cancel') {
            await handleInteractiveGameButton(interaction, userId, customId, activeGames);
        } else if (customId === 'fishing_select_tool') {
            await handleFishingSelectTool(interaction, userId);
        } else if (customId === 'fishing_change_tool') {
            await handleFishingSelectTool(interaction, userId);
        }
        // Go to shop sell (from mining/fishing result)
        else if (customId === 'goto_shop_sell') {
            await handleShopSell(interaction, userId);
        }
        // RPS bet amount buttons (rps_bet_50, rps_bet_100, etc.)
        else if (customId.startsWith('rps_bet_') && !customId.includes('custom')) {
            const betAmount = parseInt(customId.replace('rps_bet_', ''));
            if (!isNaN(betAmount) && betAmount > 0) {
                await handleRPSBetChange(interaction, userId, betAmount);
            }
        }
        // RPS V2 (Bo3/Bo5 mode) + Custom bet modal
        else if (customId.startsWith('rps_mode_') ||
            customId.startsWith('rps_v2_') ||
            customId === 'rps_custom_bet' ||
            customId === 'rps_cancel') {
            await handleInteractiveGameButton(interaction, userId, customId, activeGames);
        }

        // Scratch Card handlers
        else if (customId === 'minigame_scratch') {
            await handleScratchCardMenu(interaction, userId);
        } else if (customId.startsWith('scratch_')) {
            await handleScratchCard(interaction, userId, customId);
        }
        // Mailbox
        else if (customId === MAILBOX_BUTTONS.CLAIM_ALL) {
            await handleClaimAllMails(interaction, userId);
        } else if (customId === MAILBOX_BUTTONS.PREV || customId === MAILBOX_BUTTONS.NEXT) {
            await handleMailboxPagination(interaction, userId, customId);
        } else if (customId.startsWith('mail_claim_')) {
            await handleMailClaim(interaction, userId, customId);
        }
        // Inventory pagination
        else if (customId === INVENTORY_BUTTONS.PREV || customId === INVENTORY_BUTTONS.NEXT) {
            await handleInventoryPagination(interaction, userId, customId);
        }
        // Equip cosmetic from item detail view
        else if (customId.startsWith('equip_item_')) {
            await handleEquipItem(interaction, userId, customId);
        }
        // Cosmetics management (legacy - kept for compatibility)
        else if (customId === INVENTORY_BUTTONS.COSMETICS) {
            await navigateCosmetics(interaction, userId);
        } else if (customId === 'cosmetic_unequip_all') {
            await handleCosmeticUnequipAll(interaction, userId);
        } else if (customId === 'cosmetic_equip_selected') {
            // Equip the selected cosmetic from activeGames
            const selection = activeGames.get(`cosmetic_selected_${userId}`);
            if (!selection) {
                await interaction.followUp({
                    content: '💡 Chọn cosmetic từ dropdown trước khi nhấn Trang bị!',
                    ephemeral: true
                });
                return;
            }

            const success = userManager.equipCosmetic(userId, selection.cosmeticType, selection.itemId);
            if (success) {
                activeGames.delete(`cosmetic_selected_${userId}`);
                await navigateCosmetics(interaction, userId);
                await interaction.followUp({
                    content: `✅ Đã trang bị **${selection.itemName}**!`,
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    content: '❌ Không thể trang bị cosmetic!',
                    ephemeral: true
                });
            }
        }

        // Update session activity
        if (session) {
            session.updateActivity();
        }

    } catch (error) {
        logger.error('Button handler error', { customId, error: error.message });
        try {
            await interaction.followUp({
                content: '❌ Đã xảy ra lỗi!',
                ephemeral: true
            });
        } catch (followUpError) {
            // followUp có thể fail nếu interaction đã expired hoặc đã reply
            logger.warn('Failed to send error followUp', {
                customId,
                originalError: error.message,
                followUpError: followUpError.message
            });
        }
    }
}

// Navigation functions
// NOTE: isToday, timeUntilMidnight are now imported at top of file for performance
async function navigateHome(interaction, userId) {
    const user = userManager.getUser(userId);
    if (!user) {
        const newUser = userManager.getOrCreateUser(userId, interaction.user.username);
        const stats = userManager.getUserStats(userId);

        // Check daily checkin status for new user - ensure boolean primitive
        const hasCheckedInToday = !!(newUser.last_daily_claim && isToday(newUser.last_daily_claim));
        const timeUntilReset = hasCheckedInToday ? timeUntilMidnight() : '';

        const embed = createHomeEmbed(newUser, stats, { hasCheckedInToday, timeUntilReset });
        const buttons = createMainNavButtons({ hasCheckedInToday, timeUntilReset, unreadMailCount: stats.unreadMailCount });
        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    const stats = userManager.getUserStats(userId);

    // Check if user has already checked in today - ensure boolean primitive
    const hasCheckedInToday = !!(user.last_daily_claim && isToday(user.last_daily_claim));
    const timeUntilReset = hasCheckedInToday ? timeUntilMidnight() : '';

    const embed = createHomeEmbed(user, stats, { hasCheckedInToday, timeUntilReset });
    const buttons = createMainNavButtons({ hasCheckedInToday, timeUntilReset, unreadMailCount: stats.unreadMailCount });

    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Handle Daily Checkin button (similar to /daily command)
// NOTE: All required imports are now at top of file for performance
async function handleDailyCheckin(interaction, userId) {
    // Debug logging: Track when daily checkin is triggered
    logger.info('handleDailyCheckin triggered', {
        userId,
        customId: interaction.customId,
        messageId: interaction.message.id,
        embedTitle: interaction.message.embeds[0]?.title || 'No embed',
        triggeredAt: new Date().toISOString()
    });
    // NOTE: TRANSACTION_TYPES, createDailyRewardEmbed, createDailyCheckinResultButtons, config 
    // are all imported at top of file for performance

    // Get or create user
    const user = userManager.getOrCreateUser(userId, interaction.user.username);

    // Check if already claimed today
    if (user.last_daily_claim && isToday(user.last_daily_claim)) {
        const timeLeft = timeUntilMidnight();
        const embed = createErrorEmbed(`Bạn đã điểm danh hôm nay rồi!\nQuay lại sau: **${timeLeft}**`);
        const buttons = createMainNavButtons();
        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Calculate streak
    let newStreak = 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (user.last_daily_claim) {
        const lastClaim = new Date(user.last_daily_claim);
        if (lastClaim.toDateString() === yesterday.toDateString()) {
            // Consecutive day
            newStreak = Math.min(user.daily_streak + 1, config.economy.maxDailyStreak);
        }
    }

    // Calculate reward with streak bonus
    const baseReward = config.economy.dailyReward;
    const streakBonus = config.economy.dailyStreakBonus * (newStreak - 1);
    const finalReward = newStreak >= config.economy.maxDailyStreak
        ? (baseReward + streakBonus) * 2
        : baseReward + streakBonus;

    // Add reward
    economyManager.addDCoin(userId, finalReward, TRANSACTION_TYPES.EARN, `Daily checkin (streak ${newStreak})`);

    // Award XP for daily claim with streak bonus
    const xpResult = levelManager.awardXP(userId, 'DAILY_CLAIM', { streak: newStreak });

    // Update user
    userManager.updateUser(userId, {
        daily_streak: newStreak,
        last_daily_claim: new Date().toISOString()
    });

    // Get new balance
    const newBalance = economyManager.getBalance(userId);

    // Create response with disabled checkin button
    const embed = createDailyRewardEmbed(finalReward, newStreak, newBalance, xpResult);
    embed.setTitle('📅 Điểm danh hàng ngày');
    embed.setFooter({ text: 'Doro88 Bot • Quay lại vào ngày mai! • Tự động về trang chủ sau 5s...' });

    // Show result with disabled checkin button
    const resultButtons = createDailyCheckinResultButtons();
    await interaction.editReply({ embeds: [embed], components: resultButtons });

    // Auto navigate back to home after 5 seconds
    setTimeout(async () => {
        try {
            const updatedUser = userManager.getUser(userId);
            const stats = userManager.getUserStats(userId);

            // User just checked in, so hasCheckedInToday is true
            const timeUntilReset = timeUntilMidnight();

            const homeEmbed = createHomeEmbed(updatedUser, stats, { hasCheckedInToday: true, timeUntilReset });
            const homeButtons = createMainNavButtons({ hasCheckedInToday: true, timeUntilReset });
            await interaction.editReply({ embeds: [homeEmbed], components: homeButtons });
        } catch (err) {
            // Message may have been deleted or interaction expired - ignore
            logger.debug('Auto-navigate after daily failed', { userId, error: err.message });
        }
    }, 5000);
}

async function navigateGacha(interaction, userId) {
    const banners = gachaManager.getActiveBanners();
    const balance = economyManager.getBalance(userId);
    const pity = gachaManager.getPityCounter(userId);

    // Lấy database user ID để hiển thị per-banner guarantee
    const user = userManager.getUser(userId);
    const dbUserId = user?.id || null;

    const embed = createGachaMainEmbed(banners, balance, pity, dbUserId);
    // NOTE: createBannerSelectMenu and createBackButtonRow are imported at top of file
    const selectMenu = createBannerSelectMenu(banners);
    const backRow = createBackButtonRow();

    await interaction.editReply({ embeds: [embed], components: [selectMenu, ...backRow] });
}

async function navigateCasino(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createCasinoMenuEmbed(balance);
    const buttons = createCasinoMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateMiniGames(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createMiniGamesMenuEmbed(balance);
    const buttons = createMiniGamesMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateShop(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createShopMenuEmbed(balance);
    // NOTE: createShopMenuButtons is imported at top of file
    const buttons = createShopMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleShopBuy(interaction, userId, page = 1) {
    const balance = economyManager.getBalance(userId);
    const allItems = shopManager.getShopItems();
    const itemsPerPage = 10;
    const totalPages = Math.ceil(allItems.length / itemsPerPage) || 1;
    const startIdx = (page - 1) * itemsPerPage;
    const items = allItems.slice(startIdx, startIdx + itemsPerPage);

    const embed = createShopBuyEmbed(items, balance, { page, totalPages });
    // NOTE: createShopBuyButtons, createShopBuySelect are imported at top of file
    const buttons = createShopBuyButtons(page > 1, page < totalPages);
    const selectMenu = createShopBuySelect(items);

    const components = selectMenu ? [selectMenu, ...buttons] : buttons;

    setActiveGame(`shop_buy_${userId}`, { page });
    await interaction.editReply({ embeds: [embed], components });
}

async function handleShopSell(interaction, userId, page = 1) {
    const balance = economyManager.getBalance(userId);
    const { items: rawItems, pagination } = inventoryManager.getInventory(userId, page);

    // Filter out default tools that cannot be sold
    const items = rawItems.filter(item =>
        item.name !== DEFAULT_TOOLS.PICKAXE &&
        item.name !== DEFAULT_TOOLS.FISHING_ROD
    );

    const embed = createShopSellEmbed(items, balance, pagination);
    // NOTE: createShopSellSelect, createShopSellPaginationButtons, createShopSellActionButtons are imported at top of file

    const selectMenu = createShopSellSelect(items);
    const paginationRow = createShopSellPaginationButtons(pagination.hasPrev, pagination.hasNext);
    const actionRow = createShopSellActionButtons();

    let components = [];

    if (selectMenu) {
        components.push(selectMenu);
    }

    // Only show pagination if there are multiple pages
    if (pagination.totalPages > 1) {
        components.push(paginationRow);
    }

    components.push(actionRow);

    setActiveGame(`shop_sell_${userId}`, { page });
    await interaction.editReply({ embeds: [embed], components });
}

async function handleShopTrade(interaction, userId) {
    // NOTE: createTradeMenuEmbed, createTradeMenuButtons are imported at top of file

    const pendingTrades = shopManager.getPendingTrades(userId) || [];
    const balance = economyManager.getBalance(userId);
    const { items } = inventoryManager.getInventory(userId, 1, 100);
    const hasItems = items && items.length > 0;

    const embed = createTradeMenuEmbed(pendingTrades, balance);
    const buttons = createTradeMenuButtons(hasItems, balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Trade: Gift item - Show item select menu
// NOTE: EmbedBuilder, ActionRowBuilder, etc. are imported at top of file
async function handleTradeGiftItem(interaction, userId) {
    const { items } = inventoryManager.getInventory(userId, 1, 100);
    // NOTE: formatNumber, RARITY_EMOJIS, DEFAULT_TOOLS are imported at top of file

    // Filter out default tools
    const giftableItems = items.filter(item =>
        item.name !== DEFAULT_TOOLS.PICKAXE &&
        item.name !== DEFAULT_TOOLS.FISHING_ROD
    );

    if (giftableItems.length === 0) {
        await interaction.followUp({ content: '❌ Bạn không có vật phẩm nào để tặng!', ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎁 Tặng vật phẩm')
        .setDescription('Chọn vật phẩm từ kho để tặng cho người chơi khác.\n\n*Sau khi chọn item, bạn sẽ nhập User ID người nhận.*')
        .setColor(0x00BFFF)
        .setFooter({ text: 'Chọn vật phẩm bên dưới' });

    const options = giftableItems.slice(0, 25).map(item => ({
        label: `${item.name} (x${item.quantity})`,
        description: `Giá trị: ${formatNumber(item.base_value)} DCoin`,
        value: `gift_item_${item.id}`,
        emoji: RARITY_EMOJIS[item.rarity] || '📦'
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('trade_gift_select')
        .setPlaceholder('Chọn vật phẩm để tặng...')
        .addOptions(options);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('shop_trade')
            .setLabel('⬅️ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
}

// Trade: Send DCoin - Open modal
// NOTE: ModalBuilder, TextInputBuilder, etc. are imported at top of file
async function handleTradeSendDCoin(interaction, userId) {
    const balance = economyManager.getBalance(userId);

    const modal = new ModalBuilder()
        .setCustomId('modal_trade_dcoin')
        .setTitle('💸 Chuyển DCoin');

    const userIdInput = new TextInputBuilder()
        .setCustomId('trade_recipient')
        .setLabel('User ID hoặc @mention người nhận')
        .setPlaceholder('Ví dụ: 123456789012345678 hoặc @username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const amountInput = new TextInputBuilder()
        .setCustomId('trade_amount')
        .setLabel(`Số DCoin muốn chuyển (Có: ${balance.toLocaleString()})`)
        .setPlaceholder('Nhập số tiền...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(userIdInput),
        new ActionRowBuilder().addComponents(amountInput)
    );

    await interaction.showModal(modal);
}

// Trade: Confirm gift item (after selecting item and entering recipient)
// NOTE: EmbedBuilder, formatNumber are imported at top of file
async function handleTradeGiftConfirm(interaction, userId, customId) {
    // Format: trade_gift_confirm_itemId_recipientId_quantity
    const parts = customId.replace('trade_gift_confirm_', '').split('_');
    const itemId = parseInt(parts[0]);
    const recipientId = parts[1];
    const quantity = parseInt(parts[2]) || 1;

    // Check if sender has item
    if (!inventoryManager.hasItem(userId, itemId, quantity)) {
        await interaction.followUp({ content: '❌ Bạn không có đủ vật phẩm!', ephemeral: true });
        return;
    }

    // Check recipient exists
    const recipient = userManager.getUser(recipientId);
    if (!recipient) {
        await interaction.followUp({ content: '❌ Không tìm thấy người nhận!', ephemeral: true });
        return;
    }

    // Get item info
    const item = itemManager.getItemById(itemId);

    // Transfer item
    try {
        inventoryManager.removeItem(userId, itemId, quantity);
        inventoryManager.addItem(recipientId, itemId, quantity);

        const embed = new EmbedBuilder()
            .setTitle('✅ Tặng quà thành công!')
            .setDescription(`Bạn đã tặng **${item.name}** x${quantity} cho <@${recipientId}>`)
            .setColor(0x00FF00)
            .setTimestamp();

        // Navigate back to trade menu
        // NOTE: createTradeMenuEmbed, createTradeMenuButtons are imported at top of file

        const pendingTrades = shopManager.getPendingTrades(userId) || [];
        const balance = economyManager.getBalance(userId);
        const { items } = inventoryManager.getInventory(userId, 1, 100);
        const hasItems = items && items.length > 0;

        await interaction.editReply({
            embeds: [embed],
            components: createTradeMenuButtons(hasItems, balance)
        });

    } catch (error) {
        await interaction.followUp({ content: '❌ Lỗi khi tặng vật phẩm!', ephemeral: true });
    }
}

async function handleShopBuyPagination(interaction, userId, customId) {
    const gameData = getActiveGame(`shop_buy_${userId}`) || { page: 1 };
    let page = gameData.page;

    if (customId === 'shop_buy_next') page++;
    else if (customId === 'shop_buy_prev') page--;

    await handleShopBuy(interaction, userId, page);
}

async function handleShopSellPagination(interaction, userId, customId) {
    const gameData = getActiveGame(`shop_sell_${userId}`) || { page: 1 };
    let page = gameData.page;

    if (customId === 'shop_sell_next') page++;
    else if (customId === 'shop_sell_prev') page--;

    await handleShopSell(interaction, userId, page);
}

// Shop Sell All - Show confirmation first
// NOTE: formatNumber, createSellAllConfirmationEmbed, createSellAllConfirmationButtons, DEFAULT_TOOLS are imported at top of file
async function handleShopSellAllConfirmation(interaction, userId) {
    // Get all sellable items
    const items = inventoryManager.getAllInventoryItems(userId);
    if (!items || items.length === 0) {
        await interaction.followUp({ content: '❌ Không có vật phẩm để bán!', ephemeral: true });
        return;
    }

    // Filter out default tools
    const sellableItems = items.filter(item =>
        item.name !== DEFAULT_TOOLS.PICKAXE &&
        item.name !== DEFAULT_TOOLS.FISHING_ROD
    );

    if (sellableItems.length === 0) {
        await interaction.followUp({ content: '❌ Không có vật phẩm nào có thể bán!', ephemeral: true });
        return;
    }

    // Calculate total price
    let totalPrice = 0;
    sellableItems.forEach(item => {
        totalPrice += item.base_value * item.quantity;
    });

    // Find rare tools (RARE, EPIC, LEGENDARY pickaxes and fishing rods)
    const RARE_RARITIES = ['RARE', 'EPIC', 'LEGENDARY'];
    const rareTools = sellableItems.filter(item =>
        item.type === 'EQUIPMENT' && RARE_RARITIES.includes(item.rarity)
    );

    // Show confirmation embed
    const embed = createSellAllConfirmationEmbed(sellableItems, totalPrice, rareTools);
    const buttons = createSellAllConfirmationButtons(rareTools.length > 0);

    await interaction.editReply({ embeds: [embed], components: [buttons] });
}

// Shop Sell All - Execute after confirmation
// NOTE: formatNumber, ActionRowBuilder, ButtonBuilder, ButtonStyle are imported at top of file
async function handleShopSellAllExecute(interaction, userId) {
    const result = shopManager.sellAllToShop(userId);
    if (result.error) {
        await interaction.followUp({ content: '❌ Không có vật phẩm để bán!', ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const embed = createSuccessEmbed(
        `✅ Đã bán tất cả vật phẩm\n\n` +
        `💰 Nhận được: **${formatNumber(result.totalPrice)} DCoin**\n` +
        `📦 Số lượng đã bán: **${formatNumber(result.soldCount)}**\n` +
        `💳 Số dư mới: **${formatNumber(balance)} DCoin**`
    );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell')
                .setLabel('📦 Bán tiếp')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('🏪 Cửa hàng')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [backRow] });
}

async function handleSellConfirm(interaction, userId, customId) {
    // Parse: sell_confirm_itemId_quantity
    const parts = customId.replace('sell_confirm_', '').split('_');
    const itemId = parseInt(parts[0]);
    const quantity = parseInt(parts[1]);

    const result = shopManager.sellItem(userId, itemId, quantity);

    if (result.error) {
        await interaction.followUp({
            content: `❌ ${getSellErrorMessage(result.error)}`,
            ephemeral: true
        });
        return;
    }

    const balance = economyManager.getBalance(userId);

    const embed = createSuccessEmbed(
        `✅ Đã bán **${result.item.name}** x${quantity}\n\n` +
        `💰 Nhận được: **${formatNumber(result.price)} DCoin**\n` +
        `💳 Số dư mới: **${formatNumber(balance)} DCoin**`
    );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_sell')
                .setLabel('📦 Tiếp tục bán')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('🏪 Cửa hàng')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [backRow] });
}

async function handleBuyConfirm(interaction, userId, customId) {
    // Parse: buy_confirm_itemId_quantity
    const parts = customId.replace('buy_confirm_', '').split('_');
    const itemId = parseInt(parts[0]);
    const quantity = parseInt(parts[1]);

    const result = shopManager.buyFromShop(userId, itemId, quantity);

    if (result.error) {
        await interaction.followUp({
            content: `❌ ${getBuyErrorMessage(result.error)}`,
            ephemeral: true
        });
        return;
    }

    const balance = economyManager.getBalance(userId);

    const embed = createSuccessEmbed(
        `✅ Đã mua **${result.item.name}** x${quantity}\n\n` +
        `💸 Chi phí: **${formatNumber(result.price)} DCoin**\n` +
        `💳 Số dư còn: **${formatNumber(balance)} DCoin**`
    );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy')
                .setLabel('🛒 Tiếp tục mua')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('nav_shop')
                .setLabel('🏪 Cửa hàng')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('nav_home')
                .setLabel('🏠 Trang chủ')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [backRow] });
}

function getSellErrorMessage(error) {
    const messages = {
        'item_not_found': 'Vật phẩm không tồn tại!',
        'insufficient_quantity': 'Không đủ số lượng trong kho!',
        'insufficient_items': 'Không đủ vật phẩm trong kho!',
        'user_not_found': 'Không tìm thấy người dùng!',
        'cannot_sell_default_tool': 'Không thể bán dụng cụ mặc định (Cuốc Gỗ/Cần câu Tre)!',
        'no_sellable_items': 'Không có vật phẩm nào có thể bán (dụng cụ mặc định không thể bán)!'
    };
    return messages[error] || 'Đã xảy ra lỗi!';
}

function getBuyErrorMessage(error) {
    const messages = {
        'item_not_found': 'Vật phẩm không tồn tại!',
        'insufficient_balance': 'Không đủ DCoin!',
        'not_for_sale': 'Cửa hàng không bán vật phẩm. Hãy quay gacha Tool & Kit để nhận dụng cụ!',
        'user_not_found': 'Không tìm thấy người dùng!'
    };
    return messages[error] || 'Đã xảy ra lỗi!';
}

async function navigateInventory(interaction, userId, page = 1) {
    const { items, pagination } = inventoryManager.getInventory(userId, page);
    const user = userManager.getUser(userId);
    const embed = createInventoryEmbed(items, pagination, user.username);
    const buttons = createInventoryButtons(pagination.hasPrev, pagination.hasNext);

    // Add inventory select menu if there are items
    const inventorySelectMenu = createInventorySelectMenu(items, page);
    const components = inventorySelectMenu ? [inventorySelectMenu, ...buttons] : buttons;

    // Store current page
    activeGames.set(`inv_${userId}`, { page });

    await interaction.editReply({ embeds: [embed], components });
}

async function navigateMailbox(interaction, userId, page = 1) {
    const { mails, pagination } = mailboxManager.getMailbox(userId, page);
    const unreadCount = mailboxManager.getUnreadCount(userId);
    const embed = createMailboxEmbed(mails, pagination, unreadCount);
    const buttons = createMailboxButtons(pagination.hasPrev, pagination.hasNext, unreadCount > 0);

    // Add mail select menu if there are mails
    const mailSelectMenu = createMailSelectMenu(mails);
    const components = mailSelectMenu ? [mailSelectMenu, ...buttons] : buttons;

    // Store current page
    activeGames.set(`mail_${userId}`, { page });

    await interaction.editReply({ embeds: [embed], components });
}

async function navigateProfile(interaction, userId) {
    const user = userManager.getUser(userId);
    const stats = userManager.getUserStats(userId);
    const embed = createProfileEmbed(user, stats);
    const buttons = createBackButtonRow();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateCosmetics(interaction, userId) {
    // Get user's owned cosmetic items from inventory
    const { items } = inventoryManager.getInventory(userId, 1, 100); // Get all inventory items
    const shopItems = shopManager.getShopItems();

    // Find cosmetic items in inventory that match shop items
    const ownedCosmetics = [];
    for (const invItem of items) {
        const shopItem = shopItems.find(s => s.name === invItem.name && s.type === 'COSMETIC');
        if (shopItem) {
            ownedCosmetics.push({
                ...shopItem,
                quantity: invItem.quantity
            });
        }
    }

    // Get currently equipped cosmetics
    const equipped = userManager.getEquippedCosmetics(userId);
    const hasEquipped = equipped.profile_theme || equipped.profile_border || equipped.profile_badge || equipped.home_theme;

    // Create embed and select menu
    const embed = createCosmeticsEmbed(userId, ownedCosmetics);
    const cosmeticSelect = createCosmeticSelectMenu(ownedCosmetics, equipped);

    // Create action buttons (Equip/Unequip)
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('cosmetic_equip_selected')
            .setLabel('✅ Trang bị')
            .setStyle(ButtonStyle.Success)
            .setDisabled(ownedCosmetics.length === 0),
        new ButtonBuilder()
            .setCustomId('cosmetic_unequip_all')
            .setLabel('❌ Gỡ tất cả')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!hasEquipped),
        new ButtonBuilder()
            .setCustomId(INVENTORY_BUTTONS.PREV)
            .setLabel('◀ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    // Build components - select menu (if exists) + action buttons
    const components = [];
    if (cosmeticSelect) {
        components.push(cosmeticSelect);
    }
    components.push(actionRow);

    await interaction.editReply({ embeds: [embed], components });
}

// Unequip all cosmetics
async function handleCosmeticUnequipAll(interaction, userId) {
    const equipped = userManager.getEquippedCosmetics(userId);
    let unequipped = 0;

    // Unequip each type
    if (equipped.profile_theme) {
        userManager.unequipCosmetic(userId, 'PROFILE_THEME');
        unequipped++;
    }
    if (equipped.profile_border) {
        userManager.unequipCosmetic(userId, 'PROFILE_BORDER');
        unequipped++;
    }
    if (equipped.profile_badge) {
        userManager.unequipCosmetic(userId, 'PROFILE_BADGE');
        unequipped++;
    }
    if (equipped.home_theme) {
        userManager.unequipCosmetic(userId, 'HOME_THEME');
        unequipped++;
    }

    // Refresh the cosmetics view
    await navigateCosmetics(interaction, userId);

    if (unequipped > 0) {
        await interaction.followUp({
            content: `✅ Đã gỡ trang bị **${unequipped}** cosmetic!`,
            ephemeral: true
        });
    }
}

// Equip cosmetic item from item detail view
async function handleEquipItem(interaction, userId, customId) {
    const itemId = parseInt(customId.replace('equip_item_', ''));

    // Get item details
    const item = itemManager.getItemById(itemId);
    if (!item) {
        await interaction.followUp({
            content: '❌ Không tìm thấy vật phẩm!',
            ephemeral: true
        });
        return;
    }

    // Check if user owns the item
    const inventoryItem = inventoryManager.getInventoryItem(userId, itemId);
    if (!inventoryItem) {
        await interaction.followUp({
            content: '❌ Bạn không sở hữu vật phẩm này!',
            ephemeral: true
        });
        return;
    }

    // Check if item is a cosmetic in shop items
    const shopItems = shopManager.getShopItems();
    const shopItem = shopItems.find(s => s.name === item.name && s.type === 'COSMETIC');

    if (!shopItem || !shopItem.metadata?.cosmetic_type) {
        await interaction.followUp({
            content: '❌ Vật phẩm này không thể trang bị!',
            ephemeral: true
        });
        return;
    }

    const cosmeticType = shopItem.metadata.cosmetic_type;

    // Equip the cosmetic
    const success = userManager.equipCosmetic(userId, cosmeticType, shopItem.id);

    if (success) {
        await interaction.followUp({
            content: `✅ Đã trang bị **${item.name}**!`,
            ephemeral: true
        });

        // Navigate back to inventory
        await navigateInventory(interaction, userId);
    } else {
        await interaction.followUp({
            content: '❌ Không thể trang bị cosmetic này!',
            ephemeral: true
        });
    }
}

async function navigateLeaderboard(interaction, userId) {
    const users = userManager.getLeaderboard(10);
    const rank = userManager.getUserRank(userId);
    const embed = createLeaderboardEmbed(users, rank);
    const buttons = createBackButtonRow();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateHelp(interaction) {
    const embed = createHelpEmbed('main');
    const selectMenu = createHelpSelectMenu();
    const buttons = createHelpButtons();

    await interaction.editReply({ embeds: [embed], components: [selectMenu, ...buttons] });
}

// Gacha handlers
async function handleGachaPull(interaction, userId, count) {
    const banners = gachaManager.getActiveBanners();
    if (banners.length === 0) {
        await interaction.followUp({ content: '❌ Không có banner nào khả dụng!', ephemeral: true });
        return;
    }
    const sess = sessionManager.getSession(userId);
    const bannerId = (sess && sess.currentView === 'gacha' && sess.viewData.bannerId) ? sess.viewData.bannerId : banners[0].id;

    if (count === 1) {
        const result = gachaManager.pull(userId, bannerId);
        if (result.error) {
            await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
            return;
        }

        const balance = economyManager.getBalance(userId);
        const embed = createPullResultEmbed(result.item, balance, { pity4: result.pity4Counter, pity5: result.pity5Counter }, result);
        const banner = gachaManager.getBannerById(bannerId);
        const cost1 = banner.cost_per_pull;
        const cost10 = cost1 * 10;
        const buttons = createGachaButtons(balance >= cost1, balance >= cost10, cost1, cost10);

        await interaction.editReply({ embeds: [embed], components: buttons });
    } else {
        const result = gachaManager.pull10(userId, bannerId);
        if (result.error) {
            await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
            return;
        }

        const balance = economyManager.getBalance(userId);
        const pullStats = { wonUpCount: result.wonUpCount || 0, lostUpCount: result.lostUpCount || 0 };
        const embed = createPull10ResultEmbed(result.items, result.totalCost, balance, { pity4: result.pity4Counter, pity5: result.pity5Counter }, pullStats);
        const banner = gachaManager.getBannerById(bannerId);
        const cost1 = banner.cost_per_pull;
        const cost10 = cost1 * 10;
        const buttons = createGachaButtons(balance >= cost1, balance >= cost10, cost1, cost10);

        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

// Blackjack handlers
async function navigateBlackjack(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createBlackjackBetEmbed(balance);
    const buttons = createBlackjackBetButtons(balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackBet(interaction, userId, customId) {
    const betAmounts = { 'bj_bet_50': 50, 'bj_bet_100': 100, 'bj_bet_500': 500, 'bj_bet_1000': 1000 };
    let betAmount = betAmounts[customId];

    // Handle replay button: bj_replay_XXXXX (quick play with same bet)
    if (!betAmount && customId.startsWith('bj_replay_')) {
        const replayValue = parseInt(customId.replace('bj_replay_', ''));
        if (!isNaN(replayValue) && replayValue >= 10) {
            betAmount = replayValue;
        }
    }

    // Handle custom bet button: bj_bet_custom_XXXXX
    if (!betAmount && customId.startsWith('bj_bet_custom_')) {
        const customValue = parseInt(customId.replace('bj_bet_custom_', ''));
        if (!isNaN(customValue) && customValue >= 10) {
            betAmount = customValue;
        }
    }

    // Fallback: If custom bet was set via modal session
    if (!betAmount) {
        const session = sessionManager.getSession(userId);
        const balance = economyManager.getBalance(userId);
        if (session && session.currentView === 'blackjack' && typeof session.viewData.customBet === 'number') {
            betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
        } else {
            betAmount = 50; // Default
        }
    }

    const game = blackjack.createGame(userId, betAmount);
    if (game.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(game.error)}`, ephemeral: true });
        return;
    }

    // Store the bet amount for replay
    activeGames.set(`bj_${userId}`, game);
    activeGames.set(`bj_lastBet_${userId}`, betAmount);

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);

    // Determine which buttons to show based on game state
    let buttons;
    if (game.state === 'FINISHED') {
        buttons = createBlackjackEndButtons(balance, betAmount);
    } else if (game.state === 'INSURANCE_OFFERED') {
        // Dealer shows Ace - offer insurance!
        buttons = createBlackjackInsuranceButtons(Math.floor(betAmount / 2), balance);
    } else {
        buttons = createBlackjackGameButtons(gameState);
    }

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackHit(interaction, userId) {
    const game = activeGames.get(`bj_${userId}`);
    if (!game) {
        await interaction.followUp({ content: '❌ Không tìm thấy ván chơi! Vui lòng bắt đầu ván mới.', ephemeral: true });
        return;
    }

    const result = blackjack.hit(game);
    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);
    const lastBet = activeGames.get(`bj_lastBet_${userId}`) || game.betAmount;

    const buttons = game.state === 'FINISHED'
        ? createBlackjackEndButtons(balance, lastBet)
        : createBlackjackGameButtons(gameState);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackStand(interaction, userId) {
    const game = activeGames.get(`bj_${userId}`);
    if (!game) {
        await interaction.followUp({ content: '❌ Không tìm thấy ván chơi! Vui lòng bắt đầu ván mới.', ephemeral: true });
        return;
    }

    const result = blackjack.stand(game);
    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);
    const lastBet = activeGames.get(`bj_lastBet_${userId}`) || game.betAmount;
    const buttons = createBlackjackEndButtons(balance, lastBet);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackDouble(interaction, userId) {
    const game = activeGames.get(`bj_${userId}`);
    if (!game) return;

    const result = blackjack.double(game);
    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);
    // After double, the bet was already x2, but lastBet tracks original bet for replay
    const lastBet = activeGames.get(`bj_lastBet_${userId}`) || Math.floor(game.betAmount / 2);
    const buttons = createBlackjackEndButtons(balance, lastBet);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackSurrender(interaction, userId) {
    const game = activeGames.get(`bj_${userId}`);
    if (!game) {
        await interaction.followUp({ content: '❌ Không tìm thấy ván chơi! Vui lòng bắt đầu ván mới.', ephemeral: true });
        return;
    }

    const result = blackjack.surrender(game);
    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);
    const lastBet = activeGames.get(`bj_lastBet_${userId}`) || game.betAmount;
    const buttons = createBlackjackEndButtons(balance, lastBet);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleBlackjackInsurance(interaction, userId, takeInsurance) {
    const game = activeGames.get(`bj_${userId}`);
    if (!game) {
        await interaction.followUp({ content: '❌ Không tìm thấy ván chơi! Vui lòng bắt đầu ván mới.', ephemeral: true });
        return;
    }

    // Process insurance decision
    if (takeInsurance) {
        const result = blackjack.takeInsurance(game);
        if (result.error) {
            await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
            return;
        }
    } else {
        blackjack.declineInsurance(game);
    }

    const balance = economyManager.getBalance(userId);
    const gameState = blackjack.getGameState(game);
    const embed = createBlackjackEmbed(gameState, balance);
    const lastBet = activeGames.get(`bj_lastBet_${userId}`) || game.betAmount;

    // Determine which buttons to show based on game state
    let buttons;
    if (game.state === 'FINISHED') {
        buttons = createBlackjackEndButtons(balance, lastBet);
    } else {
        buttons = createBlackjackGameButtons(gameState);
    }

    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Slots handlers
async function navigateSlots(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    let betAmount = 50;

    const session = sessionManager.getSession(userId);
    if (session && session.currentView === 'slots' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
    }

    activeGames.set(`slots_${userId}`, { betAmount });

    const embed = createSlotsWaitingEmbed(balance, betAmount);
    const buttons = createSlotsButtons(betAmount, balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleSlotsSpin(interaction, userId) {
    const gameData = activeGames.get(`slots_${userId}`) || { betAmount: 50 };
    let betAmount = gameData.betAmount;
    const session = sessionManager.getSession(userId);
    if (session && session.currentView === 'slots' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(economyManager.getBalance(userId), config.casino.maxBet)));
        activeGames.set(`slots_${userId}`, { betAmount });
    }

    const result = slots.play(userId, betAmount);
    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const embed = createSlotsEmbed(result, balance);
    const buttons = createSlotsButtons(betAmount, balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleSlotsBetChange(interaction, userId, direction) {
    const gameData = activeGames.get(`slots_${userId}`) || { betAmount: 50 };
    let betAmount = gameData.betAmount;
    const balance = economyManager.getBalance(userId);

    if (direction === 'up') {
        betAmount = Math.min(betAmount + 50, Math.min(balance, config.casino.maxBet));
    } else if (direction === 'down') {
        betAmount = Math.max(betAmount - 50, 10);
    } else if (direction === 'max') {
        betAmount = Math.min(balance, config.casino.maxBet);
    }

    activeGames.set(`slots_${userId}`, { betAmount });
    sessionManager.updateSession(userId, 'slots', { customBet: betAmount });

    const embed = createSlotsWaitingEmbed(balance, betAmount);
    const buttons = createSlotsButtons(betAmount, balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Roulette handlers
async function navigateRoulette(interaction, userId) {
    let game = activeGames.get(`roulette_${userId}`);
    if (!game) {
        game = roulette.createGame(userId);
        game.betAmount = 50; // Default bet amount
        activeGames.set(`roulette_${userId}`, game);
    }

    const balance = economyManager.getBalance(userId);
    const embed = createRouletteEmbed(game, balance);
    const buttons = createRouletteBetButtons(balance, game.betAmount || 50);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleRouletteBet(interaction, userId, customId) {
    let game = activeGames.get(`roulette_${userId}`);
    if (!game) {
        game = roulette.createGame(userId);
        game.betAmount = 50;
        activeGames.set(`roulette_${userId}`, game);
    }

    // Handle bet amount selection buttons
    const betAmountMap = {
        'roulette_bet_50': 50,
        'roulette_bet_100': 100,
        'roulette_bet_500': 500,
        'roulette_bet_1000': 1000
    };

    if (betAmountMap[customId]) {
        game.betAmount = betAmountMap[customId];
        activeGames.set(`roulette_${userId}`, game);

        const balance = economyManager.getBalance(userId);
        const embed = createRouletteEmbed(game, balance);
        const buttons = createRouletteBetButtons(balance, game.betAmount);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    const betAmount = game.betAmount || 50;
    const betTypeMap = {
        'roulette_red': roulette.BET_TYPES.RED,
        'roulette_black': roulette.BET_TYPES.BLACK,
        'roulette_odd': roulette.BET_TYPES.ODD,
        'roulette_even': roulette.BET_TYPES.EVEN,
        'roulette_low': roulette.BET_TYPES.LOW,
        'roulette_high': roulette.BET_TYPES.HIGH
    };

    if (customId === 'roulette_spin') {
        if (game.bets.length === 0) {
            await interaction.followUp({ content: '❌ Chưa đặt cược!', ephemeral: true });
            return;
        }
        roulette.spin(game);
    } else if (customId === 'roulette_clear') {
        const clearedCount = game.bets.length;
        if (clearedCount > 0) {
            roulette.clearBets(game);
            await interaction.followUp({
                content: `🗑️ Đã xóa **${clearedCount}** cược và hoàn tiền!`,
                ephemeral: true
            });
        } else {
            await interaction.followUp({ content: '❓ Không có cược nào để xóa!', ephemeral: true });
        }
    } else if (betTypeMap[customId]) {
        const result = roulette.placeBet(game, betTypeMap[customId], betAmount);
        if (result.error) {
            await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
            return;
        }
    }

    const balance = economyManager.getBalance(userId);
    const embed = createRouletteEmbed(game, balance);
    const buttons = createRouletteBetButtons(balance, game.betAmount || 50);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Crash handlers
async function navigateCrash(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const gameData = activeGames.get(`crash_${userId}`) || { betAmount: 100, targetMultiplier: 2 };

    const embed = createCrashEmbed(balance, gameData.betAmount, gameData.targetMultiplier);
    const buttons = createCrashButtons(balance, gameData.betAmount, gameData.targetMultiplier);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleCrash(interaction, userId, customId) {
    let gameData = activeGames.get(`crash_${userId}`) || { betAmount: 100, targetMultiplier: 2 };
    const balance = economyManager.getBalance(userId);

    // Handle bet amount selection
    const betAmountMap = {
        'crash_bet_50': 50,
        'crash_bet_100': 100,
        'crash_bet_500': 500,
        'crash_bet_1000': 1000
    };

    if (betAmountMap[customId]) {
        gameData.betAmount = betAmountMap[customId];
        activeGames.set(`crash_${userId}`, gameData);

        const embed = createCrashEmbed(balance, gameData.betAmount, gameData.targetMultiplier);
        const buttons = createCrashButtons(balance, gameData.betAmount, gameData.targetMultiplier);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Handle target multiplier selection
    const targetMap = {
        'crash_target_1_5': 1.5,
        'crash_target_2': 2,
        'crash_target_3': 3,
        'crash_target_5': 5,
        'crash_target_10': 10
    };

    if (targetMap[customId]) {
        gameData.targetMultiplier = targetMap[customId];
        activeGames.set(`crash_${userId}`, gameData);

        const embed = createCrashEmbed(balance, gameData.betAmount, gameData.targetMultiplier);
        const buttons = createCrashButtons(balance, gameData.betAmount, gameData.targetMultiplier);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Handle play button or play again
    if (customId === 'crash_play' || customId === 'crash_play_again') {
        const result = crash.playCrash(userId, gameData.betAmount, gameData.targetMultiplier);

        if (result.error) {
            await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
            return;
        }

        const newBalance = economyManager.getBalance(userId);
        const embed = createCrashResultEmbed(result, newBalance);
        const buttons = createCrashResultButtons(newBalance, gameData.betAmount);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Handle change bet button - go back to bet selection
    if (customId === 'crash_change_bet') {
        const embed = createCrashEmbed(balance, gameData.betAmount, gameData.targetMultiplier);
        const buttons = createCrashButtons(balance, gameData.betAmount, gameData.targetMultiplier);
        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Default: show crash menu
    const embed = createCrashEmbed(balance, gameData.betAmount, gameData.targetMultiplier);
    const buttons = createCrashButtons(balance, gameData.betAmount, gameData.targetMultiplier);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Wheel handlers
async function navigateWheel(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const gameData = activeGames.get(`wheel_${userId}`) || { betAmount: 100 };

    const embed = createWheelEmbed(balance, gameData.betAmount);
    const buttons = createWheelButtons(balance, gameData.betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleWheel(interaction, userId, customId) {
    let gameData = activeGames.get(`wheel_${userId}`) || { betAmount: 100 };
    const balance = economyManager.getBalance(userId);

    // Handle bet amount selection
    const betAmountMap = {
        'wheel_bet_50': 50,
        'wheel_bet_100': 100,
        'wheel_bet_500': 500,
        'wheel_bet_1000': 1000
    };

    if (betAmountMap[customId]) {
        gameData.betAmount = betAmountMap[customId];
        activeGames.set(`wheel_${userId}`, gameData);

        const embed = createWheelEmbed(balance, gameData.betAmount);
        const buttons = createWheelButtons(balance, gameData.betAmount);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Handle spin button (initial spin or spin again)
    if (customId === 'wheel_spin' || customId === 'wheel_spin_again') {
        const result = wheel.spin(userId, gameData.betAmount);

        if (result.error) {
            let errorMsg = getErrorMessage(result.error);
            if (result.error === 'cooldown') {
                errorMsg = `⏰ Chờ thêm **${result.remaining}** giây!`;
            }
            await interaction.followUp({ content: `❌ ${errorMsg}`, ephemeral: true });
            return;
        }

        // Store bet amount for next spin
        activeGames.set(`wheel_${userId}`, { betAmount: gameData.betAmount });

        const embed = createWheelResultEmbed(result, result.newBalance);
        const buttons = createWheelResultButtons(result.newBalance, gameData.betAmount);

        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Handle change bet button - go back to bet selection menu
    if (customId === 'wheel_change_bet') {
        const embed = createWheelEmbed(balance, gameData.betAmount);
        const buttons = createWheelButtons(balance, gameData.betAmount);
        await interaction.editReply({ embeds: [embed], components: buttons });
        return;
    }

    // Default: show wheel menu
    const embed = createWheelEmbed(balance, gameData.betAmount);
    const buttons = createWheelButtons(balance, gameData.betAmount);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

// Mini games handlers
async function navigateCoinFlip(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    let betAmount = 50;
    const session = sessionManager.getSession(userId);
    if (session && session.currentView === 'coinflip' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
    }
    const embed = createCoinFlipEmbed(balance, betAmount);
    const buttons = createCoinFlipButtons(balance, betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleCoinFlip(interaction, userId, customId) {
    const choice = customId === 'mini_coinflip_heads' ? 'heads' : 'tails';
    let betAmount = 50;
    const session = sessionManager.getSession(userId);
    const balance = economyManager.getBalance(userId);
    if (session && session.currentView === 'coinflip' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
    }
    const result = coinflip.play(userId, betAmount, choice);

    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const newBalance = economyManager.getBalance(userId);
    const embed = createCoinFlipResultEmbed(result, newBalance);
    const buttons = createCoinFlipButtons(newBalance, betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateRPS(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    let betAmount = 50;
    const session = sessionManager.getSession(userId);
    if (session && session.currentView === 'rps' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
    }
    const embed = createRPSEmbed(balance, betAmount);
    const buttons = createRPSButtons(balance, betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleRPS(interaction, userId, customId) {
    const choiceMap = { 'mini_rps_rock': 'rock', 'mini_rps_paper': 'paper', 'mini_rps_scissors': 'scissors' };
    const choice = choiceMap[customId];
    let betAmount = 50;
    const session = sessionManager.getSession(userId);
    const balance = economyManager.getBalance(userId);
    if (session && session.currentView === 'rps' && typeof session.viewData.customBet === 'number') {
        betAmount = Math.max(10, Math.min(session.viewData.customBet, Math.min(balance, config.casino.maxBet)));
    }
    const result = rps.play(userId, betAmount, choice);

    if (result.error) {
        await interaction.followUp({ content: `❌ ${getErrorMessage(result.error)}`, ephemeral: true });
        return;
    }

    const newBalance = economyManager.getBalance(userId);
    const embed = createRPSResultEmbed(result, newBalance);
    const buttons = createRPSButtons(newBalance, betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * Handle RPS bet amount change (preset buttons: 50, 100, 200, 500)
 * @param {ButtonInteraction} interaction 
 * @param {string} userId 
 * @param {number} betAmount 
 */
async function handleRPSBetChange(interaction, userId, betAmount) {
    const balance = economyManager.getBalance(userId);

    // Validate bet amount
    if (betAmount > balance) {
        await interaction.followUp({
            content: `❌ Không đủ DCoin! Số dư: ${balance.toLocaleString()}`,
            ephemeral: true
        });
        return;
    }

    const { minBet, maxBet } = config.casino;
    if (betAmount < minBet || betAmount > maxBet) {
        await interaction.followUp({
            content: `❌ Mức cược phải từ ${minBet} đến ${maxBet.toLocaleString()} DCoin!`,
            ephemeral: true
        });
        return;
    }

    // Store the bet amount in session for when user plays
    const session = sessionManager.getSession(userId);
    if (session) {
        session.currentView = 'rps';
        session.viewData = { customBet: betAmount };
    }

    // Update embed with new bet amount
    const embed = createRPSEmbed(balance, betAmount);
    const buttons = createRPSButtons(balance, betAmount);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function navigateDice(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createDiceEmbed(balance);
    const buttons = createDiceBetButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}


// Mailbox handlers
async function handleClaimAllMails(interaction, userId) {
    // Debug logging: Track when and how this function is called
    const embedTitle = interaction.message.embeds[0]?.title || 'No embed';
    logger.info('handleClaimAllMails triggered', {
        userId,
        customId: interaction.customId,
        messageId: interaction.message.id,
        embedTitle,
        triggeredAt: new Date().toISOString()
    });

    // Context validation: Only allow claim from mailbox page
    // This prevents accidental claims from wrong UI state
    if (!embedTitle.includes('Hòm thư')) {
        logger.warn('handleClaimAllMails blocked: wrong context', {
            userId,
            embedTitle,
            expectedTitle: '📬 Hòm thư'
        });
        await interaction.followUp({
            content: '❌ Vui lòng vào 📬 Hòm thư để nhận thư!',
            ephemeral: true
        });
        return;
    }

    const result = mailboxManager.claimAllMails(userId);

    if (result.dcoin > 0 || result.items.length > 0) {
        await interaction.followUp({
            content: `✅ Đã nhận: ${result.dcoin > 0 ? `💰 ${result.dcoin} DCoin` : ''} ${result.items.length > 0 ? `📦 ${result.items.length} vật phẩm` : ''}`,
            ephemeral: true
        });
    } else {
        await interaction.followUp({ content: '📭 Không có gì để nhận!', ephemeral: true });
    }

    await navigateMailbox(interaction, userId);
}

async function handleMailboxPagination(interaction, userId, customId) {
    const gameData = activeGames.get(`mail_${userId}`) || { page: 1 };
    let page = gameData.page;

    if (customId === MAILBOX_BUTTONS.NEXT) page++;
    else if (customId === MAILBOX_BUTTONS.PREV) page--;

    await navigateMailbox(interaction, userId, page);
}

// Handle single mail claim
async function handleMailClaim(interaction, userId, customId) {
    const mailId = parseInt(customId.replace('mail_claim_', ''));

    const result = mailboxManager.claimMail(userId, mailId);

    if (!result) {
        await interaction.followUp({
            content: '❌ Không thể nhận thư này! Có thể đã nhận hoặc hết hạn.',
            ephemeral: true
        });
        return;
    }

    // Show success message
    let successMsg = '✅ Đã nhận thưởng!';
    if (result.dcoin > 0) {
        successMsg += `\n💰 +${result.dcoin.toLocaleString()} DCoin`;
    }
    if (result.items.length > 0) {
        successMsg += `\n📦 +${result.items.length} vật phẩm`;
    }

    await interaction.followUp({
        content: successMsg,
        ephemeral: true
    });

    // Navigate back to mailbox
    await navigateMailbox(interaction, userId);
}

// Inventory pagination
async function handleInventoryPagination(interaction, userId, customId) {
    const gameData = activeGames.get(`inv_${userId}`) || { page: 1 };
    let page = gameData.page;

    if (customId === INVENTORY_BUTTONS.NEXT) page++;
    else if (customId === INVENTORY_BUTTONS.PREV) page--;

    await navigateInventory(interaction, userId, page);
}

// Utility
function getErrorMessage(error) {
    const messages = {
        'insufficient_balance': 'Không đủ DCoin!',
        'insufficient_balance_insurance': 'Không đủ DCoin để mua bảo hiểm!',
        'bet_too_low': 'Cược quá thấp!',
        'bet_too_high': 'Cược quá cao!',
        'invalid_state': 'Thao tác không hợp lệ! Ván chơi đã kết thúc hoặc chưa bắt đầu.',
        'cannot_double': 'Không thể nhân đôi! Chỉ có thể nhân đôi với 2 lá bài đầu.',
        'cannot_surrender': 'Không thể đầu hàng! Chỉ có thể đầu hàng với 2 lá bài đầu.',
        'cannot_split': 'Không thể chia bài! Cần 2 lá bài cùng giá trị.',
        'insurance_not_available': 'Bảo hiểm không khả dụng!',
        'no_bets': 'Chưa đặt cược!',
        'empty_pool': 'Banner trống!',
        'cooldown': 'Đang trong thời gian chờ!',
        'game_not_found': 'Không tìm thấy ván chơi!',
        'already_finished': 'Ván chơi đã kết thúc!'
    };
    return messages[error] || 'Đã xảy ra lỗi!';
}

function getRarityEmoji(rarity) {
    const emojis = {
        'LEGENDARY': '🟡',
        'EPIC': '🟣',
        'RARE': '🔵',
        'UNCOMMON': '🟢',
        'COMMON': '⚪'
    };
    return emojis[rarity] || '⚪';
}

// ========== NEW MINI GAME HANDLERS ==========

// Lucky Number handlers
async function handleLuckyNumberStart(interaction, userId) {
    const game = luckyNumber.createGame(userId);

    if (game.error === 'cooldown') {
        const embed = createErrorEmbed(`⏰ Chờ thêm **${game.remaining}** giây!`);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('lucky_number') });
        return;
    }

    const embed = createLuckyNumberEmbed(game);
    const buttons = createLuckyNumberButtons(game);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleLuckyNumberGuess(interaction, userId, customId) {
    const guess = parseInt(customId.replace('lucky_guess_', ''));
    const result = luckyNumber.makeGuess(userId, guess);

    if (result.error) {
        const embed = createErrorEmbed(getErrorMessage(result.error));
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('lucky_number') });
        return;
    }

    if (result.won || result.game.status === 'lost') {
        const embed = createLuckyNumberResultEmbed(result);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('lucky_number') });
    } else {
        const embed = createLuckyNumberEmbed(result.game);
        embed.addFields({ name: '💡 Gợi ý', value: result.hint, inline: false });
        const buttons = createLuckyNumberButtons(result.game);
        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

async function handleLuckyNumberCancel(interaction, userId) {
    luckyNumber.cancelGame(userId);
    await navigateMiniGames(interaction, userId);
}

// Higher/Lower handlers
async function handleHigherLowerStart(interaction, userId) {
    const game = higherLower.createGame(userId);

    if (game.error === 'cooldown') {
        const embed = createErrorEmbed(`⏰ Chờ thêm **${game.remaining}** giây!`);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
        return;
    }

    const embed = createHigherLowerEmbed(game);
    const buttons = createHigherLowerButtons(false);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleHigherLowerGuess(interaction, userId, customId) {
    const choice = customId === 'hl_higher' ? 'higher' : 'lower';
    const result = higherLower.makeGuess(userId, choice);

    if (result.error) {
        const embed = createErrorEmbed(getErrorMessage(result.error));
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
        return;
    }

    const embed = createHigherLowerResultEmbed(result);

    if (result.won && result.canContinue) {
        const game = higherLower.getGame(userId);
        const buttons = createHigherLowerButtons(true, game?.streak || result.streak);
        await interaction.editReply({ embeds: [embed], components: buttons });
    } else if (result.won && result.maxedOut) {
        // Auto-cashout at max streak (anti-inflation)
        const cashoutResult = higherLower.cashOut(userId);
        if (cashoutResult.success) {
            embed.setFooter({ text: `🎉 Đạt streak tối đa! Tự động rút: +${cashoutResult.reward} DCoin` });
        }
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
    } else {
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
    }
}

async function handleHigherLowerCashout(interaction, userId) {
    const result = higherLower.cashOut(userId);

    if (result.error) {
        const embed = createErrorEmbed(getErrorMessage(result.error));
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
        return;
    }

    const embed = createHigherLowerResultEmbed(result);
    await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
}

async function handleHigherLowerCancel(interaction, userId) {
    higherLower.cancelGame(userId);
    await navigateMiniGames(interaction, userId);
}

// V2: Higher/Lower Double or Nothing handler
async function handleHigherLowerDoubleOrNothing(interaction, userId) {
    const result = higherLower.doubleOrNothing(userId);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_game') {
            errorMsg = '❌ Không có game đang chơi!';
        } else if (result.error === 'min_streak_required') {
            errorMsg = `❌ Cần ít nhất ${result.minStreak} streak để dùng Double or Nothing!`;
        }
        const embed = createErrorEmbed(errorMsg);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
        return;
    }

    const balance = economyManager.getBalance(userId);

    if (result.won) {
        // Won double or nothing
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎰 DOUBLE OR NOTHING - THẮNG!')
            .setDescription(
                `🎉 **Bạn đã NHÂN ĐÔI thành công!**\n\n` +
                `💰 Thưởng cũ: **${result.previousReward.toLocaleString()}** DCoin\n` +
                `💎 Thưởng mới: **${result.newReward.toLocaleString()}** DCoin\n\n` +
                `🔥 Streak: **${result.streak}**\n` +
                `🎲 Double wins: **${result.doubleOrNothingWins}**`
            )
            .setFooter({ text: `Tiếp tục chơi hoặc rút tiền về!` });

        const game = higherLower.getGame(userId);
        const buttons = createHigherLowerButtons(true, game?.streak || result.streak);
        await interaction.editReply({ embeds: [embed], components: buttons });
    } else {
        // Lost everything
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🎰 DOUBLE OR NOTHING - THUA!')
            .setDescription(
                `💔 **Bạn đã mất tất cả!**\n\n` +
                `💸 Đã mất: **${result.previousReward.toLocaleString()}** DCoin\n` +
                `📊 Số dư: **${balance.toLocaleString()}** DCoin\n\n` +
                (result.xpGained > 0 ? `✨ +${result.xpGained} XP` : '')
            )
            .setFooter({ text: `Double or Nothing - Rủi ro cao, thưởng cao!` });

        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('higher_lower') });
    }
}

// Quick Math handlers
async function handleQuickMathStart(interaction, userId) {
    // V2: Show difficulty selection instead of starting directly
    const diffSettings = quickMath.getDifficultySettings ? quickMath.getDifficultySettings() : null;

    // Check cooldown first
    const cooldown = quickMath.getCooldown(userId);
    if (cooldown > 0) {
        const embed = createErrorEmbed(`⏰ Chờ thêm **${cooldown}** giây!`);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
        return;
    }

    if (diffSettings) {
        // V2 Mode: Show difficulty selection
        const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧮 Toán Nhẩm Nhanh - Chọn độ khó')
            .setDescription(
                `Chọn độ khó để bắt đầu!\n\n` +
                `🟢 **Dễ** - Chỉ cộng trừ, số nhỏ (5-50), 12 giây/câu, x1.0 thưởng\n` +
                `🟡 **Trung bình** - Có nhân, số vừa (10-99), 10 giây/câu, x1.3 thưởng\n` +
                `🔴 **Khó** - Cả 4 phép, số lớn (20-150), 8 giây/câu, x1.8 thưởng\n\n` +
                `⚡ **Powerups mới!**\n` +
                `• ⏭️ Skip - Bỏ qua 1 câu\n` +
                `• 🎯 50/50 - Loại 2 đáp án sai\n` +
                `• ⏰ +5s - Thêm thời gian`
            )
            .setFooter({ text: 'Trả lời 10 câu hỏi - Streak cao = thưởng cao!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('qm_difficulty_easy')
                    .setLabel('🟢 Dễ')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('qm_difficulty_medium')
                    .setLabel('🟡 Trung bình')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('qm_difficulty_hard')
                    .setLabel('🔴 Khó')
                    .setStyle(ButtonStyle.Danger)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('nav_minigames')
                    .setLabel('⬅️ Quay lại')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row, row2] });
    } else {
        // Fallback: V1 mode (start directly with medium)
        const cachedInteraction = interaction;

        const onTimeout = async (discordId) => {
            try {
                const result = quickMath.submitAnswer(discordId, -1);
                if (result.error) return;

                if (result.finished) {
                    const embed = createQuickMathResultEmbed(result);
                    embed.setDescription(`⏰ **Hết giờ!** Đáp án: **${result.correctAnswer}**\n\n` + embed.data.description);
                    await cachedInteraction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
                } else {
                    const game = quickMath.getGame(discordId);
                    if (game) {
                        const embed = createQuickMathEmbed(game);
                        embed.setDescription(`⏰ **Hết giờ!** Đáp án: **${result.correctAnswer}**\n\n**❓ CÂU HỎI TIẾP:**\n# ${game.currentProblem.question}\n\n⏰ **Hết giờ:** <t:${Math.floor((game.problemStartTime + game.timeLimit) / 1000)}:R>`);
                        const buttons = createQuickMathButtons(game.currentProblem.options);
                        await cachedInteraction.editReply({ embeds: [embed], components: buttons });
                    }
                }
            } catch (err) {
                logger.error('Quick Math timeout error', { error: err.message, userId: discordId });
            }
        };

        const game = quickMath.createGame(userId, onTimeout);

        if (game.error === 'cooldown') {
            const embed = createErrorEmbed(`⏰ Chờ thêm **${game.remaining}** giây!`);
            await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
            return;
        }

        const embed = createQuickMathEmbed(game);
        const buttons = createQuickMathButtons(game.currentProblem.options);
        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

async function handleQuickMathAnswer(interaction, userId, customId) {
    const answerIndex = parseInt(customId.replace('qm_answer_', ''));
    const result = quickMath.submitAnswer(userId, answerIndex);

    if (result.error) {
        const embed = createErrorEmbed(getErrorMessage(result.error));
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
        return;
    }

    if (result.finished) {
        const embed = createQuickMathResultEmbed(result);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
    } else {
        const game = quickMath.getGame(userId);
        const embed = createQuickMathEmbed(game);
        if (!result.isCorrect) {
            if (result.timedOut) {
                embed.setDescription(`⏰ **Hết giờ!** Đáp án: **${result.correctAnswer}**\n\n**❓ CÂU HỎI TIẾP:**\n# ${game.currentProblem.question}\n\n⏰ **Hết giờ:** <t:${Math.floor((game.problemStartTime + game.timeLimit) / 1000)}:R>`);
            } else {
                embed.setDescription(`❌ **Sai!** Đáp án: **${result.correctAnswer}**\n\n**❓ CÂU HỎI TIẾP:**\n# ${game.currentProblem.question}\n\n⏰ **Hết giờ:** <t:${Math.floor((game.problemStartTime + game.timeLimit) / 1000)}:R>`);
            }
        }
        const buttons = createQuickMathButtons(game.currentProblem.options);
        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

// V2: Quick Math Difficulty Selection
async function handleQuickMathDifficultySelect(interaction, userId, customId) {
    const difficulty = customId.replace('qm_difficulty_', ''); // 'easy', 'medium', 'hard'
    const cachedInteraction = interaction;

    // Create onTimeout callback for V2 mode
    const onTimeout = async (discordId) => {
        try {
            const result = quickMath.submitAnswer(discordId, -1);
            if (result.error) return;

            if (result.finished) {
                const embed = createQuickMathResultEmbed(result);
                embed.setDescription(`⏰ **Hết giờ!** Đáp án: **${result.correctAnswer}**\n\n` + embed.data.description);
                await cachedInteraction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
            } else {
                const game = quickMath.getGame(discordId);
                if (game) {
                    const embed = createQuickMathEmbed(game);
                    embed.setDescription(`⏰ **Hết giờ!** Đáp án: **${result.correctAnswer}**\n\n**❓ CÂU HỎI TIẾP:**\n# ${game.currentProblem.question}\n\n⏰ **Hết giờ:** <t:${Math.floor((game.problemStartTime + game.timeLimit) / 1000)}:R>`);
                    const buttons = createQuickMathButtonsV2(game.currentProblem.options, game.powerups);
                    await cachedInteraction.editReply({ embeds: [embed], components: buttons });
                }
            }
        } catch (err) {
            logger.error('Quick Math V2 timeout error', { error: err.message, userId: discordId });
        }
    };

    // Create onWarning callback - triggered 3 seconds before timeout
    const onWarning = async (discordId, secondsLeft) => {
        try {
            const game = quickMath.getGame(discordId);
            if (!game || game.status !== 'playing') return;

            const diffSettings = game.difficultySettings;

            // Create warning embed with red color
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Red color for warning
                .setTitle(`🧮⚠️ Toán Nhẩm Nhanh - ${diffSettings.emoji} ${diffSettings.name}`)
                .setDescription(
                    `**⚠️⚠️ CHỈ CÒN ${secondsLeft} GIÂY! TRẢ LỜI NGAY! ⚠️⚠️**\n\n` +
                    `**❓ CÂU HỎI ${game.questionNumber}/${game.totalQuestions}:**\n` +
                    `# ${game.currentProblem.question}\n\n` +
                    `⏰ **⏰ ${secondsLeft}s !!!**\n` +
                    `🎯 **Điểm:** ${game.correctAnswers}/${game.totalQuestions}\n` +
                    `🔥 **Streak:** ${game.streak}\n` +
                    `💎 **Thưởng tạm:** ${game.totalReward} DCoin`
                )
                .setFooter({ text: '🚨 NHANH LÊN! THỜI GIAN SẮP HẾT! 🚨' });

            const buttons = createQuickMathButtonsV2(game.currentProblem.options, game.powerups);
            await cachedInteraction.editReply({ embeds: [embed], components: buttons });
        } catch (err) {
            logger.error('Quick Math warning error', { error: err.message, userId: discordId });
        }
    };

    const game = quickMath.createGame(userId, onTimeout, difficulty, onWarning);

    if (game.error === 'cooldown') {
        const embed = createErrorEmbed(`⏰ Chờ thêm **${game.remaining}** giây!`);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
        return;
    }

    const diffSettings = game.difficultySettings;

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`🧮 Quick Math ${diffSettings.emoji} ${diffSettings.name}`)
        .setDescription(
            `**❓ CÂU HỎI ${game.questionNumber}/${game.totalQuestions}:**\n` +
            `# ${game.currentProblem.question}\n\n` +
            `⏰ **Thời gian:** ${Math.ceil(game.timeLimit / 1000)} giây\n` +
            `🎯 **Điểm:** ${game.correctAnswers}/${game.totalQuestions}\n` +
            `🔥 **Streak:** ${game.streak}\n` +
            `💎 **Thưởng tạm:** ${game.totalReward} DCoin\n\n` +
            `⚡ **Powerups:** Skip: ${game.powerups.skip} | 50/50: ${game.powerups.fiftyFifty} | +5s: ${game.powerups.extraTime}`
        )
        .setFooter({ text: `Độ khó: ${diffSettings.name} (x${diffSettings.rewardMultiplier} thưởng)` });

    const buttons = createQuickMathButtonsV2(game.currentProblem.options, game.powerups);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

// V2: Quick Math Powerup handlers
async function handleQuickMathPowerup(interaction, userId, powerupType) {
    let result;

    switch (powerupType) {
        case 'skip':
            result = quickMath.useSkipPowerup(userId);
            break;
        case 'fiftyFifty':
            result = quickMath.useFiftyFiftyPowerup(userId);
            break;
        case 'extraTime':
            result = quickMath.useExtraTimePowerup(userId);
            break;
        default:
            const embed = createErrorEmbed('❌ Powerup không hợp lệ!');
            await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
            return;
    }

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_game') {
            errorMsg = '❌ Không có game đang chơi!';
        } else if (result.error === 'no_powerup') {
            errorMsg = '❌ Đã hết powerup này!';
        } else if (result.error === 'already_reduced') {
            errorMsg = '❌ Đã dùng 50/50 rồi!';
        }
        await interaction.followUp({ content: errorMsg, ephemeral: true });
        return;
    }

    const game = result.game;

    if (result.skipped) {
        // Skip powerup used
        if (result.finished) {
            const embed = createQuickMathResultEmbed(result);
            embed.setDescription(`⏭️ **Đã bỏ qua!** Đáp án: **${result.skippedAnswer}**\n\n` + embed.data.description);
            await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('quick_math') });
        } else {
            const diffSettings = game.difficultySettings || { emoji: '🟡', name: 'Trung bình' };
            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle(`🧮 Quick Math ${diffSettings.emoji}`)
                .setDescription(
                    `⏭️ **Đã bỏ qua!** Đáp án: **${result.skippedAnswer}**\n\n` +
                    `**❓ CÂU HỎI ${game.questionNumber}/${game.totalQuestions}:**\n` +
                    `# ${game.currentProblem.question}\n\n` +
                    `🎯 **Điểm:** ${game.correctAnswers}/${game.totalQuestions} | 🔥 **Streak:** ${game.streak}\n` +
                    `⚡ **Powerups:** Skip: ${game.powerups.skip} | 50/50: ${game.powerups.fiftyFifty} | +5s: ${game.powerups.extraTime}`
                );
            const buttons = createQuickMathButtonsV2(game.currentProblem.options, game.powerups);
            await interaction.editReply({ embeds: [embed], components: buttons });
        }
    } else if (result.fiftyFiftyUsed) {
        // 50/50 powerup - just update buttons with reduced options
        await interaction.followUp({ content: '🎯 50/50 đã loại bỏ 2 đáp án sai!', ephemeral: true });
        const buttons = createQuickMathButtonsV2(result.newOptions, game.powerups);
        await interaction.editReply({ components: buttons });
    } else if (result.extraTimeUsed) {
        // Extra time - just notify
        await interaction.followUp({ content: '⏰ +5 giây! Thời gian đã được gia hạn!', ephemeral: true });
    }
}

// Helper function to create V2 Quick Math buttons with powerups
function createQuickMathButtonsV2(options, powerups) {
    const row = new ActionRowBuilder();
    options.forEach((opt, index) => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`qm_answer_${index}`)
                .setLabel(`${opt}`)
                .setStyle(ButtonStyle.Primary)
        );
    });

    const hasPowerups = powerups && (powerups.skip > 0 || powerups.fiftyFifty > 0 || powerups.extraTime > 0);

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('qm_powerup_skip')
                .setLabel(`⏭️ Skip (${powerups?.skip || 0})`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!powerups || powerups.skip <= 0),
            new ButtonBuilder()
                .setCustomId('qm_powerup_50_50')
                .setLabel(`🎯 50/50 (${powerups?.fiftyFifty || 0})`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!powerups || powerups.fiftyFifty <= 0 || options.length <= 2),
            new ButtonBuilder()
                .setCustomId('qm_powerup_time')
                .setLabel(`⏰ +5s (${powerups?.extraTime || 0})`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!powerups || powerups.extraTime <= 0)
        );

    return [row, row2];
}

// Mystery Box handlers
async function handleMysteryBoxMenu(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const boxTypes = mysteryBox.getBoxTypes();

    const embed = createMysteryBoxEmbed(boxTypes, balance);
    const buttons = createMysteryBoxButtons(balance);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleMysteryBoxOpen(interaction, userId, customId) {
    const boxType = customId.replace('box_', '');
    const result = mysteryBox.openBox(userId, boxType);

    if (result.error) {
        let errorMsg = getErrorMessage(result.error);
        if (result.error === 'cooldown') {
            errorMsg = `⏰ Chờ thêm **${result.remaining}** giây!`;
        } else if (result.error === 'insufficient_balance') {
            errorMsg = `💸 Không đủ DCoin! Cần: ${result.required}`;
        }
        const balance = economyManager.getBalance(userId);
        const embed = createErrorEmbed(errorMsg);
        await interaction.editReply({ embeds: [embed], components: createMysteryBoxButtons(balance) });
        return;
    }

    // Get current balance after play to display
    const newBalance = economyManager.getBalance(userId);
    const embed = createMysteryBoxResultEmbed(result, newBalance);
    await interaction.editReply({ embeds: [embed], components: createMysteryBoxButtons(newBalance) });
}

// Tài Xỉu (Dice) handlers
async function handleDiceMenu(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createDiceEmbed(balance);
    const buttons = createDiceBetButtons();
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleDiceTripleCategory(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createDiceEmbed(balance, 'triple');
    embed.setDescription(
        '**🎰 Chọn Bộ ba cụ thể**\n\n' +
        'Cả 3 xúc xắc phải giống nhau và đúng số bạn chọn.\n' +
        '• Tỷ lệ thắng: ~0.46%\n' +
        '• Thưởng: **x150**'
    );
    const buttons = createDiceTripleBetButtons();
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleDiceTotalCategory(interaction, userId, page = 1) {
    const balance = economyManager.getBalance(userId);
    const embed = createDiceEmbed(balance, 'total');

    if (page === 1) {
        embed.setDescription(
            '**🎯 Đoán Tổng 3 Xúc Xắc (Trang 1/2)**\n\n' +
            'Chọn tổng bạn muốn đặt cược (4-10):\n' +
            '• Tổng càng hiếm → Thưởng càng cao\n' +
            '• Tổng 10/11 phổ biến nhất: x5.5'
        );
    } else {
        embed.setDescription(
            '**🎯 Đoán Tổng 3 Xúc Xắc (Trang 2/2)**\n\n' +
            'Chọn tổng bạn muốn đặt cược (11-17):\n' +
            '• Tổng càng hiếm → Thưởng càng cao\n' +
            '• Tổng 10/11 phổ biến nhất: x5.5'
        );
    }

    const buttons = createDiceTotalBetButtons(page);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleDiceSelectBet(interaction, userId, customId) {
    const betType = customId.replace('dice_', '');

    // Store selected bet type in session
    sessionManager.updateSession(userId, 'dice_bet', { betType });

    const balance = economyManager.getBalance(userId);
    const betOption = taixiu.BET_OPTIONS[betType.toUpperCase()];

    const embed = createDiceEmbed(balance);
    embed.setDescription(
        `**Đã chọn:** ${betOption?.name || betType}\n` +
        `**Thưởng:** x${betOption?.multiplier || '?'}\n\n` +
        `📌 *${betOption?.description || ''}*\n\n` +
        `Chọn số tiền cược:`
    );

    const buttons = createDiceBetAmountButtons(betType);
    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleDiceRoll(interaction, userId, customId) {
    // Parse: dice_bet_TYPE_AMOUNT
    const parts = customId.replace('dice_bet_', '').split('_');
    const amount = parseInt(parts.pop());
    const betType = parts.join('_');

    const result = taixiu.rollDice(userId, betType, amount);

    if (result.error) {
        let errorMsg = getErrorMessage(result.error);
        if (result.error === 'cooldown') {
            errorMsg = `⏰ Chờ thêm **${result.remaining}** giây!`;
        }
        const embed = createErrorEmbed(errorMsg);
        await interaction.editReply({ embeds: [embed], components: createDiceBetButtons() });
        return;
    }

    const embed = createDiceResultEmbed(result);
    await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('dice') });
}

// ========== MINING HANDLERS ==========

async function handleMiningMenu(interaction, userId) {
    // Ensure user has default tools
    userManager.ensureDefaultTools(userId);

    const miningInfo = mining.getMiningInfo(userId);
    const balance = economyManager.getBalance(userId);

    const embed = createMiningEmbed(miningInfo, balance);
    const buttons = createMiningButtons(miningInfo.hasPickaxe, miningInfo.cooldown > 0);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleMiningSelectTool(interaction, userId) {
    // Ensure user has default tools
    userManager.ensureDefaultTools(userId);

    const pickaxes = mining.getAllPickaxes(userId);
    const balance = economyManager.getBalance(userId);

    if (pickaxes.length === 0) {
        const embed = createErrorEmbed('❌ Bạn chưa có cuốc! Hãy quay gacha Tool & Kit để nhận cuốc.');
        await interaction.editReply({ embeds: [embed], components: createMiningButtons(false, false) });
        return;
    }

    // Always show pickaxe selection menu - let user choose which tool to use
    const selectMenu = createPickaxeSelectMenu(pickaxes);

    const embed = createMiningEmbed(mining.getMiningInfo(userId), balance);
    embed.setDescription(
        '**⛏️ Chọn cuốc để đào mỏ:**\n\n' +
        pickaxes.map((p, i) => `${i + 1}. ${getRarityEmoji(p.rarity)} **${p.name}** (+${Math.round(p.bonus.bonusRarity * 100)}% quặng hiếm)`).join('\n')
    );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_mining')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    const components = selectMenu ? [selectMenu, backRow] : [backRow];
    await interaction.editReply({ embeds: [embed], components });
}

// ========== FISHING HANDLERS ==========

async function handleFishingMenu(interaction, userId) {
    // Ensure user has default tools
    userManager.ensureDefaultTools(userId);

    const fishingInfo = fishing.getFishingInfo(userId);
    const balance = economyManager.getBalance(userId);

    const embed = createFishingEmbed(fishingInfo, balance);
    const buttons = createFishingButtons(fishingInfo.hasRod, fishingInfo.cooldown > 0);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleFishingSelectTool(interaction, userId) {
    // Ensure user has default tools
    userManager.ensureDefaultTools(userId);

    const rods = fishing.getAllRods(userId);
    const balance = economyManager.getBalance(userId);

    if (rods.length === 0) {
        const embed = createErrorEmbed('❌ Bạn chưa có cần câu! Hãy quay gacha Tool & Kit để nhận cần câu.');
        await interaction.editReply({ embeds: [embed], components: createFishingButtons(false, false) });
        return;
    }

    // Always show rod selection menu - let user choose which tool to use
    const selectMenu = createFishingRodSelectMenu(rods);

    const embed = createFishingEmbed(fishing.getFishingInfo(userId), balance);
    embed.setDescription(
        '**🎣 Chọn cần câu để câu cá:**\n\n' +
        rods.map((r, i) => `${i + 1}. ${getRarityEmoji(r.rarity)} **${r.name}** (+${Math.round(r.bonus.bonusRarity * 100)}% cá hiếm)`).join('\n')
    );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('minigame_fishing')
                .setLabel('⬅️ Quay lại')
                .setStyle(ButtonStyle.Secondary)
        );

    const components = selectMenu ? [selectMenu, backRow] : [backRow];
    await interaction.editReply({ embeds: [embed], components });
}

// ========== SCRATCH CARD HANDLERS ==========

async function handleScratchCardMenu(interaction, userId) {
    const balance = economyManager.getBalance(userId);
    const embed = createScratchCardEmbed(balance);
    const buttons = createScratchCardButtons(balance);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

async function handleScratchCard(interaction, userId, customId) {
    let cardType;

    // Kiểm tra xem đây là nút "Cào tiếp" hay nút mua mới
    if (customId.startsWith('scratch_continue_')) {
        // Cào tiếp: scratch_continue_basic, scratch_continue_silver, scratch_continue_gold
        cardType = customId.replace('scratch_continue_', '');
    } else {
        // Mua mới: scratch_basic, scratch_silver, scratch_gold
        cardType = customId.replace('scratch_', '');
    }

    const result = scratchCard.scratch(userId, cardType);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'invalid_card') {
            errorMsg = '❌ Loại thẻ không hợp lệ!';
        } else if (result.error === 'insufficient_balance') {
            errorMsg = `❌ Không đủ DCoin! Cần: ${result.required} DCoin`;
        }
        const embed = createErrorEmbed(errorMsg);
        const balance = economyManager.getBalance(userId);
        await interaction.editReply({ embeds: [embed], components: createScratchCardButtons(balance) });
        return;
    }

    const embed = createScratchCardResultEmbed(result);
    // Truyền cardType để nút "Cào tiếp" biết loại thẻ cần cào
    const buttons = createScratchCardResultButtons(result.newBalance, cardType);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

module.exports = { handleButton, activeGames };
