/**
 * Interactive Games Handler V2
 * 
 * Handles all interactive game button interactions:
 * - Fishing V2 (multi-phase fishing)
 * - Mining V2 (combo-based mining)
 * - RPS V2 (Best of 3/5)
 * - Quick Math V2 (difficulty & power-ups)
 * - Higher/Lower V2 (double or nothing)
 */

const economyManager = require('../managers/economyManager');
const userManager = require('../managers/userManager');
const sessionManager = require('../managers/sessionManager');

// Import interactive game modules (upgraded originals)
const fishingV2 = require('../games/mini/fishing');
const miningV2 = require('../games/mini/mining');
const rps = require('../games/mini/rps');

// Import V2 UI components
const {
    createFishingLocationButtons,
    createFishingWaitingButtons,
    createFishingHookButtons,
    createFishingReelButtons,
    createFishingResultButtons,
    createMiningLocationButtons,
    createMiningDigButtons,
    createMiningExtractButtons,
    createMiningResultButtons,
    createRPSModeButtons,
    createRPSGameButtons
} = require('../ui/buttons/interactiveGameButtons');

const {
    createFishingStartEmbed,
    createFishingWaitingEmbed,
    createFishingHookEmbed,
    createFishingReelEmbed,
    createFishingResultEmbed,
    createFishingFailedEmbed,
    createMiningStartEmbed,
    createMiningDigEmbed,
    createMiningExtractEmbed,
    createMiningResultEmbed,
    createMiningFailedEmbed,
    createRPSModeEmbed,
    createRPSGameEmbed,
    createRPSResultEmbed
} = require('../ui/embeds/interactiveGameEmbeds');

const { createErrorEmbed } = require('../ui/embeds/coreEmbeds');
const logger = require('../utils/logger');

// Store active games and timers
const activeTimers = new Map();

/**
 * Periodic cleanup of stale timers (runs every 5 minutes)
 * Cleans up timers for sessions that no longer exist
 */
function startTimerCleanup() {
    setInterval(() => {
        let cleaned = 0;
        for (const [key, timer] of activeTimers.entries()) {
            // Extract userId from key (format: fishing_userId, mining_combo_userId, etc.)
            const parts = key.split('_');
            const userId = parts[parts.length - 1];

            // Check if the corresponding session still exists
            let sessionExists = false;

            if (key.startsWith('fishing_')) {
                sessionExists = !!fishingV2.getSession(userId);
            } else if (key.startsWith('mining_')) {
                sessionExists = !!miningV2.getSession(userId);
            }

            if (!sessionExists) {
                clearTimeout(timer);
                activeTimers.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.info('Interactive games timer cleanup', { cleaned, remaining: activeTimers.size });
        }
    }, 5 * 60 * 1000); // Every 5 minutes
}

// Start cleanup on module load
startTimerCleanup();

/**
 * ========================================
 * FISHING V2 HANDLERS
 * ========================================
 */

/**
 * Start fishing - show location selection
 */
async function handleFishingV2Start(interaction, userId) {
    userManager.ensureDefaultTools(userId);

    const balance = economyManager.getBalance(userId);
    const result = fishingV2.startFishing(userId);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_rod') {
            errorMsg = '❌ Bạn chưa có cần câu! Quay gacha Tool & Kit để nhận cần câu.';
        } else if (result.error === 'cooldown') {
            errorMsg = `⏳ Vui lòng chờ **${result.remaining}** giây!`;
        }
        const embed = createErrorEmbed(errorMsg);
        const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('fishing_v2') });
        return;
    }

    const embed = createFishingStartEmbed(result.rod, result.locations, balance);
    const buttons = createFishingLocationButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * Select fishing location and start waiting
 */
async function handleFishingLocation(interaction, userId, locationKey) {
    const result = fishingV2.selectLocation(userId, locationKey);

    if (result.error) {
        const embed = createErrorEmbed('❌ Phiên câu cá không hợp lệ!');
        await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        return;
    }

    const session = fishingV2.getSession(userId);
    const embed = createFishingWaitingEmbed(session.rod, result.location);
    const buttons = createFishingWaitingButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });

    // Set up timer to check for fish bite
    setupFishingTimer(interaction, userId, result.waitTime);
}

/**
 * Setup timer for fish biting notification
 */
function setupFishingTimer(interaction, userId, waitTime) {
    // Clear any existing timer
    const existingTimer = activeTimers.get(`fishing_${userId}`);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
        try {
            const session = fishingV2.getSession(userId);
            if (!session || session.phase !== 'WAITING') return;

            // Check if fish is biting
            const hookCheck = fishingV2.checkHookReady(userId);

            if (hookCheck.ready) {
                // Update embed to show fish is biting!
                const embed = createFishingHookEmbed(hookCheck.timeRemaining);
                const buttons = createFishingHookButtons(hookCheck.timeRemaining);

                await interaction.editReply({ embeds: [embed], components: buttons });

                // Set timeout for hook window expiration
                setupHookExpirationTimer(interaction, userId, hookCheck.timeRemaining * 1000);
            }
        } catch (error) {
            logger.error('Fishing timer error', { userId, error: error.message });
        }
    }, waitTime);

    activeTimers.set(`fishing_${userId}`, timer);
}

/**
 * Setup timer for hook window expiration
 */
function setupHookExpirationTimer(interaction, userId, timeMs) {
    const timer = setTimeout(async () => {
        try {
            // First check if session still exists and is in correct phase
            const session = fishingV2.getSession(userId);
            if (!session || session.phase !== 'HOOK') {
                // Session cancelled or already moved to another phase - ignore
                return;
            }

            const hookCheck = fishingV2.checkHookReady(userId);
            if (hookCheck.expired) {
                const embed = createFishingFailedEmbed('timeout', '💨 Cá đã thoát! Bạn nhấn quá chậm!');
                await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
            }
        } catch (error) {
            logger.error('Hook expiration timer error', { userId, error: error.message });
        }
    }, timeMs + 500); // Add small buffer

    activeTimers.set(`fishing_hook_${userId}`, timer);
}

/**
 * Handle hook attempt
 */
async function handleFishingHook(interaction, userId) {
    const result = fishingV2.attemptHook(userId);

    // Clear hook expiration timer
    const hookTimer = activeTimers.get(`fishing_hook_${userId}`);
    if (hookTimer) {
        clearTimeout(hookTimer);
        activeTimers.delete(`fishing_hook_${userId}`);
    }

    if (result.error) {
        if (result.error === 'too_early') {
            // Too early - just show message, don't fail
            await interaction.followUp({ content: result.message, ephemeral: true });
            return;
        }

        const embed = createFishingFailedEmbed(result.error, result.message);
        await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        return;
    }

    // Successfully hooked! Show reel phase
    const embed = createFishingReelEmbed(
        result.fish,
        result.reelPattern,
        0,
        result.reelPattern.length,
        result.bonusMultiplier,
        Math.ceil(result.timeLimit / 1000)
    );
    const buttons = createFishingReelButtons(
        result.reelPattern[0],
        0,
        result.reelPattern.length
    );

    await interaction.editReply({ embeds: [embed], components: buttons });

    // Setup reel timeout
    setupReelTimeout(interaction, userId, result.timeLimit);
}

/**
 * Setup reel phase timeout with warning
 */
function setupReelTimeout(interaction, userId, timeMs) {
    const WARNING_BEFORE_MS = 3000;

    // Clear any existing timers for this user
    const existingTimer = activeTimers.get(`fishing_reel_${userId}`);
    if (existingTimer) clearTimeout(existingTimer);
    const existingWarning = activeTimers.get(`fishing_reel_warning_${userId}`);
    if (existingWarning) clearTimeout(existingWarning);

    // Setup warning timer (3 seconds before timeout)
    if (timeMs > WARNING_BEFORE_MS + 1000) {
        const warningTimer = setTimeout(async () => {
            try {
                const session = fishingV2.getSession(userId);
                if (!session || session.phase !== 'REEL') return;

                // Update embed with warning
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // Red for warning
                    .setTitle('🎣⚠️ CÂU CÁ - SẮP HẾT GIỜ!')
                    .setDescription(
                        `**⚠️⚠️ CHỈ CÒN 3 GIÂY! KÉO CÁ NGAY! ⚠️⚠️**\n\n` +
                        `🎣 **${session.currentFish?.name || 'Cá'}** đang cố thoát!\n` +
                        `⏰ **${3} giây còn lại!!!**\n\n` +
                        `📍 Nhấn theo hướng mũi tên!`
                    )
                    .setFooter({ text: '🚨 NHANH LÊN! CÁ SẮP THOÁT! 🚨' });

                const { createFishingReelButtons } = require('../ui/buttons/interactiveGameButtons');
                await interaction.editReply({ embeds: [embed], components: createFishingReelButtons() });
            } catch (error) {
                logger.error('Reel warning error', { userId, error: error.message });
            }
        }, timeMs - WARNING_BEFORE_MS);
        activeTimers.set(`fishing_reel_warning_${userId}`, warningTimer);
    }

    // Setup main timeout
    const timer = setTimeout(async () => {
        try {
            // Clear warning timer
            const warningId = activeTimers.get(`fishing_reel_warning_${userId}`);
            if (warningId) {
                clearTimeout(warningId);
                activeTimers.delete(`fishing_reel_warning_${userId}`);
            }

            const session = fishingV2.getSession(userId);
            if (!session || session.phase !== 'REEL') return;

            // Auto-fail due to timeout
            fishingV2.cancelSession(userId);
            const embed = createFishingFailedEmbed('timeout', '⏰ Hết thời gian! Cá đã thoát!');
            await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        } catch (error) {
            logger.error('Reel timeout error', { userId, error: error.message });
        }
    }, timeMs + 500);

    activeTimers.set(`fishing_reel_${userId}`, timer);
}

/**
 * Handle reel action
 */
async function handleFishingReel(interaction, userId, direction) {
    const actionMap = {
        'rod': '🎣',
        'up': '⬆️',
        'down': '⬇️'
    };

    const reelAction = actionMap[direction];
    if (!reelAction) {
        await interaction.followUp({ content: '❌ Hành động không hợp lệ!', ephemeral: true });
        return;
    }

    // Check session exists before action
    const sessionCheck = fishingV2.getSession(userId);
    if (!sessionCheck || sessionCheck.phase !== 'REEL') {
        const embed = createFishingFailedEmbed('expired', '⏰ Phiên câu cá đã hết hạn!');
        await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        return;
    }

    const result = fishingV2.reelAction(userId, reelAction);

    if (result.error) {
        if (result.error === 'timeout') {
            const embed = createFishingFailedEmbed('timeout', result.message);
            await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        } else if (result.error === 'wrong_action') {
            // Wrong action - show ephemeral feedback, don't fail the game
            await interaction.followUp({ content: result.message || '❌ Sai hành động!', ephemeral: true });
        } else {
            const embed = createFishingFailedEmbed(result.error, result.message || '❌ Có lỗi xảy ra!');
            await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        }
        return;
    }

    if (result.phase === 'COMPLETE') {
        // Clear reel timer
        const reelTimer = activeTimers.get(`fishing_reel_${userId}`);
        if (reelTimer) {
            clearTimeout(reelTimer);
            activeTimers.delete(`fishing_reel_${userId}`);
        }

        // Show result
        const balance = economyManager.getBalance(userId);
        const embed = createFishingResultEmbed(result, balance);
        await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        return;
    }

    // Continue reel phase
    if (!result.success) {
        // Wrong action - show feedback
        await interaction.followUp({ content: result.message || '❌ Nhấn sai nút!', ephemeral: true });
        return;
    }

    // Update reel display - with null check
    const session = fishingV2.getSession(userId);
    if (!session || !session.fish || !session.reelPattern) {
        const embed = createFishingFailedEmbed('expired', '⏰ Phiên câu cá đã hết hạn!');
        await interaction.editReply({ embeds: [embed], components: createFishingResultButtons() });
        return;
    }

    const embed = createFishingReelEmbed(
        session.fish,
        session.reelPattern,
        result.progress ?? 0,
        result.total ?? session.reelPattern.length,
        session.bonusMultiplier ?? 1,
        result.timeRemaining ?? 10
    );
    const buttons = createFishingReelButtons(
        result.nextAction ?? session.reelPattern[result.progress ?? 0],
        result.progress ?? 0,
        result.total ?? session.reelPattern.length
    );

    await interaction.editReply({ embeds: [embed], components: buttons });
}


/**
 * Cancel fishing session
 */
async function handleFishingCancel(interaction, userId) {
    // Clear all timers
    ['fishing_', 'fishing_hook_', 'fishing_reel_'].forEach(prefix => {
        const timer = activeTimers.get(`${prefix}${userId}`);
        if (timer) {
            clearTimeout(timer);
            activeTimers.delete(`${prefix}${userId}`);
        }
    });

    fishingV2.cancelSession(userId);

    const { createMiniGamesMenuButtons } = require('../ui/buttons/miniGameButtons');
    const { createMiniGamesMenuEmbed } = require('../ui/embeds/miniGameEmbeds');
    const balance = economyManager.getBalance(userId);

    const embed = createMiniGamesMenuEmbed(balance);
    const buttons = createMiniGamesMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * ========================================
 * MINING V2 HANDLERS
 * ========================================
 */

/**
 * Start mining - show location selection
 */
async function handleMiningV2Start(interaction, userId) {
    userManager.ensureDefaultTools(userId);

    const balance = economyManager.getBalance(userId);
    const result = miningV2.startMining(userId);

    if (result.error) {
        let errorMsg = 'Đã xảy ra lỗi!';
        if (result.error === 'no_pickaxe') {
            errorMsg = '❌ Bạn chưa có cuốc! Quay gacha Tool & Kit để nhận cuốc.';
        } else if (result.error === 'cooldown') {
            errorMsg = `⏳ Vui lòng chờ **${result.remaining}** giây!`;
        }
        const embed = createErrorEmbed(errorMsg);
        const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('mining_v2') });
        return;
    }

    const embed = createMiningStartEmbed(result.pickaxe, result.locations, balance);
    const buttons = createMiningLocationButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * Select mining location and start digging
 */
async function handleMiningLocation(interaction, userId, locationKey) {
    const result = miningV2.selectLocation(userId, locationKey);

    if (result.error) {
        // Session expired or invalid - show clear restart prompt
        const embed = createErrorEmbed('⏰ Phiên đào mỏ đã hết hạn! Bấm nút bên dưới để chơi lại.');
        const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('mining_v2') });
        return;
    }

    const session = miningV2.getSession(userId);
    const embed = createMiningDigEmbed(session);
    const buttons = createMiningDigButtons(
        result.nextPattern,
        0,
        1,
        result.maxDigs
    );

    await interaction.editReply({ embeds: [embed], components: buttons });

    // Setup combo timeout
    setupDigComboTimeout(interaction, userId, result.comboWindow);
}

/**
 * Setup dig combo timeout
 */
function setupDigComboTimeout(interaction, userId, comboWindow) {
    const existingTimer = activeTimers.get(`mining_combo_${userId}`);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
        try {
            const session = miningV2.getSession(userId);
            if (!session || session.phase !== 'DIGGING') return;

            // Reset combo using proper function (instead of direct modification)
            miningV2.resetCombo(userId);

            // Update display
            const embed = createMiningDigEmbed(session);
            const buttons = createMiningDigButtons(
                session.nextDigPattern,
                session.combo,
                session.currentDig + 1,
                session.maxDigs
            );

            await interaction.editReply({ embeds: [embed], components: buttons });

            // Reset timer
            setupDigComboTimeout(interaction, userId, comboWindow);
        } catch (error) {
            logger.error('Mining combo timeout error', { userId, error: error.message });
        }
    }, comboWindow + 500);

    activeTimers.set(`mining_combo_${userId}`, timer);
}

/**
 * Handle dig action
 */
async function handleMiningDig(interaction, userId, direction) {
    const actionMap = {
        'up': '⬆️',
        'down': '⬇️',
        'left': '⬅️',
        'right': '➡️',
        'strike': '⛏️'
    };

    const digAction = actionMap[direction];
    if (!digAction) {
        await interaction.followUp({ content: '❌ Hành động không hợp lệ!', ephemeral: true });
        return;
    }

    const result = miningV2.digAction(userId, digAction);

    if (result.error) {
        // Session expired or invalid - show clear restart prompt
        const embed = createErrorEmbed('⏰ Phiên đào mỏ đã hết hạn! Bấm nút bên dưới để chơi lại.');
        const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
        await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('mining_v2') });
        return;
    }

    // Check if moving to extract phase
    if (result.phase === 'EXTRACT') {
        // Clear combo timer
        const comboTimer = activeTimers.get(`mining_combo_${userId}`);
        if (comboTimer) {
            clearTimeout(comboTimer);
            activeTimers.delete(`mining_combo_${userId}`);
        }

        // Show extract phase
        const session = miningV2.getSession(userId);
        const embed = createMiningExtractEmbed(
            result.bestOre,
            result.extractPattern,
            0,
            result.extractPattern.length,
            result.bonusMultiplier,
            Math.ceil(result.timeLimit / 1000)
        );
        const buttons = createMiningExtractButtons(
            result.extractPattern[0],
            0,
            result.extractPattern.length
        );

        await interaction.editReply({ embeds: [embed], components: buttons });

        // Setup extract timeout
        setupExtractTimeout(interaction, userId, result.timeLimit);
        return;
    }

    // Check if no ores found (failed)
    if (result.phase === 'COMPLETE' && !result.success) {
        // Clear combo timer
        const comboTimer = activeTimers.get(`mining_combo_${userId}`);
        if (comboTimer) {
            clearTimeout(comboTimer);
            activeTimers.delete(`mining_combo_${userId}`);
        }

        const embed = createMiningFailedEmbed(result.message);
        await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        return;
    }

    // Continue digging
    const session = miningV2.getSession(userId);
    const embed = createMiningDigEmbed(session);
    const buttons = createMiningDigButtons(
        result.nextPattern,
        result.combo,
        result.currentDig + 1,
        result.maxDigs
    );

    // Show feedback for critical hits
    if (result.isCritical) {
        await interaction.followUp({ content: '💥 **CRITICAL HIT!** Bonus quặng!', ephemeral: true });
    }

    await interaction.editReply({ embeds: [embed], components: buttons });

    // Reset combo timer
    const location = session.location;
    const comboWindow = location.comboWindow + (session.pickaxe.bonus.comboBonus || 0);
    setupDigComboTimeout(interaction, userId, comboWindow);
}

/**
 * Setup extract phase timeout with warning
 */
function setupExtractTimeout(interaction, userId, timeMs) {
    const WARNING_BEFORE_MS = 3000;

    // Clear any existing timers for this user
    const existingTimer = activeTimers.get(`mining_extract_${userId}`);
    if (existingTimer) clearTimeout(existingTimer);
    const existingWarning = activeTimers.get(`mining_extract_warning_${userId}`);
    if (existingWarning) clearTimeout(existingWarning);

    // Setup warning timer (3 seconds before timeout)
    if (timeMs > WARNING_BEFORE_MS + 1000) {
        const warningTimer = setTimeout(async () => {
            try {
                const session = miningV2.getSession(userId);
                if (!session || session.phase !== 'EXTRACT') return;

                // Update embed with warning
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000) // Red for warning
                    .setTitle('⛏️⚠️ KHAI THÁC - SẮP HẾT GIỜ!')
                    .setDescription(
                        `**⚠️⚠️ CHỈ CÒN 3 GIÂY! KHAI THÁC NGAY! ⚠️⚠️**\n\n` +
                        `💎 **${session.currentOre?.name || 'Quặng'}** sắp tuột mất!\n` +
                        `⏰ **${3} giây còn lại!!!**\n\n` +
                        `📍 Nhấn: **${session.extractPattern[session.extractCurrentIndex] || '⛏️'}**`
                    )
                    .setFooter({ text: '🚨 NHANH LÊN! QUẶNG SẮP MẤT! 🚨' });

                await interaction.editReply({ embeds: [embed], components: createMiningExtractButtons() });
            } catch (error) {
                logger.error('Extract warning error', { userId, error: error.message });
            }
        }, timeMs - WARNING_BEFORE_MS);
        activeTimers.set(`mining_extract_warning_${userId}`, warningTimer);
    }

    // Setup main timeout
    const timer = setTimeout(async () => {
        try {
            // Clear warning timer
            const warningId = activeTimers.get(`mining_extract_warning_${userId}`);
            if (warningId) {
                clearTimeout(warningId);
                activeTimers.delete(`mining_extract_warning_${userId}`);
            }

            const session = miningV2.getSession(userId);
            if (!session || session.phase !== 'EXTRACT') return;

            // Complete with penalty
            const result = miningV2.completeMining(userId, false);
            const balance = economyManager.getBalance(userId);

            const embed = createMiningResultEmbed(result, balance);
            embed.setDescription(embed.data.description + '\n\n⏰ *Hết thời gian - Giảm 25% thưởng*');

            await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        } catch (error) {
            logger.error('Extract timeout error', { userId, error: error.message });
        }
    }, timeMs + 500);

    activeTimers.set(`mining_extract_${userId}`, timer);
}

/**
 * Handle extract action
 */
async function handleMiningExtract(interaction, userId, action) {
    const actionMap = {
        'strike': '⛏️',
        'pull': '💪',
        'fire': '🔥'
    };

    const extractAction = actionMap[action];
    if (!extractAction) {
        await interaction.followUp({ content: '❌ Hành động không hợp lệ!', ephemeral: true });
        return;
    }

    // Check session exists before action
    const sessionCheck = miningV2.getSession(userId);
    if (!sessionCheck || sessionCheck.phase !== 'EXTRACT') {
        const embed = createMiningFailedEmbed('⏰ Phiên đào mỏ đã hết hạn!');
        await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        return;
    }

    const result = miningV2.extractAction(userId, extractAction);

    if (result.error) {
        if (result.error === 'timeout' || result.error === 'invalid_session') {
            const embed = createErrorEmbed('❌ Phiên khai thác không hợp lệ hoặc đã hết giờ!');
            await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        } else if (result.error === 'wrong_action') {
            await interaction.followUp({ content: result.message || '❌ Sai hành động!', ephemeral: true });
        } else {
            const embed = createMiningFailedEmbed(result.message || '❌ Có lỗi xảy ra!');
            await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        }
        return;
    }

    if (result.phase === 'COMPLETE') {
        // Clear extract timer
        const extractTimer = activeTimers.get(`mining_extract_${userId}`);
        if (extractTimer) {
            clearTimeout(extractTimer);
            activeTimers.delete(`mining_extract_${userId}`);
        }

        // Show result
        const balance = economyManager.getBalance(userId);
        const embed = createMiningResultEmbed(result, balance);
        await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        return;
    }

    // Continue extract phase
    if (!result.success) {
        // Wrong action - show feedback
        await interaction.followUp({ content: result.message || '❌ Nhấn sai nút!', ephemeral: true });
        return;
    }

    // Update extract display - with null check
    const session = miningV2.getSession(userId);
    if (!session || !session.currentOre || !session.extractPattern) {
        const embed = createMiningFailedEmbed('⏰ Phiên đào mỏ đã hết hạn!');
        await interaction.editReply({ embeds: [embed], components: createMiningResultButtons() });
        return;
    }

    const embed = createMiningExtractEmbed(
        session.currentOre,
        session.extractPattern,
        result.progress ?? 0,
        result.total ?? session.extractPattern.length,
        session.bonusMultiplier ?? 1,
        result.timeRemaining ?? 10
    );
    const buttons = createMiningExtractButtons(
        result.nextAction ?? session.extractPattern[result.progress ?? 0],
        result.progress ?? 0,
        result.total ?? session.extractPattern.length
    );

    await interaction.editReply({ embeds: [embed], components: buttons });
}


/**
 * Cancel mining session
 */
async function handleMiningCancel(interaction, userId) {
    // Clear all timers
    ['mining_combo_', 'mining_extract_'].forEach(prefix => {
        const timer = activeTimers.get(`${prefix}${userId}`);
        if (timer) {
            clearTimeout(timer);
            activeTimers.delete(`${prefix}${userId}`);
        }
    });

    miningV2.cancelSession(userId);

    const { createMiniGamesMenuButtons } = require('../ui/buttons/miniGameButtons');
    const { createMiniGamesMenuEmbed } = require('../ui/embeds/miniGameEmbeds');
    const balance = economyManager.getBalance(userId);

    const embed = createMiniGamesMenuEmbed(balance);
    const buttons = createMiniGamesMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * ========================================
 * RPS (Oẳn Tù Tì) HANDLERS
 * ========================================
 */

// Store pending RPS bets (before mode selection)
const pendingRPSBets = new Map();

/**
 * Handle RPS mode selection and start game
 */
async function handleRPSModeSelect(interaction, userId, mode, activeGames) {
    const balance = economyManager.getBalance(userId);

    // Get bet amount from pending or use default
    let betAmount = pendingRPSBets.get(userId) || 50;
    pendingRPSBets.delete(userId);

    // If mode is 'select' or navigating to RPS, show mode selection
    if (mode === 'select' || mode === 'single' || mode === 'bo3' || mode === 'bo5') {
        if (mode === 'select') {
            // Show mode selection embed
            const embed = createRPSModeEmbed(balance, betAmount);
            const buttons = createRPSModeButtons(balance);
            await interaction.editReply({ embeds: [embed], components: buttons });
            return;
        }

        // Create game with selected mode
        const result = rps.createGame(userId, betAmount, mode);

        if (result.error) {
            let errorMsg = 'Đã xảy ra lỗi!';
            if (result.error === 'insufficient_balance') {
                errorMsg = '❌ Không đủ DCoin để đặt cược!';
            } else if (result.error === 'bet_too_low') {
                errorMsg = `❌ Cược tối thiểu: ${result.minBet.toLocaleString()} DCoin`;
            } else if (result.error === 'bet_too_high') {
                errorMsg = `❌ Cược tối đa: ${result.maxBet.toLocaleString()} DCoin`;
            } else if (result.error === 'cooldown') {
                errorMsg = `⏳ Vui lòng chờ **${result.remaining}** giây!`;
            }
            const embed = createErrorEmbed(errorMsg);
            const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
            await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('minigame_rps') });
            return;
        }

        // Show game UI
        const session = result.session;
        const embed = createRPSGameEmbed(session, null);
        const buttons = createRPSGameButtons(session.playerScore, session.botScore, session.round, session.maxRounds);

        await interaction.editReply({ embeds: [embed], components: buttons });
    }
}

/**
 * Handle RPS play action (rock, paper, scissors)
 */
async function handleRPSPlay(interaction, userId, choice) {
    const result = rps.playRound(userId, choice);

    if (result.error) {
        if (result.error === 'no_session') {
            // No active session, show menu
            const embed = createErrorEmbed('❌ Không có phiên game! Bắt đầu game mới.');
            const { createPlayAgainButtons } = require('../ui/buttons/miniGameButtons');
            await interaction.editReply({ embeds: [embed], components: createPlayAgainButtons('minigame_rps') });
            return;
        }
        if (result.error === 'invalid_choice') {
            await interaction.followUp({ content: '❌ Lựa chọn không hợp lệ!', ephemeral: true });
            return;
        }
        return;
    }

    if (result.gameOver) {
        // Game finished - show result
        const balance = economyManager.getBalance(userId);
        const embed = createRPSResultEmbed(result, balance);

        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('minigame_rps')
                    .setLabel('🎮 Chơi lại')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('nav_minigames')
                    .setLabel('📋 Menu Games')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
        return;
    }

    // Game continues - show next round
    const session = rps.getSession(userId);
    const embed = createRPSGameEmbed(session, result.roundInfo);
    const buttons = createRPSGameButtons(session.playerScore, session.botScore, session.round, session.maxRounds);

    await interaction.editReply({ embeds: [embed], components: buttons });
}

/**
 * Cancel RPS session
 */
async function handleRPSCancel(interaction, userId) {
    rps.cancelSession(userId);

    // Clean up pending bet to prevent memory leak
    pendingRPSBets.delete(userId);

    const { createMiniGamesMenuButtons } = require('../ui/buttons/miniGameButtons');
    const { createMiniGamesMenuEmbed } = require('../ui/embeds/miniGameEmbeds');
    const balance = economyManager.getBalance(userId);

    const embed = createMiniGamesMenuEmbed(balance);
    const buttons = createMiniGamesMenuButtons();

    await interaction.editReply({ embeds: [embed], components: buttons });
}



/**
 * Main dispatcher for interactive game buttons
 * @param {ButtonInteraction} interaction 
 * @param {string} userId 
 * @param {string} customId 
 * @param {Map} activeGames - Reference to main handler's activeGames
 */
async function handleInteractiveGameButton(interaction, userId, customId, activeGames) {
    logger.info('Interactive game button clicked', { userId, customId });

    try {
        // ============= FISHING (Interactive) =============
        if (customId === 'minigame_fishing' || customId === 'minigame_fishing_v2') {
            await handleFishingV2Start(interaction, userId);
        }
        else if (customId.startsWith('fishing_location_')) {
            const locationKey = customId.replace('fishing_location_', '');
            await handleFishingLocation(interaction, userId, locationKey);
        }
        else if (customId === 'fishing_hook') {
            await handleFishingHook(interaction, userId);
        }
        else if (customId.startsWith('fishing_reel_')) {
            const direction = customId.replace('fishing_reel_', '');
            await handleFishingReel(interaction, userId, direction);
        }
        else if (customId === 'fishing_cancel') {
            await handleFishingCancel(interaction, userId);
        }
        // ============= MINING (Interactive) =============
        else if (customId === 'minigame_mining' || customId === 'minigame_mining_v2') {
            await handleMiningV2Start(interaction, userId);
        }
        else if (customId.startsWith('mining_location_')) {
            const locationKey = customId.replace('mining_location_', '');
            await handleMiningLocation(interaction, userId, locationKey);
        }
        else if (customId.startsWith('mining_dig_')) {
            const direction = customId.replace('mining_dig_', '');
            await handleMiningDig(interaction, userId, direction);
        }
        else if (customId.startsWith('mining_extract_')) {
            const action = customId.replace('mining_extract_', '');
            await handleMiningExtract(interaction, userId, action);
        }
        else if (customId === 'mining_cancel') {
            await handleMiningCancel(interaction, userId);
        }
        // ============= RPS (Oẳn Tù Tì) =============
        else if (customId === 'rps_custom_bet') {
            // Show modal for custom bet amount
            const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

            const modal = new ModalBuilder()
                .setCustomId('rps_custom_bet_modal')
                .setTitle('💰 Nhập số tiền cược');

            const betInput = new TextInputBuilder()
                .setCustomId('rps_bet_amount')
                .setLabel('Số tiền muốn cược')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ví dụ: 500')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10);

            const row = new ActionRowBuilder().addComponents(betInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
            return; // Don't editReply - modal will handle this
        }
        else if (customId.startsWith('rps_mode_')) {
            const mode = customId.replace('rps_mode_', '');
            await handleRPSModeSelect(interaction, userId, mode, activeGames);
        }
        else if (customId.startsWith('rps_v2_')) {
            const choice = customId.replace('rps_v2_', '');
            await handleRPSPlay(interaction, userId, choice);
        }
        else if (customId === 'rps_cancel') {
            await handleRPSCancel(interaction, userId);
        }
        else {
            logger.warn('Unknown interactive game button', { customId });
            const embed = createErrorEmbed('❌ Nút không hợp lệ!');
            await interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        // Detailed error logging to identify root cause
        logger.error('Interactive game handler error', {
            customId,
            userId,
            error: error.message,
            code: error.code,
            stack: error.stack?.split('\n').slice(0, 5).join('\n')
        });

        // Try to show error message to user if possible
        try {
            const embed = createErrorEmbed('❌ Đã xảy ra lỗi! Vui lòng thử lại.');
            await interaction.editReply({ embeds: [embed], components: [] });
        } catch (replyError) {
            // If editReply fails, the interaction might have expired or been deleted
            logger.warn('Failed to send error response', {
                userId,
                customId,
                replyError: replyError.message
            });
        }
    }
}


/**
 * ========================================
 * EXPORTS
 * ========================================
 */

module.exports = {
    // Main dispatcher
    handleInteractiveGameButton,

    // Fishing V2
    handleFishingV2Start,
    handleFishingLocation,
    handleFishingHook,
    handleFishingReel,
    handleFishingCancel,

    // Mining V2
    handleMiningV2Start,
    handleMiningLocation,
    handleMiningDig,
    handleMiningExtract,
    handleMiningCancel,

    // RPS
    handleRPSModeSelect,
    handleRPSPlay,
    handleRPSCancel,

    // Timer management
    activeTimers,
    pendingRPSBets
};

