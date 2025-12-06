const reportManager = require('../managers/reportManager');
const shopManager = require('../managers/shopManager');
const inventoryManager = require('../managers/inventoryManager');
const economyManager = require('../managers/economyManager');
const config = require('../config');
const itemManager = require('../managers/itemManager');
const mailboxManager = require('../managers/mailboxManager');
const userManager = require('../managers/userManager');
const { createSuccessEmbed, createErrorEmbed, createCosmeticsEmbed } = require('../ui/embeds/coreEmbeds');
const { createHelpEmbed, createMailboxEmbed } = require('../ui/embeds/secondaryEmbeds');
const { createShopSellEmbed, createTransactionResultEmbed } = require('../ui/embeds/shopEmbeds');
const { createHelpButtons, createMailboxButtons, createBackButtonRow } = require('../ui/buttons/navigationButtons');
const { createHelpSelectMenu, createCosmeticSelectMenu } = require('../ui/menus/selectMenus');
const { createSellQuantityButtons } = require('../ui/buttons/shopButtons');
const { REPORT_TYPES, INVENTORY_BUTTONS } = require('../utils/constants');
const { formatNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Handle modal submit interactions
 * @param {ModalSubmitInteraction} interaction
 */
async function handleModalSubmit(interaction) {
    const customId = interaction.customId;

    try {
        if (customId === 'modal_feedback') {
            await handleFeedbackSubmit(interaction);
        } else if (customId === 'modal_bug_report') {
            await handleBugReportSubmit(interaction);
        } else if (customId === 'modal_lucky_number_guess') {
            await handleLuckyNumberGuessSubmit(interaction);
        } else if (customId.startsWith('modal_bet_')) {
            await handleBetModalSubmit(interaction);
        } else if (customId === 'modal_dice_guess') {
            await handleDiceGuessSubmit(interaction);
        } else if (customId === 'modal_roulette_number') {
            await handleRouletteNumberSubmit(interaction);
        } else if (customId === 'modal_mail_compose') {
            await handleMailComposeSubmit(interaction);
        } else if (customId === 'modal_trade_dcoin') {
            await handleTradeDCoinSubmit(interaction);
        } else if (customId.startsWith('modal_trade_gift_')) {
            await handleTradeGiftItemSubmit(interaction, customId);
        } else if (customId === 'rps_custom_bet_modal') {
            await handleRPSCustomBetSubmit(interaction);
        }
    } catch (error) {
        logger.error('Modal handler error', { customId, error: error.message });

        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ Đã xảy ra lỗi khi xử lý form!',
                ephemeral: true
            });
        }
    }
}

/**
 * Handle feedback submission
 * @param {ModalSubmitInteraction} interaction
 */
async function handleFeedbackSubmit(interaction) {
    const title = interaction.fields.getTextInputValue('feedback_title');
    const content = interaction.fields.getTextInputValue('feedback_content');

    reportManager.createReport({
        discord_id: interaction.user.id,
        username: interaction.user.username,
        type: REPORT_TYPES.FEEDBACK,
        title,
        content
    });

    const embed = createSuccessEmbed('Cảm ơn bạn đã góp ý!\nChúng tôi sẽ xem xét và phản hồi sớm nhất có thể.');
    await interaction.reply({ embeds: [embed], ephemeral: true });

    logger.info('Feedback submitted', { user: interaction.user.id, title });
}

/**
 * Handle bug report submission
 * @param {ModalSubmitInteraction} interaction
 */
async function handleBugReportSubmit(interaction) {
    const title = interaction.fields.getTextInputValue('bug_title');
    const content = interaction.fields.getTextInputValue('bug_steps');

    reportManager.createReport({
        discord_id: interaction.user.id,
        username: interaction.user.username,
        type: REPORT_TYPES.BUG,
        title,
        content
    });

    const embed = createSuccessEmbed('Cảm ơn bạn đã báo lỗi!\nChúng tôi sẽ khắc phục sớm nhất có thể.');
    await interaction.reply({ embeds: [embed], ephemeral: true });

    logger.info('Bug report submitted', { user: interaction.user.id, title });
}

/**
 * Handle custom bet modal
 * @param {ModalSubmitInteraction} interaction
 */
async function handleBetModalSubmit(interaction) {
    const betAmount = parseInt(interaction.fields.getTextInputValue('bet_amount'));
    const customId = interaction.customId;
    let gameType = customId.replace('modal_bet_', '');
    const userId = interaction.user.id;
    const balance = economyManager.getBalance(userId);
    const maxAllowed = Math.min(config.casino.maxBet, balance);

    // Check if this is a dice modal with bet type (format: dice_BETTYPE)
    let diceBetType = null;
    if (gameType.startsWith('dice_')) {
        diceBetType = gameType.replace('dice_', '');
        gameType = 'dice'; // Normalize for later checks
    }

    if (isNaN(betAmount) || betAmount <= 0) {
        await interaction.reply({
            content: '❌ Số tiền cược không hợp lệ!',
            ephemeral: true
        });
        return;
    }

    if (betAmount > maxAllowed) {
        await interaction.reply({
            content: `❌ Số tiền tối đa cho phép là ${maxAllowed.toLocaleString()} DCoin`,
            ephemeral: true
        });
        return;
    }

    // Integrate with game flows via session data
    const sessionManager = require('../managers/sessionManager');
    const session = sessionManager.updateSession(userId, gameType, { customBet: betAmount, diceBetType });

    // Immediate sync for Slots/Coinflip/Dice/Roulette/RPS/Blackjack/Crash/Wheel: update active game state and edit the original message
    if (gameType === 'slots' || gameType === 'coinflip' || gameType === 'dice' || gameType === 'roulette' || gameType === 'rps' || gameType === 'blackjack' || gameType === 'crash' || gameType === 'wheel') {
        try {
            // Update activeGames bet amount so subsequent actions use new value
            const { createSlotsWaitingEmbed, createRouletteEmbed, createCasinoMenuEmbed } = require('../ui/embeds/casinoEmbeds');
            const { createSlotsButtons, createCoinFlipButtons, createRouletteBetButtons, createRPSButtons, createBlackjackBetButtons } = require('../ui/buttons/gameButtons');
            const balanceNow = economyManager.getBalance(userId);

            // Persist into in-memory game state used by button handler
            const buttonHandler = require('../handlers/buttonHandler');
            if (buttonHandler && buttonHandler.activeGames && buttonHandler.activeGames.set) {
                if (gameType === 'slots') buttonHandler.activeGames.set(`slots_${userId}`, { betAmount });
                if (gameType === 'roulette') {
                    const existingGame = buttonHandler.activeGames.get(`roulette_${userId}`);
                    if (existingGame) {
                        existingGame.betAmount = betAmount;
                    } else {
                        const roulette = require('../games/casino/roulette');
                        const newGame = roulette.createGame(userId);
                        newGame.betAmount = betAmount;
                        buttonHandler.activeGames.set(`roulette_${userId}`, newGame);
                    }
                }
                if (gameType === 'crash') {
                    const existingGame = buttonHandler.activeGames.get(`crash_${userId}`);
                    if (existingGame) {
                        existingGame.betAmount = betAmount;
                    } else {
                        buttonHandler.activeGames.set(`crash_${userId}`, { betAmount, targetMultiplier: 2 });
                    }
                }
                if (gameType === 'wheel') {
                    buttonHandler.activeGames.set(`wheel_${userId}`, { betAmount });
                }
            }

            // Edit the message if we know it
            if (session && session.channelId && session.messageId) {
                const channel = await interaction.client.channels.fetch(session.channelId);
                const message = await channel.messages.fetch(session.messageId);
                if (gameType === 'slots') {
                    const embed = createSlotsWaitingEmbed(balanceNow, betAmount);
                    const components = createSlotsButtons(betAmount, balanceNow);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'coinflip') {
                    const { createCoinFlipEmbed } = require('../ui/embeds/miniGameEmbeds');
                    const embed = createCoinFlipEmbed(balanceNow, betAmount);
                    const components = createCoinFlipButtons(balanceNow, betAmount);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'rps') {
                    const { createRPSEmbed } = require('../ui/embeds/miniGameEmbeds');
                    const embed = createRPSEmbed(balanceNow, betAmount);
                    const components = createRPSButtons(balanceNow, betAmount);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'blackjack') {
                    const embed = createCasinoMenuEmbed(balanceNow);
                    embed.setTitle('🃏 XÌ DÁCH - Chọn mức cược');
                    embed.setDescription(`💰 Đã chọn cược: **${betAmount.toLocaleString()} DCoin**\n\nNhấn nút bên dưới để bắt đầu chơi!`);
                    const components = createBlackjackBetButtons(balanceNow, betAmount);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'dice' && diceBetType) {
                    // Dice with specific bet type - show button with custom amount
                    const { createDiceEmbed } = require('../ui/embeds/miniGameEmbeds');
                    const { createDiceCustomBetButton } = require('../ui/buttons/miniGameButtons');
                    const taixiu = require('../games/casino/taixiu');
                    const betOption = taixiu.BET_OPTIONS[diceBetType.toUpperCase()];
                    const embed = createDiceEmbed(balanceNow);
                    embed.setDescription(`🎲 Đã chọn kiểu cược: **${betOption?.name || diceBetType}**\n💰 Số tiền cược: **${betAmount.toLocaleString()} DCoin**\n\nNhấn nút bên dưới để tung xúc xắc!`);
                    const components = createDiceCustomBetButton(diceBetType, betAmount);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'dice') {
                    // Dice without bet type - fallback to bet buttons
                    const { createDiceEmbed } = require('../ui/embeds/miniGameEmbeds');
                    const { createDiceBetButtons } = require('../ui/buttons/miniGameButtons');
                    const embed = createDiceEmbed(balanceNow);
                    embed.setDescription('🎲 Đã đặt cược tùy chỉnh. Chọn kiểu cược để tiếp tục!');
                    const components = createDiceBetButtons();
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'roulette') {
                    const rouletteGame = buttonHandler.activeGames.get(`roulette_${userId}`);
                    const embed = createRouletteEmbed(rouletteGame || { bets: [] }, balanceNow);
                    embed.setDescription(`🎡 Đã đặt mức cược: **${betAmount.toLocaleString()} DCoin**\n\nChọn loại cược để đặt cược!`);
                    const components = createRouletteBetButtons(balanceNow, betAmount);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'crash') {
                    // Crash game custom bet - preserve targetMultiplier
                    const { createCrashEmbed } = require('../ui/embeds/casinoEmbeds');
                    const { createCrashButtons } = require('../ui/buttons/gameButtons');
                    const crashGame = buttonHandler.activeGames.get(`crash_${userId}`);
                    const targetMultiplier = crashGame?.targetMultiplier || 2;
                    const embed = createCrashEmbed(balanceNow, betAmount, targetMultiplier);
                    const components = createCrashButtons(balanceNow, betAmount, targetMultiplier);
                    await message.edit({ embeds: [embed], components });
                } else if (gameType === 'wheel') {
                    // Wheel game custom bet
                    const { createWheelEmbed } = require('../ui/embeds/casinoEmbeds');
                    const { createWheelButtons } = require('../ui/buttons/gameButtons');
                    const embed = createWheelEmbed(balanceNow, betAmount);
                    const components = createWheelButtons(balanceNow, betAmount);
                    await message.edit({ embeds: [embed], components });
                }
            }
        } catch (e) {
            // Non-fatal: just log and continue
            const logger = require('../utils/logger');
            logger.error('Bet modal sync error', { gameType, error: e.message });
        }
    }

    await interaction.reply({
        content: `✅ Đã đặt cược ${betAmount.toLocaleString()} DCoin cho ${gameType.toUpperCase()}.`,
        ephemeral: true
    });
}

/**
 * Handle dice guess modal
 * NOTE: This modal is deprecated - Tài Xỉu game now uses button-based UI
 * Keeping for backwards compatibility but should not be called
 * @param {ModalSubmitInteraction} interaction
 */
async function handleDiceGuessSubmit(interaction) {
    const guess = parseInt(interaction.fields.getTextInputValue('dice_guess'));
    const betAmount = parseInt(interaction.fields.getTextInputValue('dice_bet'));

    // Validate guess - Tài Xỉu uses 3 dice, total 3-18
    // But this modal was designed for 2 dice (2-12)
    // For now, we convert guess to closest valid bet type
    if (isNaN(guess) || guess < 3 || guess > 18) {
        await interaction.reply({
            content: '❌ Số đoán phải từ 3-18 (tổng 3 xúc xắc)!',
            ephemeral: true
        });
        return;
    }

    if (isNaN(betAmount) || betAmount <= 0) {
        await interaction.reply({
            content: '❌ Số tiền cược không hợp lệ!',
            ephemeral: true
        });
        return;
    }

    const taixiu = require('../games/casino/taixiu');

    // Convert guess to bet type (TOTAL_4 through TOTAL_17)
    // Note: Total 3 and 18 only possible via triple, which loses on total bets
    const betType = guess >= 4 && guess <= 17 ? `TOTAL_${guess}` : (guess >= 11 ? 'TAI' : 'XIU');

    const result = taixiu.rollDice(interaction.user.id, betType, betAmount);

    if (result.error) {
        let errorMsg = result.error;
        if (result.error === 'insufficient_balance') errorMsg = 'Không đủ DCoin!';
        if (result.error === 'bet_too_low') errorMsg = `Cược tối thiểu: ${result.min} DCoin`;
        if (result.error === 'bet_too_high') errorMsg = `Cược tối đa: ${result.max} DCoin`;
        if (result.error === 'cooldown') errorMsg = `Chờ ${result.remaining} giây!`;

        await interaction.reply({
            content: `❌ ${errorMsg}`,
            ephemeral: true
        });
        return;
    }

    // Build result message
    const diceDisplay = taixiu.formatDiceDisplay(result.dice);
    const statusEmoji = result.won ? '✅' : '❌';
    const resultText = result.won
        ? `+${result.winnings.toLocaleString()} DCoin`
        : `-${result.betAmount.toLocaleString()} DCoin`;

    await interaction.reply({
        content: `🎲 **Tài Xỉu**\n\n${diceDisplay}\n\n**Tổng:** ${result.total}\n${statusEmoji} **Kết quả:** ${resultText}`,
        ephemeral: false
    });
}

/**
 * Handle roulette number modal
 * @param {ModalSubmitInteraction} interaction
 */
async function handleRouletteNumberSubmit(interaction) {
    const number = parseInt(interaction.fields.getTextInputValue('roulette_number'));
    const betAmount = parseInt(interaction.fields.getTextInputValue('roulette_bet'));

    if (isNaN(number) || number < 0 || number > 36) {
        await interaction.reply({
            content: '❌ Số phải từ 0-36!',
            ephemeral: true
        });
        return;
    }

    if (isNaN(betAmount) || betAmount <= 0) {
        await interaction.reply({
            content: '❌ Số tiền cược không hợp lệ!',
            ephemeral: true
        });
        return;
    }

    await interaction.reply({
        content: `✅ Đã đặt ${betAmount.toLocaleString()} DCoin vào số ${number}`,
        ephemeral: true
    });
}

/**
 * Handle select menu interactions
 * @param {StringSelectMenuInteraction} interaction
 */
async function handleSelectMenu(interaction) {
    const customId = interaction.customId;
    const value = interaction.values[0];
    const userId = interaction.user.id;

    // Skip ownership check for help menus (public)
    if (customId !== 'help_category') {
        // PLAYER ISOLATION: Check if this user is the owner of this embed
        const originalOwnerId = interaction.message.interactionMetadata?.user?.id;

        if (originalOwnerId && originalOwnerId !== userId) {
            await interaction.reply({
                content: '❌ Đây không phải embed của bạn! Dùng `/startplaying` để mở menu riêng.',
                ephemeral: true
            });
            logger.info('Blocked user from using another user\'s select menu', {
                clickerId: userId,
                ownerId: originalOwnerId
            });
            return;
        }
    }

    try {
        await interaction.deferUpdate();

        if (customId === 'help_category') {
            const embed = createHelpEmbed(value);
            const selectMenu = createHelpSelectMenu();
            const buttons = createHelpButtons();

            await interaction.editReply({
                embeds: [embed],
                components: [selectMenu, ...buttons]
            });
        }
        // Gacha banner selection
        else if (customId === 'gacha_banner') {
            const bannerId = parseInt(value.replace('banner_', ''));
            const gachaManager = require('../games/gacha/gachaManager');
            const economyManager = require('../managers/economyManager');
            const userManager = require('../managers/userManager');
            const { createBannerDetailEmbed } = require('../ui/embeds/gachaEmbeds');
            const { createGachaButtons } = require('../ui/buttons/navigationButtons');

            const banner = gachaManager.getBannerById(bannerId);
            const pool = gachaManager.getBannerPool(bannerId);
            const balance = economyManager.getBalance(interaction.user.id);
            const pity = gachaManager.getPityCounter(interaction.user.id);

            // Lấy database user ID để hiển thị per-banner guarantee
            const user = userManager.getUser(interaction.user.id);
            const dbUserId = user?.id || null;

            // Store selected banner in session
            const sessionManager = require('../managers/sessionManager');
            sessionManager.updateSession(interaction.user.id, 'gacha', { bannerId });
            const activeGames = require('../handlers/buttonHandler').activeGames || new Map();
            activeGames.set && activeGames.set(`gacha_${interaction.user.id}`, { bannerId });

            const embed = createBannerDetailEmbed(banner, pool, balance, pity, dbUserId);
            const cost1 = banner.cost_per_pull;
            const cost10 = cost1 * 10;
            const buttons = createGachaButtons(balance >= cost1, balance >= cost10, cost1, cost10);

            await interaction.editReply({ embeds: [embed], components: buttons });
        }
        // Shop sell select - khi chọn item để bán
        else if (customId === 'shop_sell_select') {
            await handleShopSellSelect(interaction, value);
        }
        // Shop buy select - khi chọn item để mua
        else if (customId === 'shop_buy_select') {
            await handleShopBuySelect(interaction, value);
        }
        // Mining pickaxe selection
        else if (customId === 'mining_pickaxe_select') {
            await handleMiningPickaxeSelect(interaction, value);
        }
        // Fishing rod selection
        else if (customId === 'fishing_rod_select') {
            await handleFishingRodSelect(interaction, value);
        }
        // Cosmetic equip/unequip selection
        else if (customId === 'cosmetic_select') {
            await handleCosmeticSelect(interaction, value);
        }
        // Trade gift item selection
        else if (customId === 'trade_gift_select') {
            await handleTradeGiftSelect(interaction, value);
        }
        // Inventory item selection - show item detail
        else if (customId === 'inventory_item') {
            await handleInventoryItemSelect(interaction, value);
        }
        // Mail item selection - show mail detail
        else if (customId === 'mail_item') {
            await handleMailItemSelect(interaction, value);
        }

    } catch (error) {
        logger.error('Select menu handler error', { customId, error: error.message });
    }
}

/**
 * Handle shop sell item selection
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: sell_itemId
 */
async function handleShopSellSelect(interaction, value) {
    const userId = interaction.user.id;
    const itemId = parseInt(value.replace('sell_', ''));

    // Lấy thông tin item từ inventory
    const inventoryItem = inventoryManager.getInventoryItem(userId, itemId);

    if (!inventoryItem) {
        await interaction.followUp({
            content: '❌ Không tìm thấy vật phẩm này trong kho!',
            ephemeral: true
        });
        return;
    }

    const item = itemManager.getItemById(itemId);

    // Giá bán = 100% base_value (khớp với shopManager.sellToShop)
    const sellPrice = item.base_value;

    const { EmbedBuilder } = require('discord.js');
    const config = require('../config');
    const { formatNumber } = require('../utils/helpers');

    const embed = new EmbedBuilder()
        .setTitle('💰 Xác nhận bán')
        .setDescription(`Bạn muốn bán **${item.name}**?\n\n` +
            `📦 Số lượng trong kho: **${inventoryItem.quantity}**\n` +
            `💵 Giá bán: **${formatNumber(sellPrice)} DCoin**/cái`)
        .setColor(config.colors.warning)
        .setFooter({ text: 'Chọn số lượng muốn bán' });

    const buttons = createSellQuantityButtons(itemId, inventoryItem.quantity);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * Handle shop buy item selection
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: buy_itemId
 */
async function handleShopBuySelect(interaction, value) {
    const userId = interaction.user.id;
    const itemId = parseInt(value.replace('buy_', ''));

    // Get shop item with correct price from shopManager
    const shopItems = shopManager.getShopItems();
    const shopItem = shopItems.find(s => s.id === itemId);

    if (!shopItem) {
        await interaction.followUp({
            content: '❌ Vật phẩm không có trong cửa hàng!',
            ephemeral: true
        });
        return;
    }

    // Giá mua = shopItem.price (đã định nghĩa trong SHOP_ITEMS)
    const shopPrice = shopItem.price;
    const balance = economyManager.getBalance(userId);

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const config = require('../config');
    const { formatNumber } = require('../utils/helpers');

    const embed = new EmbedBuilder()
        .setTitle('🛒 Xác nhận mua')
        .setDescription(`Bạn muốn mua **${shopItem.name}**?\n\n` +
            `💵 Giá: **${formatNumber(shopPrice)} DCoin**/cái\n` +
            `💰 Số dư: **${formatNumber(balance)} DCoin**`)
        .setColor(config.colors.primary)
        .setFooter({ text: 'Chọn số lượng muốn mua' });

    const maxBuy = Math.floor(balance / shopPrice);
    const quantities = [1, 5, 10].filter(q => q <= maxBuy);

    if (quantities.length === 0) {
        await interaction.followUp({
            content: '❌ Không đủ DCoin để mua vật phẩm này!',
            ephemeral: true
        });
        return;
    }

    const row = new ActionRowBuilder();
    quantities.forEach(qty => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`buy_confirm_${itemId}_${qty}`)
                .setLabel(`x${qty} (${formatNumber(shopPrice * qty)} 💰)`)
                .setStyle(ButtonStyle.Success)
        );
    });

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('shop_buy')
                .setLabel('❌ Hủy')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [row, row2] });
}

/**
 * Handle mail compose submit
 * @param {ModalSubmitInteraction} interaction
 */
async function handleMailComposeSubmit(interaction) {
    const userId = interaction.user.id;

    const recipient = interaction.fields.getTextInputValue('mail_recipient').trim();
    const subject = interaction.fields.getTextInputValue('mail_subject').trim();
    const content = interaction.fields.getTextInputValue('mail_content')?.trim() || '';
    const dcoinStr = interaction.fields.getTextInputValue('mail_dcoin')?.trim() || '0';

    // Parse DCoin amount
    const dcoin = parseInt(dcoinStr) || 0;

    // Validate DCoin
    if (dcoin < 0) {
        await interaction.reply({
            embeds: [createErrorEmbed('Số DCoin không hợp lệ!')],
            ephemeral: true
        });
        return;
    }

    // Send the mail
    const result = mailboxManager.sendMailToUser(userId, recipient, {
        subject,
        content,
        dcoin
    });

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi khi gửi thư!';
        switch (result.error) {
            case 'sender_not_found':
                errorMsg = 'Không tìm thấy thông tin của bạn!';
                break;
            case 'recipient_not_found':
                errorMsg = 'Không tìm thấy người nhận! Kiểm tra lại Discord ID hoặc tên.';
                break;
            case 'cannot_send_to_self':
                errorMsg = 'Bạn không thể gửi thư cho chính mình!';
                break;
            case 'insufficient_balance':
                errorMsg = 'Bạn không có đủ DCoin để gửi!';
                break;
            case 'invalid_dcoin_amount':
                errorMsg = 'Số DCoin không hợp lệ!';
                break;
            case 'send_failed':
                errorMsg = 'Gửi thư thất bại! Vui lòng thử lại.';
                break;
        }

        await interaction.reply({
            embeds: [createErrorEmbed(errorMsg)],
            ephemeral: true
        });
        return;
    }

    // Success!
    let successMsg = `✅ Đã gửi thư cho **${result.recipient}** thành công!`;
    if (result.dcoin > 0) {
        successMsg += `\n💰 Đã chuyển **${formatNumber(result.dcoin)} DCoin**`;
    }

    // Update the embed to show mailbox again
    const { mails, pagination } = mailboxManager.getMailbox(userId);
    const unreadCount = mailboxManager.getUnreadCount(userId);

    const mailboxEmbed = createMailboxEmbed(mails, pagination, unreadCount);
    const buttons = createMailboxButtons(pagination.hasPrev, pagination.hasNext, unreadCount > 0);

    // Reply with success message (ephemeral) and update the mailbox view
    await interaction.reply({
        embeds: [createSuccessEmbed(successMsg)],
        ephemeral: true
    });

    // Try to update the original message
    try {
        await interaction.message.edit({ embeds: [mailboxEmbed], components: buttons });
    } catch (e) {
        // Ignore if can't edit (message might be old)
    }

    logger.info('Mail sent by user', {
        sender: userId,
        recipient: result.recipient,
        dcoin: result.dcoin
    });
}

/**
 * Handle mining pickaxe selection
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: pickaxe_itemId
 */
async function handleMiningPickaxeSelect(interaction, value) {
    const userId = interaction.user.id;
    const pickaxeId = parseInt(value.replace('pickaxe_', ''));

    // Store selected pickaxe
    const buttonHandler = require('../handlers/buttonHandler');
    if (buttonHandler.activeGames) {
        buttonHandler.activeGames.set(`mining_tool_${userId}`, pickaxeId);
    }

    // Start mining session with selected pickaxe (V2 flow)
    const mining = require('../games/mini/mining');
    const { createMiningStartEmbed } = require('../ui/embeds/interactiveGameEmbeds');
    const { createMiningLocationButtons } = require('../ui/buttons/interactiveGameButtons');
    const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');

    // Start mining session with selected pickaxe
    const result = mining.startMining(userId, pickaxeId);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_pickaxe') {
            errorMsg = '❌ Cuốc không hợp lệ hoặc không còn tồn tại!';
        } else if (result.error === 'cooldown') {
            errorMsg = `⏳ Vui lòng chờ **${result.remaining}** giây trước khi đào tiếp!`;
        }
        const embed = createErrorEmbed(errorMsg);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('mining_v2') });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const embed = createMiningStartEmbed(result.pickaxe, result.locations, balance);
    const buttons = createMiningLocationButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });

    logger.info('Mining session started with selected pickaxe', { userId, pickaxeId, pickaxeName: result.pickaxe.name });
}

/**
 * Handle fishing rod selection
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: rod_itemId
 */
async function handleFishingRodSelect(interaction, value) {
    const userId = interaction.user.id;
    const rodId = parseInt(value.replace('rod_', ''));

    // Store selected rod
    const buttonHandler = require('../handlers/buttonHandler');
    if (buttonHandler.activeGames) {
        buttonHandler.activeGames.set(`fishing_tool_${userId}`, rodId);
    }

    // Start fishing session with selected rod (V2 flow)
    const fishing = require('../games/mini/fishing');
    const { createFishingStartEmbed } = require('../ui/embeds/interactiveGameEmbeds');
    const { createFishingLocationButtons } = require('../ui/buttons/interactiveGameButtons');
    const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');

    // Start fishing session with selected rod
    const result = fishing.startFishing(userId, rodId);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_rod') {
            errorMsg = '❌ Cần câu không hợp lệ hoặc không còn tồn tại!';
        } else if (result.error === 'cooldown') {
            errorMsg = `⏳ Vui lòng chờ **${result.remaining}** giây trước khi câu tiếp!`;
        }
        const embed = createErrorEmbed(errorMsg);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('fishing_v2') });
        return;
    }

    const balance = economyManager.getBalance(userId);
    const embed = createFishingStartEmbed(result.rod, result.locations, balance);
    const buttons = createFishingLocationButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });

    logger.info('Fishing session started with selected rod', { userId, rodId, rodName: result.rod.name });
}

/**
 * Handle cosmetic equip/unequip selection
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: cosmetic_itemId or unequip_TYPE
 */
async function handleCosmeticSelect(interaction, value) {
    const userId = interaction.user.id;

    // Check if this is an unequip action - these execute immediately
    if (value.startsWith('unequip_')) {
        const cosmeticType = value.replace('unequip_', '');
        const success = userManager.unequipCosmetic(userId, cosmeticType);

        if (success) {
            // Refresh cosmetics view
            await refreshCosmeticsView(interaction, userId, `✅ Đã tháo trang bị ${getCosmeticTypeName(cosmeticType)}!`);
        } else {
            await interaction.followUp({
                content: '❌ Không thể tháo trang bị!',
                ephemeral: true
            });
        }
        return; // Important: exit after handling unequip
    }

    // Store selected cosmetic for "Trang bị" button
    if (value.startsWith('cosmetic_')) {
        const itemIdStr = value.replace('cosmetic_', '');
        const itemId = parseInt(itemIdStr); // Convert to integer to match database ID
        const shopItems = shopManager.getShopItems();

        // Find shop item by database ID (integer)
        let shopItem = shopItems.find(s => s.id === itemId);

        if (!shopItem) {
            // Try by inventory item name match
            const { items } = inventoryManager.getInventory(userId, 1, 100);
            const invItem = items.find(i => i.id === itemId);
            if (invItem) {
                shopItem = shopItems.find(s => s.name === invItem.name && s.type === 'COSMETIC');
            }
        }

        if (!shopItem || !shopItem.metadata?.cosmetic_type) {
            await interaction.followUp({
                content: '❌ Không tìm thấy thông tin cosmetic!',
                ephemeral: true
            });
            return;
        }

        // Store selection for button
        const buttonHandler = require('./buttonHandler');
        if (buttonHandler.activeGames) {
            buttonHandler.activeGames.set(`cosmetic_selected_${userId}`, {
                itemId: shopItem.id,
                itemName: shopItem.name,
                cosmeticType: shopItem.metadata.cosmetic_type
            });
        }

        // Show confirmation in embed
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const { INVENTORY_BUTTONS } = require('../utils/constants');
        const { createCosmeticSelectMenu } = require('../ui/menus/selectMenus');

        const { items } = inventoryManager.getInventory(userId, 1, 100);
        const ownedCosmetics = [];
        for (const invItem of items) {
            const matchedShop = shopItems.find(s => s.name === invItem.name && s.type === 'COSMETIC');
            if (matchedShop) {
                ownedCosmetics.push({ ...matchedShop, quantity: invItem.quantity });
            }
        }

        const equipped = userManager.getEquippedCosmetics(userId);
        const hasEquipped = equipped.profile_theme || equipped.profile_border || equipped.profile_badge || equipped.home_theme;

        const embed = new EmbedBuilder()
            .setTitle('✨ Quản lý Trang bị')
            .setDescription(`**Đã chọn:** 🎯 **${shopItem.name}**\n*${getCosmeticTypeName(shopItem.metadata.cosmetic_type)}*\n\n👇 Nhấn **"✅ Trang bị"** để xác nhận`)
            .setColor(0x00BFFF)
            .setFooter({ text: 'Chọn cosmetic khác hoặc nhấn nút bên dưới' });

        const cosmeticSelect = createCosmeticSelectMenu(ownedCosmetics, equipped);

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('cosmetic_equip_selected')
                .setLabel('✅ Trang bị')
                .setStyle(ButtonStyle.Success),
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

        const components = [];
        if (cosmeticSelect) components.push(cosmeticSelect);
        components.push(actionRow);

        await interaction.editReply({ embeds: [embed], components });
    }
}

/**
 * Refresh the cosmetics view after equip/unequip
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} userId
 * @param {string} message - Success message to show
 */
async function refreshCosmeticsView(interaction, userId, message) {
    // Get user's owned cosmetic items from inventory
    const { items } = inventoryManager.getInventory(userId, 1, 100);
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

    // Create embed and select menu
    const embed = createCosmeticsEmbed(userId, ownedCosmetics);
    embed.setDescription(embed.data.description + `\n\n${message}`);

    const cosmeticSelect = createCosmeticSelectMenu(ownedCosmetics, equipped);
    const backButtonRows = createBackButtonRow(INVENTORY_BUTTONS.PREV);

    // Build components - select menu (if exists) + back button
    const components = [];
    if (cosmeticSelect) {
        components.push(cosmeticSelect);
    }
    // createBackButtonRow returns an array, so spread it
    components.push(...backButtonRows);

    await interaction.editReply({ embeds: [embed], components });
}

/**
 * Get human-readable name for cosmetic type
 * @param {string} type
 * @returns {string}
 */
function getCosmeticTypeName(type) {
    const names = {
        'PROFILE_THEME': 'Theme Profile',
        'PROFILE_BORDER': 'Khung Profile',
        'PROFILE_BADGE': 'Huy hiệu',
        'HOME_THEME': 'Theme Home'
    };
    return names[type] || type;
}

/**
 * Handle trade DCoin modal submit
 * @param {ModalSubmitInteraction} interaction
 */
async function handleTradeDCoinSubmit(interaction) {
    const userId = interaction.user.id;
    const recipientInput = interaction.fields.getTextInputValue('trade_recipient').trim();
    const amountStr = interaction.fields.getTextInputValue('trade_amount').trim();
    const amount = parseInt(amountStr);

    // Validate amount
    if (isNaN(amount) || amount <= 0) {
        await interaction.reply({
            content: '❌ Số DCoin không hợp lệ! Vui lòng nhập số dương.',
            ephemeral: true
        });
        return;
    }

    // Extract user ID from mention or raw ID
    let recipientId = recipientInput;
    const mentionMatch = recipientInput.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        recipientId = mentionMatch[1];
    }

    // Check if self-transfer
    if (recipientId === userId) {
        await interaction.reply({
            content: '❌ Bạn không thể chuyển DCoin cho chính mình!',
            ephemeral: true
        });
        return;
    }

    // Execute transfer
    const result = economyManager.transferDCoin(userId, recipientId, amount);

    if (result.error) {
        let errorMsg = '❌ Lỗi khi chuyển DCoin!';
        switch (result.error) {
            case 'insufficient_balance':
                errorMsg = '❌ Bạn không có đủ DCoin!';
                break;
            case 'recipient_not_found':
                errorMsg = '❌ Không tìm thấy người nhận! Đảm bảo họ đã sử dụng bot.';
                break;
            case 'same_user':
                errorMsg = '❌ Không thể chuyển cho chính mình!';
                break;
        }
        await interaction.reply({ content: errorMsg, ephemeral: true });
        return;
    }

    // Success
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setTitle('✅ Chuyển DCoin thành công!')
        .setDescription(`Bạn đã chuyển **${formatNumber(amount)} DCoin** cho <@${recipientId}>`)
        .setColor(0x00FF00)
        .addFields(
            { name: '💰 Số dư mới', value: `${formatNumber(result.newBalance)} DCoin`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    logger.info('DCoin transferred via trade modal', { from: userId, to: recipientId, amount });
}

/**
 * Handle trade gift item select - show modal to enter recipient
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: gift_item_itemId
 */
async function handleTradeGiftSelect(interaction, value) {
    const userId = interaction.user.id;
    const itemId = parseInt(value.replace('gift_item_', ''));

    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

    const item = itemManager.getItemById(itemId);
    const inventoryItem = inventoryManager.getInventoryItem(userId, itemId);

    if (!inventoryItem) {
        await interaction.followUp({ content: '❌ Bạn không có vật phẩm này!', ephemeral: true });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_trade_gift_${itemId}`)
        .setTitle(`🎁 Tặng ${item.name}`);

    const recipientInput = new TextInputBuilder()
        .setCustomId('gift_recipient')
        .setLabel('User ID hoặc @mention người nhận')
        .setPlaceholder('Ví dụ: 123456789012345678 hoặc @username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const quantityInput = new TextInputBuilder()
        .setCustomId('gift_quantity')
        .setLabel(`Số lượng (Có: ${inventoryItem.quantity})`)
        .setPlaceholder('1')
        .setValue('1')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(recipientInput),
        new ActionRowBuilder().addComponents(quantityInput)
    );

    await interaction.showModal(modal);
}

/**
 * Handle trade gift item modal submit
 * @param {ModalSubmitInteraction} interaction
 * @param {string} customId - format: modal_trade_gift_itemId
 */
async function handleTradeGiftItemSubmit(interaction, customId) {
    const userId = interaction.user.id;
    const itemId = parseInt(customId.replace('modal_trade_gift_', ''));

    const recipientInput = interaction.fields.getTextInputValue('gift_recipient').trim();
    const quantityStr = interaction.fields.getTextInputValue('gift_quantity').trim();
    const quantity = parseInt(quantityStr) || 1;

    // Extract user ID from mention or raw ID
    let recipientId = recipientInput;
    const mentionMatch = recipientInput.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        recipientId = mentionMatch[1];
    }

    // Check if self-trade
    if (recipientId === userId) {
        await interaction.reply({
            content: '❌ Bạn không thể tặng cho chính mình!',
            ephemeral: true
        });
        return;
    }

    // Check if recipient exists
    const recipient = userManager.getUser(recipientId);
    if (!recipient) {
        await interaction.reply({
            content: '❌ Không tìm thấy người nhận! Đảm bảo họ đã sử dụng bot.',
            ephemeral: true
        });
        return;
    }

    // Check sender has item
    if (!inventoryManager.hasItem(userId, itemId, quantity)) {
        await interaction.reply({
            content: '❌ Bạn không có đủ vật phẩm!',
            ephemeral: true
        });
        return;
    }

    const item = itemManager.getItemById(itemId);

    // Execute transfer
    try {
        inventoryManager.removeItem(userId, itemId, quantity);
        inventoryManager.addItem(recipientId, itemId, quantity);

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setTitle('✅ Tặng quà thành công!')
            .setDescription(`Bạn đã tặng **${item.name}** x${quantity} cho <@${recipientId}>`)
            .setColor(0x00FF00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        logger.info('Item gifted via trade', { from: userId, to: recipientId, itemId, quantity });

    } catch (error) {
        logger.error('Trade gift error', { error: error.message });
        await interaction.reply({
            content: '❌ Lỗi khi tặng vật phẩm!',
            ephemeral: true
        });
    }
}

/**
 * Handle Lucky Number custom guess modal submit
 * @param {ModalSubmitInteraction} interaction
 */
async function handleLuckyNumberGuessSubmit(interaction) {
    const userId = interaction.user.id;
    const guessValue = interaction.fields.getTextInputValue('lucky_guess');
    const guess = parseInt(guessValue);

    // Validate guess
    if (isNaN(guess) || guess < 1 || guess > 100) {
        await interaction.reply({
            content: '❌ Số không hợp lệ! Vui lòng nhập số từ 1 đến 100.',
            ephemeral: true
        });
        return;
    }

    // Get game and check if active
    const luckyNumber = require('../games/mini/luckyNumber');
    const game = luckyNumber.getGame(userId);

    if (!game || game.status !== 'playing') {
        await interaction.reply({
            content: '❌ Không có game nào đang chơi! Vui lòng bắt đầu game mới.',
            ephemeral: true
        });
        return;
    }

    // Process the guess
    const result = luckyNumber.makeGuess(userId, guess);

    if (result.error) {
        await interaction.reply({
            content: `❌ Lỗi: ${result.error}`,
            ephemeral: true
        });
        return;
    }

    // Update the message with result
    await interaction.deferUpdate();

    const { createLuckyNumberEmbed, createLuckyNumberResultEmbed } = require('../ui/embeds/miniGameEmbeds');
    const { createLuckyNumberButtons, createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');

    if (result.won || result.game.status === 'lost') {
        const embed = createLuckyNumberResultEmbed(result);
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('lucky_number') });
    } else {
        const embed = createLuckyNumberEmbed(result.game);
        embed.addFields({ name: '💡 Gợi ý', value: result.hint, inline: false });
        const buttons = createLuckyNumberButtons(result.game);
        await interaction.editReply({ embeds: [embed], components: buttons });
    }

    logger.info('Lucky Number custom guess submitted', { userId, guess, won: result.won });
}

/**
 * Handle inventory item selection - show item detail
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: item_itemId or 'empty'
 */
async function handleInventoryItemSelect(interaction, value) {
    if (value === 'empty') {
        await interaction.followUp({
            content: '💡 Kho đồ trống! Hãy quay gacha để có vật phẩm.',
            ephemeral: true
        });
        return;
    }

    const userId = interaction.user.id;
    const itemId = parseInt(value.replace('item_', ''));

    // Get inventory item with quantity
    const inventoryItem = inventoryManager.getInventoryItem(userId, itemId);
    if (!inventoryItem) {
        await interaction.followUp({
            content: '❌ Không tìm thấy vật phẩm trong kho!',
            ephemeral: true
        });
        return;
    }

    // Get item details
    const item = itemManager.getItemById(itemId);
    if (!item) {
        await interaction.followUp({
            content: '❌ Không tìm thấy thông tin vật phẩm!',
            ephemeral: true
        });
        return;
    }

    // Check if item is a cosmetic (check in shop items for cosmetic metadata)
    const shopItems = shopManager.getShopItems();
    const shopItem = shopItems.find(s => s.name === item.name && s.type === 'COSMETIC');
    const isCosmetic = !!shopItem;

    // Combine item info with quantity
    const itemWithQty = { ...item, quantity: inventoryItem.quantity };
    const { createItemDetailEmbed } = require('../ui/embeds/coreEmbeds');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = createItemDetailEmbed(itemWithQty);

    // Create action buttons - add Equip button for cosmetics
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`equip_item_${itemId}`)
            .setLabel('✨ Trang bị')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!isCosmetic),
        new ButtonBuilder()
            .setCustomId('goto_shop_sell')
            .setLabel('💰 Bán vật phẩm')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('nav_inventory')
            .setLabel('◀ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });

    logger.info('Inventory item detail viewed', { userId, itemId, itemName: item.name, isCosmetic });
}

/**
 * Handle mail item selection - show mail detail
 * @param {StringSelectMenuInteraction} interaction
 * @param {string} value - format: mail_mailId or 'empty'
 */
async function handleMailItemSelect(interaction, value) {
    if (value === 'empty') {
        await interaction.followUp({
            content: '📭 Hòm thư trống!',
            ephemeral: true
        });
        return;
    }

    const userId = interaction.user.id;
    const mailId = parseInt(value.replace('mail_', ''));

    // Get mail detail
    const mail = mailboxManager.getMailById(mailId);
    if (!mail) {
        await interaction.followUp({
            content: '❌ Không tìm thấy thư!',
            ephemeral: true
        });
        return;
    }

    // Verify ownership - check if mail belongs to this user
    const user = userManager.getUser(userId);
    if (!user || mail.user_id !== user.id) {
        await interaction.followUp({
            content: '❌ Thư này không thuộc về bạn!',
            ephemeral: true
        });
        return;
    }

    const { createMailDetailEmbed } = require('../ui/embeds/secondaryEmbeds');
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

    const embed = createMailDetailEmbed(mail);

    // Create action buttons - claim if not claimed, back button
    const actionRow = new ActionRowBuilder();

    if (!mail.is_claimed && (mail.dcoin_reward > 0 || mail.item_rewards)) {
        actionRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`mail_claim_${mailId}`)
                .setLabel('🎁 Nhận thưởng')
                .setStyle(ButtonStyle.Success)
        );
    }

    actionRow.addComponents(
        new ButtonBuilder()
            .setCustomId('nav_mailbox')
            .setLabel('◀ Quay lại')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [actionRow] });

    logger.info('Mail detail viewed', { userId, mailId, subject: mail.subject });
}

/**
 * Handle RPS custom bet modal submit
 * @param {ModalSubmitInteraction} interaction
 */
async function handleRPSCustomBetSubmit(interaction) {
    const userId = interaction.user.id;
    const betAmountStr = interaction.fields.getTextInputValue('rps_bet_amount');
    const betAmount = parseInt(betAmountStr);

    const balance = economyManager.getBalance(userId);
    const maxAllowed = Math.min(config.casino.maxBet, balance);

    if (isNaN(betAmount) || betAmount <= 0) {
        await interaction.reply({
            content: '❌ Số tiền cược không hợp lệ!',
            ephemeral: true
        });
        return;
    }

    if (betAmount < config.casino.minBet) {
        await interaction.reply({
            content: `❌ Cược tối thiểu: ${config.casino.minBet.toLocaleString()} DCoin`,
            ephemeral: true
        });
        return;
    }

    if (betAmount > maxAllowed) {
        await interaction.reply({
            content: `❌ Số tiền tối đa cho phép là ${maxAllowed.toLocaleString()} DCoin`,
            ephemeral: true
        });
        return;
    }

    // Store bet amount in pending bets for RPS mode selection
    const { pendingRPSBets } = require('./interactiveGamesHandler');
    pendingRPSBets.set(userId, betAmount);

    // Update the RPS mode selection with the new bet amount
    const { createRPSModeEmbed } = require('../ui/embeds/interactiveGameEmbeds');
    const { createRPSModeButtons } = require('../ui/buttons/interactiveGameButtons');

    const embed = createRPSModeEmbed(balance, betAmount);
    const buttons = createRPSModeButtons(balance);

    await interaction.update({ embeds: [embed], components: buttons });

    logger.info('RPS custom bet set', { userId, betAmount });
}

module.exports = { handleModalSubmit, handleSelectMenu };
