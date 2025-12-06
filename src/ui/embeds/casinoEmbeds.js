const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');

/**
 * Create casino menu embed
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createCasinoMenuEmbed(balance) {
    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎰 CASINO - Sòng bạc Doro88')
        .setDescription(
            '**🏛️ Chào mừng đến Casino!**\n' +
            '⚠️ 99% con bạc dừng lại trước khi thắng lớn!\n'
        )
        .addFields(
            { name: '💰 Số dư', value: `**${formatNumber(balance)}** DCoin`, inline: true },
            { name: '🎲 Cược tối thiểu', value: `${formatNumber(config.casino.minBet)} DCoin`, inline: true },
            { name: '🎯 Cược tối đa', value: `${formatNumber(config.casino.maxBet)} DCoin`, inline: true }
        )
        .addFields(
            { name: '🃏 Xì dách', value: 'Đánh bài 21 điểm\n**Xì dách = x2.5**', inline: true },
            { name: '🎲 Quay Số Roulette', value: 'Vòng quay số 0-36\n**Đúng số = x36**', inline: true },
            { name: '🎰 Máy đánh bạc', value: 'Máy quay slot\n**Jackpot = x100**', inline: true }
        )
        .addFields(
            { name: '📈 Đoán điểm nổ', value: 'Crash Game\n**Tối đa x10**', inline: true },
            { name: '🎡 Vòng Quay May Mắn', value: 'Vòng xoay thưởng\n**Jackpot x20**', inline: true },
            { name: '🎲 Tài Xỉu', value: 'Xúc xắc 3 viên\n**x2 - x150**', inline: true }
        )
        .setFooter({ text: 'Doro88 Casino • Không thử sao biết ta không thể?' })
        .setTimestamp();
}

/**
 * Create blackjack bet selection embed (dedicated embed for choosing bet amount)
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createBlackjackBetEmbed(balance) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🃏 XÌ DÁCH - Chọn mức cược')
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    let description = '**📖 CÁCH CHƠI:**\n';
    description += '1️⃣ Chọn mức cược bên dưới\n';
    description += '2️⃣ Mục tiêu: Đạt tổng điểm gần **21** nhất mà không quá\n';
    description += '3️⃣ Thắng Dealer để nhận thưởng!\n\n';

    description += '**💰 TỶ LỆ THẮNG:**\n';
    description += '🃏 **Xì dách** (A + 10/J/Q/K): **x2.5**\n';
    description += '✨ **Thắng thường**: **x2**\n';
    description += '🤝 **Hòa (Push)**: Hoàn tiền\n';
    description += '🏳️ **Đầu hàng**: Mất 50% cược\n\n';

    description += '**📋 GIÁ TRỊ BÀI:**\n';
    description += '• Số 2-10: Tính theo số\n';
    description += '• J, Q, K: **10 điểm**\n';
    description += '• A (Ace): **1 hoặc 11 điểm**\n\n';

    description += '**🎮 HÀNH ĐỘNG:**\n';
    description += '• **Rút (Hit)**: Lấy thêm bài\n';
    description += '• **Dừng (Stand)**: Giữ nguyên\n';
    description += '• **Gấp đôi (Double)**: x2 cược, chỉ rút 1 bài\n';
    description += '• **Đầu hàng**: Bỏ cuộc, lấy lại 50%\n';

    embed.setDescription(description);

    embed.addFields(
        { name: '💵 Số dư hiện tại', value: `**${formatNumber(balance)} DCoin**`, inline: true },
        { name: '🎲 Cược tối thiểu', value: `${formatNumber(config.casino.minBet)} DCoin`, inline: true },
        { name: '🎯 Cược tối đa', value: `${formatNumber(config.casino.maxBet)} DCoin`, inline: true }
    );

    return embed;
}

/**
 * Create blackjack embed
 * @param {Object} gameState
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createBlackjackEmbed(gameState, balance) {
    const color = gameState.result === 'WIN' || gameState.result === 'BLACKJACK'
        ? config.colors.success
        : gameState.result === 'LOSE'
            ? config.colors.error
            : config.colors.primary;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🃏 XÌ DÁCH')
        .addFields(
            { name: '🤖 Dealer', value: `${gameState.dealerHand}\nĐiểm: ${gameState.dealerValue}`, inline: false },
            { name: '👤 Bạn', value: `${gameState.playerHand}\n${gameState.valueEmoji || ''} Điểm: ${gameState.playerValue}`, inline: false }
        )
        .setFooter({ text: `Cược: ${formatNumber(gameState.betAmount)} DCoin | Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    // Show tension message if available
    if (gameState.tensionMessage) {
        embed.setDescription(`*${gameState.tensionMessage}*`);
    }

    // Show streak info at top
    if (gameState.isHotStreak) {
        embed.setDescription(`🔥 **HOT STREAK!** ${gameState.streak?.currentStreak || 0} thắng liên tiếp!\n${gameState.tensionMessage || ''}`);
    } else if (gameState.isColdStreak) {
        embed.setDescription(`❄️ Streak xui: ${Math.abs(gameState.streak?.currentStreak || 0)} thua liên tiếp\n${gameState.tensionMessage || ''}`);
    }

    // Show bust probability and strategy hint if game is still running
    // Use pre-calculated values from gameState (calculated in blackjack.getGameState)
    if (!gameState.result && gameState.state === 'PLAYING') {
        const bustProb = gameState.bustProbability;
        const strategyHint = gameState.strategyHint;

        let hintText = '';
        if (bustProb !== undefined && bustProb !== null) {
            const bustEmoji = bustProb > 50 ? '⚠️' : bustProb > 30 ? '🟡' : '🟢';
            hintText += `${bustEmoji} Rủi ro Bust: **${bustProb}%**\n`;
        }
        if (strategyHint) {
            hintText += `💡 ${strategyHint}`;
        }
        if (hintText) {
            embed.addFields({ name: '📊 Chiến thuật', value: hintText });
        }
    }

    // Show insurance option if available
    if (gameState.state === 'INSURANCE_OFFERED') {
        embed.addFields({
            name: '🛡️ BẢO HIỂM CÓ SẴN!',
            value: `Dealer có Ace! Bạn có thể mua bảo hiểm ${formatNumber(Math.floor(gameState.betAmount / 2))} DCoin\nNếu Dealer có Blackjack → Nhận x2 bảo hiểm!`
        });
    }

    if (gameState.result) {
        let resultText = '';
        switch (gameState.result) {
            case 'BLACKJACK':
                resultText = '🎉 XÌ DÁCH! Bạn thắng lớn!';
                break;
            case 'WIN':
                resultText = '✨ Bạn thắng!';
                break;
            case 'LOSE':
                resultText = '😔 Bạn thua!';
                break;
            case 'PUSH':
                resultText = '🤝 Hòa!';
                break;
            case 'SURRENDER':
                resultText = '🏳️ Đầu hàng!';
                break;
            case 'INSURANCE_WIN':
                resultText = '🛡️ Bảo hiểm thắng!';
                break;
        }

        // Add tension/dramatic message
        if (gameState.tensionMessage) {
            resultText += `\n${gameState.tensionMessage}`;
        }

        // Show streak bonus if applicable
        let payoutText = `Thưởng: ${formatNumber(gameState.payout)} DCoin`;
        if (gameState.streakBonus && gameState.streakBonus > 0) {
            payoutText += `\n🔥 Streak Bonus: +${formatNumber(gameState.streakBonus)} DCoin`;
        }
        if (gameState.streak && gameState.streak.currentStreak && gameState.streak.currentStreak > 1) {
            payoutText += `\n🏆 Win Streak: ${gameState.streak.currentStreak}`;
        }

        embed.addFields({ name: '📊 Kết quả', value: `${resultText}\n${payoutText}` });

        // Show XP gained and level up
        if (gameState.xpGained && gameState.xpGained > 0) {
            let xpText = `+${gameState.xpGained} XP`;
            if (gameState.levelUp) {
                xpText += ` 🎉 **LEVEL UP! → Lv.${gameState.newLevel}**`;
            }
            embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: true });
        }
    }

    return embed;
}

/**
 * Create roulette embed - Redesigned for beginners
 * @param {Object} game
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createRouletteEmbed(game, balance) {
    const currentBet = game.betAmount || 50;
    const roulette = require('../../games/casino/roulette');
    const hasBets = game.bets && game.bets.length > 0;
    const hasResult = game.lastResult;

    // Dynamic color based on state
    let embedColor = config.colors.primary;
    if (hasResult) {
        embedColor = game.lastResult.totalWinnings > 0 ? config.colors.success : config.colors.error;
    }

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('🎡 ROULETTE - Quay Số May Mắn')
        .setTimestamp();

    let description = '';

    // ═══════════════════════════════════════════════════════════════
    // SECTION 1: VISUAL BETTING GUIDE (only when no result showing)
    // ═══════════════════════════════════════════════════════════════
    if (!hasResult) {
        description += '```\n';
        description += '╔══════════════════════════════════╗\n';
        description += '║      🎡 BÀN ROULETTE 🎡         ║\n';
        description += '╠═══════════╦═══════════╦══════════╣\n';
        description += '║  🔴 ĐỎ   ║  ⚫ ĐEN   ║  🟢 0   ║\n';
        description += '║   x2     ║   x2      ║   x36   ║\n';
        description += '╚═══════════╩═══════════╩══════════╝\n';
        description += '```\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 2: STEP-BY-STEP GUIDE (only when no bets placed)
    // ═══════════════════════════════════════════════════════════════
    if (!hasBets && !hasResult) {
        description += '📖 **CÁCH CHƠI ROULETTE:**\n';
        description += '> 1️⃣ Chọn **mức tiền** muốn cược (50, 100, 500...)\n';
        description += '> 2️⃣ Nhấn **loại cược** (Đỏ, Đen, Chẵn, Lẻ...)\n';
        description += '> 3️⃣ Nhấn **🎡 QUAY!** để quay số\n';
        description += '> 4️⃣ Bi dừng đúng cược → **THẮNG!** 🎉\n\n';

        description += '💡 **GỢI Ý:** Bắt đầu với 🔴 **Đỏ** hoặc ⚫ **Đen** - dễ thắng nhất!\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 3: BET TYPE EXPLANATION (compact version)
    // ═══════════════════════════════════════════════════════════════
    if (!hasResult) {
        description += '**📋 CÁC LOẠI CƯỢC:**\n';
        description += '┌─────────────────────────────────┐\n';
        description += '│ 🔴 Đỏ/⚫ Đen     → Thắng **x2** │\n';
        description += '│ 🔢 Chẵn/Lẻ       → Thắng **x2** │\n';
        description += '│ 📉 1-18/📈 19-36 → Thắng **x2** │\n';
        description += '│ 🎯 Đúng số       → Thắng **x36**│\n';
        description += '└─────────────────────────────────┘\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 4: CURRENT BETS DISPLAY
    // ═══════════════════════════════════════════════════════════════
    description += `💰 **Mức cược:** \`${formatNumber(currentBet)} DCoin\`\n`;

    if (hasBets) {
        const totalBet = roulette.getTotalBets(game);
        description += '\n**🎯 CƯỢC HIỆN TẠI:**\n';
        game.bets.forEach((bet, index) => {
            const isLast = index === game.bets.length - 1;
            const prefix = isLast ? '└─' : '├─';
            description += `${prefix} ${roulette.formatBet(bet)}\n`;
        });
        description += `**📊 Tổng đặt:** \`${formatNumber(totalBet)} DCoin\`\n`;
        description += '\n✅ Nhấn **🎡 QUAY!** để bắt đầu!\n';
    } else if (!hasResult) {
        description += '\n⬇️ _Chọn loại cược bên dưới để bắt đầu_\n';
    }

    embed.setDescription(description);

    // ═══════════════════════════════════════════════════════════════
    // SECTION 5: ENHANCED RESULT DISPLAY
    // ═══════════════════════════════════════════════════════════════
    if (hasResult) {
        const result = game.lastResult;
        const colorEmoji = roulette.getColorEmoji(result.color);
        const colorName = result.color === 'RED' ? 'Đỏ' : result.color === 'BLACK' ? 'Đen' : 'Xanh';
        const oddEven = result.number === 0 ? 'Không' : result.number % 2 === 0 ? 'Chẵn' : 'Lẻ';
        const range = result.number === 0 ? '-' : result.number <= 18 ? '1-18' : '19-36';

        let resultDisplay = '```\n';
        resultDisplay += '╔══════════════════════════════════╗\n';
        resultDisplay += `║  🎲 BI DỪNG TẠI: ${colorEmoji} ${result.number.toString().padStart(2, ' ')}            ║\n`;
        resultDisplay += `║     ${colorName} • ${oddEven} • ${range}            ║\n`;
        resultDisplay += '╠══════════════════════════════════╣\n';

        // Show each bet result
        let winCount = 0;
        result.betResults.forEach(bet => {
            if (bet.won) {
                winCount++;
                resultDisplay += `║  ✅ ${roulette.formatBet(bet).substring(0, 25).padEnd(25, ' ')} ║\n`;
            } else {
                resultDisplay += `║  ❌ ${roulette.formatBet(bet).substring(0, 25).padEnd(25, ' ')} ║\n`;
            }
        });

        resultDisplay += '╠══════════════════════════════════╣\n';

        if (result.totalWinnings > 0) {
            const profit = result.totalWinnings - result.totalBet;
            resultDisplay += `║  🎉 THẮNG: +${formatNumber(result.totalWinnings).padEnd(18, ' ')} ║\n`;
            if (profit > 0) {
                resultDisplay += `║  💰 Lời: +${formatNumber(profit).padEnd(19, ' ')} ║\n`;
            }
        } else {
            resultDisplay += `║  😔 THUA: -${formatNumber(result.totalBet).padEnd(19, ' ')} ║\n`;
        }
        resultDisplay += '╚══════════════════════════════════╝\n';
        resultDisplay += '```';

        embed.addFields({
            name: result.totalWinnings > 0 ? '🎉 KẾT QUẢ - THẮNG!' : '😔 KẾT QUẢ - THUA',
            value: resultDisplay,
            inline: false
        });

        // Win message if available
        if (result.winMessage) {
            embed.addFields({
                name: '💬',
                value: result.winMessage,
                inline: true
            });
        }

        // XP info
        if (result.xpGained && result.xpGained > 0) {
            let xpText = `+${result.xpGained} XP`;
            if (result.levelUp) {
                xpText += ` 🎉 **LEVEL UP! → Lv.${result.newLevel}**`;
            }
            embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: true });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 6: COMPACT HISTORY (inline field)
    // ═══════════════════════════════════════════════════════════════
    if (game.spinHistory && game.spinHistory.length > 0) {
        const historyDisplay = game.spinHistory.slice(0, 10).map(n => {
            const color = roulette.getNumberColor(n);
            const emoji = roulette.getColorEmoji(color);
            return `${emoji}${n}`;
        }).join(' ');
        embed.addFields({
            name: '📜 Lịch sử quay',
            value: historyDisplay,
            inline: true
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SECTION 7: SESSION STATS (only if played)
    // ═══════════════════════════════════════════════════════════════
    if (game.session) {
        const session = game.session;
        const profit = session.profit || (session.totalWon - session.totalWagered) || 0;
        const winRate = session.winRate ?? 0;
        const totalSpins = session.totalSpins ?? session.spins ?? 0;

        if (totalSpins > 0) {
            const profitEmoji = profit >= 0 ? '📈' : '📉';
            const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);
            embed.addFields({
                name: '📊 Phiên chơi',
                value: `${profitEmoji} ${profitText} DCoin | ${winRate}% thắng | ${totalSpins} lần quay`,
                inline: true
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FOOTER with balance
    // ═══════════════════════════════════════════════════════════════
    embed.setFooter({
        text: `💰 Số dư: ${formatNumber(balance)} DCoin | Doro88 Casino`
    });

    return embed;
}


/**
 * Create slots embed
 * @param {Object} result
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createSlotsEmbed(result, balance) {
    const color = result.isJackpot
        ? 0xFFD700
        : result.isWin
            ? config.colors.success
            : config.colors.error;

    const slots = require('../../games/casino/slots');

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('🎰 SLOT MACHINE')
        .setDescription(`
╔═══════════════════╗
║                   ║
║  ${slots.formatReels(result.reels)}  ║
║                   ║
╚═══════════════════╝
        `)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    // Result message with enhanced win message
    let resultMessage = slots.getResultMessage(result);
    if (result.winMessage) {
        resultMessage = `${result.winMessage}\n${resultMessage}`;
    }

    // Near-miss excitement
    if (result.nearMiss && result.nearMissMessage) {
        resultMessage += `\n${result.nearMissMessage}`;
    }

    embed.addFields({ name: '📊 Kết quả', value: resultMessage });

    if (result.isWin) {
        let winText = formatNumber(result.winnings);
        if (result.streakBonus && result.streakBonus > 0) {
            winText += `\n🔥 +${formatNumber(result.streakBonus)} streak bonus!`;
        }

        embed.addFields(
            { name: '💰 Cược', value: formatNumber(result.betAmount), inline: true },
            { name: '🎁 Thắng', value: winText, inline: true },
            { name: '✖️ Nhân', value: `x${result.multiplier}`, inline: true }
        );
    }

    // Lucky meter display
    if (result.luckyMeter !== undefined) {
        const meterDisplay = slots.getLuckyMeterDisplay ?
            slots.getLuckyMeterDisplay(result.luckyMeter) :
            `🍀 ${result.luckyMeter}%`;
        embed.addFields({ name: '🍀 Lucky Meter', value: meterDisplay, inline: true });

        if (result.luckyMeter >= 100) {
            embed.addFields({ name: '🎁 BONUS!', value: 'Lucky meter đầy! Spin tiếp để nhận FREE SPIN!', inline: true });
        }
    }

    // Streak info
    if (result.currentStreak && result.currentStreak > 1) {
        embed.addFields({ name: '🏆 Win Streak', value: `${result.currentStreak} lần thắng liên tiếp!`, inline: true });
    }

    // Session stats
    if (result.session) {
        const session = result.session;
        const profit = session.profit ?? 0;
        const winRate = session.winRate ?? 0;
        const totalSpins = session.totalSpins ?? session.spins ?? 0;

        // Chỉ hiển thị nếu đã có ít nhất 1 spin
        if (totalSpins > 0) {
            const profitEmoji = profit >= 0 ? '📈' : '📉';
            const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);

            embed.addFields({
                name: '📊 Phiên chơi',
                value: `${profitEmoji} ${profitText} | Win: ${winRate}% | Spins: ${totalSpins}`,
                inline: false
            });
        }
    }

    // Show paytable
    embed.addFields({ name: '📋 Bảng thưởng', value: slots.formatPaytable() });

    return embed;
}

/**
 * Create slots initial/waiting embed - REDESIGNED for beginners
 * @param {number} balance
 * @param {number} betAmount
 * @returns {EmbedBuilder}
 */
function createSlotsWaitingEmbed(balance, betAmount) {
    const slots = require('../../games/casino/slots');

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎰 MÁY ĐÁNH BẠC (SLOT MACHINE)')
        .setTimestamp();

    // ============= HƯỚNG DẪN CHO NGƯỜI MỚI =============
    let description = '';
    description += '```\n';
    description += '  ╭─────────────╮\n';
    description += '  │  [ ? | ? | ? ]  │\n';
    description += '  ╰─────────────╯\n';
    description += '```\n\n';

    // Step-by-step guide
    description += '**📖 CÁCH CHƠI:**\n';
    description += '```\n';
    description += '① Chọn mức cược bên dưới\n';
    description += '② Nhấn nút QUAY\n';
    description += '③ 3 biểu tượng trùng = THẮNG!\n';
    description += '```\n\n';

    // Visual symbol guide with multipliers
    description += '**🎨 BẢNG BIỂU TƯỢNG:**\n';
    description += '┌───────────────────────────┬────────┐\n';
    description += '│ 💎💎💎 Kim Cương          │ **x100** │ 🔥 JACKPOT\n';
    description += '│ ⭐⭐⭐ Ngôi Sao           │ **x50**  │ Cực Hiếm\n';
    description += '│ 🍒🍒🍒 Cherry            │ **x25**  │ Hiếm\n';
    description += '│ 🍋🍋🍋 Chanh             │ **x10**  │ Tốt\n';
    description += '│ 🍊🍊🍊 Cam               │ **x5**   │ Thường\n';
    description += '│ 🍇🍇🍇 Nho               │ **x3**   │ Cơ bản\n';
    description += '│ 🍓🍓🍓 Dâu               │ **x2**   │ Cơ bản\n';
    description += '└───────────────────────────┴────────┘\n\n';

    // Bonus info
    description += '**🍀 THÔNG TIN THÊM:**\n';
    description += '• 2 biểu tượng trùng: nhận lại 25-50% tiền cược\n';
    description += '• Lucky Meter đầy: Nhận FREE SPIN!\n';

    embed.setDescription(description);

    // Current bet info
    embed.addFields(
        { name: '💰 Số dư', value: `**${formatNumber(balance)} DCoin**`, inline: true },
        { name: '🎯 Cược', value: `**${formatNumber(betAmount)} DCoin**`, inline: true },
        { name: '💡 Thắng lớn', value: `**${formatNumber(betAmount * 100)} DCoin**`, inline: true }
    );

    embed.setFooter({ text: '🎰 Nhấn QUAY để thử vận may! • Doro88 Bot' });

    return embed;
}

/**
 * Create crash game embed
 * @param {number} balance
 * @param {number} betAmount
 * @param {number} targetMultiplier
 * @returns {EmbedBuilder}
 */
function createCrashEmbed(balance, betAmount = 100, targetMultiplier = 2) {
    const crash = require('../../games/casino/crash');
    const riskInfo = crash.getRiskInfo(targetMultiplier);
    const tier = crash.getMultiplierTier ? crash.getMultiplierTier(targetMultiplier) : null;

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('📈 ĐOÁN ĐIỂM NỔ')
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    let description = '**📖 CÁCH CHƠI:**\n';
    description += '1️⃣ Chọn mức cược\n';
    description += '2️⃣ Chọn mục tiêu nhân số (x1.5 → x10)\n';
    description += '3️⃣ Nếu game **không crash** trước khi đạt mục tiêu → **THẮNG!**\n';
    description += '4️⃣ Mục tiêu càng cao → Phần thưởng càng lớn nhưng rủi ro cao!\n\n';

    description += '**💡 CHIẾN THUẬT:**\n';
    description += '🟢 x1.5: An toàn (~60% thắng)\n';
    description += '🟡 x2.0: Trung bình (~48% thắng)\n';
    description += '🟠 x3.0: Rủi ro (~32% thắng)\n';
    description += '🔴 x5.0: Cao (~19% thắng)\n';
    description += '💀 x10: Cực cao (~9% thắng)\n';

    embed.setDescription(description);

    const tierEmoji = tier ? tier.emoji : riskInfo.emoji;
    const tierName = tier ? tier.name : riskInfo.riskLevel;

    embed.addFields(
        { name: '💰 Cược', value: `**${formatNumber(betAmount)} DCoin**`, inline: true },
        { name: '🎯 Mục tiêu', value: `**${tierEmoji} x${targetMultiplier.toFixed(1)}**`, inline: true },
        { name: '💵 Thắng được', value: `**${formatNumber(Math.floor(betAmount * targetMultiplier))} DCoin**`, inline: true }
    );

    embed.addFields({
        name: `${tierEmoji} Mức rủi ro: ${tierName}`,
        value: `Tỷ lệ thắng ước tính: **~${riskInfo.winChance}%**`
    });

    // Show crash history if available
    if (crash.formatCrashHistory) {
        const history = crash.formatCrashHistory();
        if (history && history !== 'Chưa có lịch sử') {
            embed.addFields({
                name: '📜 Lịch sử Crash',
                value: history
            });
        }
    }

    // Show analysis/patterns if available
    if (crash.analyzeCrashHistory) {
        const analysis = crash.analyzeCrashHistory();
        if (analysis.patterns && analysis.patterns.length > 0) {
            const patternText = analysis.patterns.map(p => p.message).join('\n');
            embed.addFields({
                name: '📊 Xu hướng',
                value: patternText + `\n📈 TB: x${analysis.avgCrash}`
            });
        }
    }

    return embed;
}

/**
 * Create crash result embed
 * @param {Object} result
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createCrashResultEmbed(result, balance) {
    const crash = require('../../games/casino/crash');
    const isWin = result.status === 'cashed_out';
    const tier = crash.getMultiplierTier ?
        crash.getMultiplierTier(isWin ? result.cashedOutAt : result.crashPoint) : null;

    const color = isWin ? config.colors.success : config.colors.error;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(isWin ? '📈 CRASH - BẠN THẮNG!' : '💥 CRASH - NỔ RỒI!')
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    let resultVisual = '```\n';
    if (isWin) {
        resultVisual += '    💰 THẮNG LỚN! 💰\n';
        resultVisual += '╔══════════════════════╗\n';
        resultVisual += `║   Rút tại: x${result.cashedOutAt.toFixed(2)}      ║\n`;
        resultVisual += `║   Crash: x${result.crashPoint.toFixed(2)}         ║\n`;
        resultVisual += '╚══════════════════════╝\n';
    } else {
        resultVisual += '    💥 NỔ! 💥\n';
        resultVisual += '╔══════════════════════╗\n';
        resultVisual += `║   Crash tại: x${result.crashPoint.toFixed(2)}    ║\n`;
        resultVisual += `║   Mục tiêu: Không đạt ║\n`;
        resultVisual += '╚══════════════════════╝\n';
    }
    resultVisual += '```';

    embed.setDescription(resultVisual);

    // Add result message if available
    if (result.resultMessage) {
        embed.addFields({ name: '💬', value: result.resultMessage });
    }

    if (isWin) {
        let winText = `**+${formatNumber(result.winnings)} DCoin**`;

        embed.addFields(
            { name: '💰 Đã cược', value: `${formatNumber(result.betAmount)} DCoin`, inline: true },
            { name: '✖️ Nhân số', value: `${tier ? tier.emoji : '🎯'} x${result.cashedOutAt.toFixed(2)}`, inline: true },
            { name: '🎁 Nhận được', value: winText, inline: true }
        );
    } else {
        embed.addFields(
            { name: '💸 Mất', value: `${formatNumber(result.betAmount)} DCoin`, inline: true },
            { name: '💥 Crash tại', value: `${tier ? tier.emoji : '💥'} x${result.crashPoint.toFixed(2)}`, inline: true },
            { name: '😢 Kết quả', value: 'Thua cuộc', inline: true }
        );
    }

    // Session stats
    if (result.session) {
        const session = result.session;
        const profit = session.profit ?? 0;
        const winRate = session.winRate ?? 0;
        const totalGames = session.totalGames ?? 0;
        const biggestMultiplier = session.biggestMultiplier ?? 0;

        // Chỉ hiển thị nếu đã có ít nhất 1 game
        if (totalGames > 0) {
            const profitEmoji = profit >= 0 ? '📈' : '📉';
            const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);

            let sessionText = `${profitEmoji} ${profitText}`;
            sessionText += ` | Win: ${winRate}%`;
            sessionText += ` | Games: ${totalGames}`;
            if (biggestMultiplier > 0) {
                sessionText += `\n🏆 Best: x${biggestMultiplier.toFixed(2)}`;
            }

            embed.addFields({
                name: '📊 Phiên chơi',
                value: sessionText,
                inline: false
            });
        }
    }

    // Show crash history
    if (crash.formatCrashHistory) {
        const history = crash.formatCrashHistory();
        if (history && history !== 'Chưa có lịch sử') {
            embed.addFields({
                name: '📜 Lịch sử',
                value: history
            });
        }
    }

    return embed;
}

/**
 * Create wheel embed
 * @param {number} balance
 * @param {number} betAmount
 * @returns {EmbedBuilder}
 */
function createWheelEmbed(balance, betAmount = 100) {
    const wheel = require('../../games/casino/wheel');

    const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎡 VÒNG QUAY MAY MẮN')
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    let description = '**📖 CÁCH CHƠI:**\n';
    description += '1️⃣ Chọn mức cược\n';
    description += '2️⃣ Nhấn **QUAY** và chờ kết quả!\n';
    description += '3️⃣ Vòng quay dừng ở ô nào → Nhận thưởng theo ô đó!\n\n';

    description += '**🎰 CÁC Ô THƯỞNG:**\n';
    description += wheel.getSegmentsInfo();

    embed.setDescription(description);

    embed.addFields(
        { name: '💰 Mức cược', value: `**${formatNumber(betAmount)} DCoin**`, inline: true },
        { name: '💵 Số dư', value: `${formatNumber(balance)} DCoin`, inline: true }
    );

    const cooldown = wheel.getCooldown('temp'); // Just for display
    if (cooldown > 0) {
        embed.addFields({ name: '⏰ Cooldown', value: `${cooldown}s`, inline: true });
    }

    // Show spin history if available
    if (wheel.formatSpinHistory) {
        const history = wheel.formatSpinHistory();
        if (history && history !== 'Chưa có lịch sử') {
            embed.addFields({
                name: '📜 Lịch sử',
                value: history
            });
        }
    }

    // Show hot/cold analysis
    if (wheel.getHotColdDisplay) {
        const hotCold = wheel.getHotColdDisplay();
        if (hotCold && hotCold !== 'Chưa đủ dữ liệu phân tích') {
            embed.addFields({
                name: '📊 Phân tích',
                value: hotCold
            });
        }
    }

    return embed;
}

/**
 * Create wheel result embed
 * @param {Object} result
 * @param {number} balance
 * @returns {EmbedBuilder}
 */
function createWheelResultEmbed(result, balance) {
    const wheel = require('../../games/casino/wheel');
    const isWin = result.isWin;
    const isJackpot = result.isJackpot;

    let color = config.colors.error;
    if (isJackpot) color = 0xFFD700;
    else if (isWin) color = config.colors.success;
    else if (result.segment.multiplier === 1) color = config.colors.neutral;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    if (isJackpot) {
        embed.setTitle('🎡 💎 JACKPOT! 💎');
    } else if (isWin) {
        embed.setTitle('🎡 WHEEL - THẮNG!');
    } else if (result.segment.multiplier === 0) {
        embed.setTitle('🎡 WHEEL - MẤT HẾT!');
    } else if (result.segment.multiplier === 1) {
        embed.setTitle('🎡 WHEEL - HÒA!');
    } else {
        embed.setTitle('🎡 WHEEL - THUA!');
    }

    // Visual display
    embed.setDescription(wheel.getWheelDisplay(result));

    // Add win message
    if (result.winMessage) {
        embed.addFields({ name: '💬', value: result.winMessage });
    }

    // Near-miss excitement
    if (result.nearMiss && result.nearMissMessage) {
        embed.addFields({ name: '😱', value: result.nearMissMessage });
    }

    embed.addFields(
        { name: '🎯 Kết quả', value: `**${result.segment.color} ${result.segment.label}**`, inline: false },
        { name: '💰 Đã cược', value: `${formatNumber(result.betAmount)} DCoin`, inline: true },
        { name: '✖️ Nhân số', value: `x${result.segment.multiplier}`, inline: true }
    );

    if (result.winnings > 0) {
        let profitText = `**${result.profit >= 0 ? '+' : ''}${formatNumber(result.profit)} DCoin**`;
        if (result.streakBonus && result.streakBonus > 0) {
            profitText += `\n🔥 +${formatNumber(result.streakBonus)} streak bonus!`;
        }

        embed.addFields({
            name: result.profit >= 0 ? '🎁 Lời' : '💸 Lỗ',
            value: profitText,
            inline: true
        });
    } else {
        embed.addFields({
            name: '💸 Mất',
            value: `**-${formatNumber(result.betAmount)} DCoin**`,
            inline: true
        });
    }

    // Streak info
    if (result.currentStreak && result.currentStreak > 1) {
        embed.addFields({
            name: '🏆 Win Streak',
            value: `${result.currentStreak} lần thắng liên tiếp!`,
            inline: true
        });
    }

    // Session stats
    if (result.session) {
        const session = result.session;
        const profit = session.profit ?? 0;
        const winRate = session.winRate ?? 0;
        const totalSpins = session.totalSpins ?? 0;
        const jackpotCount = session.jackpotCount ?? 0;

        // Chỉ hiển thị nếu đã có ít nhất 1 spin
        if (totalSpins > 0) {
            const profitEmoji = profit >= 0 ? '📈' : '📉';
            const profitText = profit >= 0 ? `+${formatNumber(profit)}` : formatNumber(profit);

            let sessionText = `${profitEmoji} ${profitText}`;
            sessionText += ` | Win: ${winRate}%`;
            sessionText += ` | Spins: ${totalSpins}`;
            if (jackpotCount > 0) {
                sessionText += ` | 💎 Jackpots: ${jackpotCount}`;
            }

            embed.addFields({
                name: '📊 Phiên chơi',
                value: sessionText,
                inline: false
            });
        }
    }


    // XP info
    if (result.xpGained > 0) {
        let xpText = `+${result.xpGained} XP`;
        if (result.levelUp) {
            xpText += ` 🎉 **LEVEL UP! → Lv.${result.newLevel}**`;
        }
        embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: false });
    }

    return embed;
}

module.exports = {
    createCasinoMenuEmbed,
    createBlackjackBetEmbed,
    createBlackjackEmbed,
    createRouletteEmbed,
    createSlotsEmbed,
    createSlotsWaitingEmbed,
    createCrashEmbed,
    createCrashResultEmbed,
    createWheelEmbed,
    createWheelResultEmbed
};
