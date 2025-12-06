const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');

// Hardcoded colors to avoid undefined issues with config
const COLORS = {
    primary: 0xFFD700,
    success: 0x00D166,
    error: 0xFF6B6B,
    warning: 0xFFA500,
    legendary: 0xFFD700,
    epic: 0x9B30FF,
    rare: 0x0080FF,
    uncommon: 0x00FF00,
    common: 0xCCCCCC
};

/**

 * ========================================
 * FISHING V2 - Interactive Embeds
 * ========================================
 */

/**
 * Fishing start embed - Location selection
 */
function createFishingStartEmbed(rod, locations, balance) {
    const embed = new EmbedBuilder()
        .setTitle('🎣 CÂU CÁ PHIÊU LƯU')
        .setColor(COLORS.primary)
        .setDescription(
            `**🎣 Cần câu:** ${getRarityEmoji(rod.rarity)} **${rod.name}**\n\n` +
            `**📍 CHỌN ĐỊA ĐIỂM CÂU:**\n\n` +
            `🏖️ **Bờ biển** - An toàn, cá thường\n` +
            `└ Timing: 3s | Cá: ⚪🟢\n\n` +
            `🌊 **Biển sâu** - Cá quý, khó hơn\n` +
            `└ Timing: 2s | Cá: 🟢🔵🟣\n\n` +
            `🦑 **Đại dương sâu** - Cá huyền thoại!\n` +
            `└ Timing: 1.5s | Cá: 🔵🟣🟡`
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin | Chọn vị trí để bắt đầu!` });

    return embed;
}

/**
 * Fishing waiting embed - Waiting for fish
 */
function createFishingWaitingEmbed(rod, location) {
    const embed = new EmbedBuilder()
        .setTitle('🎣 Đang câu cá...')
        .setColor(COLORS.warning)
        .setDescription(
            `**📍 Vị trí:** ${location.name}\n` +
            `**🎣 Cần câu:** ${rod.name}\n\n` +
            `🌊 *Thả câu xuống nước...*\n\n` +
            `\`\`\`\n` +
            `     🎣\n` +
            `      |\n` +
            `   ~~~|~~~\n` +
            `  🐟  🐠  🐡\n` +
            `\`\`\`\n\n` +
            `⏳ **Đợi cá cắn câu...**\n` +
            `*Khi cá cắn, nhấn nút ngay!*`
        )
        .setFooter({ text: '💡 Timing tốt = Bonus x1.5!' });

    return embed;
}

/**
 * Fishing hook embed - Fish biting!
 */
function createFishingHookEmbed(timeRemaining) {
    const embed = new EmbedBuilder()
        .setTitle('🐟 CÁ CẮN CÂU!')
        .setColor(COLORS.error)
        .setDescription(
            `\`\`\`\n` +
            `     🎣💥\n` +
            `      |\n` +
            `   ~~~|~~~\n` +
            `     🐟!\n` +
            `\`\`\`\n\n` +
            `# 🔴 NHẤN NÚT NGAY!\n\n` +
            `⏰ Còn **${timeRemaining}** giây!`
        )
        .setFooter({ text: '⚡ Nhấn càng nhanh = Bonus càng cao!' });

    return embed;
}

/**
 * Fishing reel embed - Reeling the fish
 */
function createFishingReelEmbed(fish, pattern, progress, total, bonusMultiplier, timeRemaining) {
    // Null safety checks
    if (!fish || !pattern || !Array.isArray(pattern)) {
        return new EmbedBuilder()
            .setTitle('🎣 Lỗi câu cá')
            .setColor(0xFF6B6B) // Hardcoded error color
            .setDescription('❌ Phiên câu cá không hợp lệ. Vui lòng thử lại!');
    }

    const progressBar = createProgressBar(progress ?? 0, total ?? pattern.length);
    const bonus = bonusMultiplier ?? 1;
    const time = timeRemaining ?? 10;

    const embed = new EmbedBuilder()
        .setTitle(`🎣 KÉO ${fish.emoji ?? '🐟'} ${(fish.name ?? 'Cá').toUpperCase()}!`)
        .setColor(getRarityColor(fish.rarity ?? 'COMMON'))
        .setDescription(
            `**Độ hiếm:** ${fish.rarity ?? 'COMMON'}\n` +
            `**Bonus hiện tại:** x${bonus.toFixed(2)}\n\n` +
            `${progressBar}\n\n` +
            `**Nhấn đúng thứ tự:**\n` +
            `${pattern.map((p, i) => i < (progress ?? 0) ? '✅' : (i === (progress ?? 0) ? `**${p}**` : p)).join(' → ')}\n\n` +
            `⏰ Còn **${time}s**`
        )
        .setFooter({ text: '💡 Nhấn đúng pattern để kéo cá lên!' });

    return embed;
}


/**
 * Fishing result embed
 */
function createFishingResultEmbed(result, balance) {
    // Null safety checks
    if (!result || !result.catch) {
        return new EmbedBuilder()
            .setTitle('🎣 Lỗi câu cá')
            .setColor(0xFF6B6B) // Hardcoded error color
            .setDescription('❌ Không thể hiển thị kết quả. Vui lòng thử lại!');
    }

    const fish = result.catch;
    const bonusMultiplier = result.bonusMultiplier ?? 1;
    const isPerfect = bonusMultiplier >= 1.5;

    const fishEmoji = fish.emoji ?? '🐟';
    const fishName = fish.name ?? 'Cá';
    const fishRarity = fish.rarity ?? 'COMMON';
    const quantity = result.quantity ?? 1;
    const locationName = result.location?.name ?? 'Không xác định';
    const rodName = result.rod?.name ?? 'Cần câu Tre';

    const embed = new EmbedBuilder()
        .setTitle(isPerfect ? '🎉 PERFECT CATCH!' : '🎣 Bắt được cá!')
        .setColor(isPerfect ? COLORS.legendary : COLORS.success)
        .setDescription(
            `${fishEmoji} **${fishName}** x${quantity}\n\n` +
            `**📍 Vị trí:** ${locationName}\n` +
            `**🎣 Cần câu:** ${rodName}\n` +
            `**💎 Độ hiếm:** ${fishRarity}\n` +
            `**✨ Bonus:** x${bonusMultiplier.toFixed(2)}\n` +
            (result.dcoinReward > 0 ? `**💰 DCoin:** +${formatNumber(result.dcoinReward)}\n` : '') +
            (isPerfect ? '\n🌟 *Perfect timing bonus!*' : '')
        );

    if (result.xpGained > 0) {
        let xpText = `+${result.xpGained} XP`;
        if (result.levelUp) {
            xpText += ` 🎉 **LEVEL UP! → Lv.${result.newLevel}**`;
        }
        embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: false });
    }

    embed.setFooter({ text: `💰 Số dư: ${formatNumber(balance ?? 0)} DCoin | Bán cá tại Shop` });

    return embed;
}


/**
 * Fishing failed embed
 */
function createFishingFailedEmbed(reason, message) {
    const embed = new EmbedBuilder()
        .setTitle('💨 Cá thoát mất!')
        .setColor(0xFF6B6B) // Hardcoded error color
        .setDescription(
            `${message}\n\n` +
            `*Thử lại nhé, cá không thiếu đâu! 🐟*`
        )
        .setFooter({ text: 'Tip: Nhấn đúng lúc và đúng pattern!' });

    return embed;
}

/**
 * ========================================
 * MINING V2 - Interactive Embeds
 * ========================================
 */

/**
 * Mining start embed - Location selection
 */
function createMiningStartEmbed(pickaxe, locations, balance) {
    const embed = new EmbedBuilder()
        .setTitle('⛏️ ĐÀO MỎ PHIÊU LƯU')
        .setColor(COLORS.primary)
        .setDescription(
            `**⛏️ Cuốc:** ${getRarityEmoji(pickaxe.rarity)} **${pickaxe.name}**\n\n` +
            `**📍 CHỌN KHU MỎ:**\n\n` +
            `🕳️ **Hang động** - An toàn, quặng thường\n` +
            `└ Đào: 3 lần | Quặng: ⚪🟢\n\n` +
            `⛏️ **Mỏ sâu** - Quặng quý, nguy hiểm\n` +
            `└ Đào: 4 lần | Quặng: 🟢🔵🟣\n\n` +
            `🌋 **Núi lửa** - Quặng huyền thoại!\n` +
            `└ Đào: 5 lần | Quặng: 🔵🟣🟡`
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin | Chọn khu mỏ để bắt đầu!` });

    return embed;
}

/**
 * Mining dig embed - Digging phase
 */
function createMiningDigEmbed(session) {
    const combo = session.combo;
    const currentDig = session.currentDig;
    const maxDigs = session.maxDigs;
    const nextPattern = session.nextDigPattern;
    const oresFound = session.oresFound || [];

    const comboBar = '🔥'.repeat(Math.min(combo, 10)) + '⬜'.repeat(Math.max(0, 10 - combo));
    const oresDisplay = oresFound.length > 0
        ? oresFound.map(o => `${o.emoji}${o.critical ? '💥' : ''}`).join(' ')
        : '*Chưa tìm thấy quặng*';

    const embed = new EmbedBuilder()
        .setTitle(`⛏️ ĐANG ĐÀO... (${currentDig}/${maxDigs})`)
        .setColor(combo >= 5 ? COLORS.success : COLORS.primary)
        .setDescription(
            `**📍 Vị trí:** ${session.location.name}\n\n` +
            `\`\`\`\n` +
            `   ⛰️⛰️⛰️\n` +
            `  ⛏️ → ${nextPattern}\n` +
            `   💎 ? 💎\n` +
            `\`\`\`\n\n` +
            `**🎯 NHẤN NÚT:** ${nextPattern}\n\n` +
            `**Combo:** ${comboBar} x${combo}\n` +
            `**Quặng tìm được:** ${oresDisplay}`
        )
        .setFooter({ text: '💡 Combo càng cao = Quặng càng hiếm!' });

    return embed;
}

/**
 * Mining extract embed - Extracting ore
 */
function createMiningExtractEmbed(ore, pattern, progress, total, bonusMultiplier, timeRemaining) {
    // Null safety checks
    if (!ore || !pattern || !Array.isArray(pattern)) {
        return new EmbedBuilder()
            .setTitle('⛏️ Lỗi đào mỏ')
            .setColor(0xFF6B6B) // Hardcoded error color
            .setDescription('❌ Phiên đào mỏ không hợp lệ. Vui lòng thử lại!');
    }

    const progressBar = createProgressBar(progress ?? 0, total ?? pattern.length);
    const bonus = bonusMultiplier ?? 1;
    const time = timeRemaining ?? 10;

    const embed = new EmbedBuilder()
        .setTitle(`💎 KHAI THÁC ${ore.emoji ?? '💎'} ${(ore.name ?? 'Quặng').toUpperCase()}!`)
        .setColor(getRarityColor(ore.rarity ?? 'COMMON'))
        .setDescription(
            `**Độ hiếm:** ${ore.rarity ?? 'COMMON'}\n` +
            `**Bonus hiện tại:** x${bonus.toFixed(2)}\n\n` +
            `${progressBar}\n\n` +
            `**Nhấn đúng thứ tự:**\n` +
            `${pattern.map((p, i) => i < (progress ?? 0) ? '✅' : (i === (progress ?? 0) ? `**${p}**` : p)).join(' → ')}\n\n` +
            `⏰ Còn **${time}s**`
        )
        .setFooter({ text: '💡 Perfect extract = x1.5 quặng!' });

    return embed;
}


/**
 * Mining result embed
 */
function createMiningResultEmbed(result, balance) {
    // Null safety checks
    if (!result) {
        return new EmbedBuilder()
            .setTitle('⛏️ Lỗi đào mỏ')
            .setColor(0xFF6B6B) // Hardcoded error color
            .setDescription('❌ Không thể hiển thị kết quả. Vui lòng thử lại!');
    }

    const isPerfect = result.perfectExtract ?? false;

    let oresText = '*Không có quặng*';
    if (result.ores && result.ores.length > 0) {
        oresText = result.ores.map(o => `${o.emoji ?? '💎'} **${o.name ?? 'Quặng'}** x${o.quantity ?? 1}`).join('\n');
    }

    const locationName = result.location?.name ?? 'Không xác định';
    const pickaxeName = result.pickaxe?.name ?? 'Cuốc Gỗ';
    const maxCombo = result.maxCombo ?? 0;
    const bonusMultiplier = result.bonusMultiplier ?? 1;

    const embed = new EmbedBuilder()
        .setTitle(isPerfect ? '🎉 PERFECT EXTRACT!' : '⛏️ Khai thác thành công!')
        .setColor(isPerfect ? COLORS.legendary : COLORS.success)
        .setDescription(
            `**Quặng thu được:**\n${oresText}\n\n` +
            `**📍 Vị trí:** ${locationName}\n` +
            `**⛏️ Cuốc:** ${pickaxeName}\n` +
            `**🔥 Max Combo:** x${maxCombo}\n` +
            `**✨ Bonus:** x${bonusMultiplier.toFixed(2)}\n` +
            (result.criticalHits ? '💥 *Critical Hit Bonus!*\n' : '') +
            (result.dcoinReward > 0 ? `**💰 DCoin:** +${formatNumber(result.dcoinReward)}\n` : '') +
            (isPerfect ? '\n🌟 *Perfect extract bonus!*' : '')
        );

    if (result.xpGained > 0) {
        let xpText = `+${result.xpGained} XP`;
        if (result.levelUp) {
            xpText += ` 🎉 **LEVEL UP! → Lv.${result.newLevel}**`;
        }
        embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: false });
    }

    embed.setFooter({ text: `💰 Số dư: ${formatNumber(balance ?? 0)} DCoin | Bán quặng tại Shop` });

    return embed;
}


/**
 * Mining failed embed
 */
function createMiningFailedEmbed(message) {
    const embed = new EmbedBuilder()
        .setTitle('😔 Không tìm thấy quặng')
        .setColor(0xFF6B6B) // Hardcoded error color
        .setDescription(
            `${message}\n\n` +
            `*Lần sau may mắn hơn nhé! ⛏️*`
        )
        .setFooter({ text: 'Tip: Combo cao = Cơ hội quặng hiếm!' });

    return embed;
}

/**
 * ========================================
 * HIGHER/LOWER V2 - Enhanced Embeds
 * ========================================
 */

/**
 * Higher/Lower game embed with visual cards
 */
function createHigherLowerEmbedV2(game, lastResult = null) {
    const cardDisplay = getCardVisual(game.currentNumber);
    const historyDisplay = game.history.slice(-5).map(n => getCardDisplay(n)).join(' → ');

    let description = `**🃏 LÁ BÀI HIỆN TẠI:**\n`;
    description += `\`\`\`\n${cardDisplay}\`\`\`\n`;
    description += `**Giá trị:** ${game.currentNumber}/13\n\n`;

    if (lastResult && lastResult.won) {
        description += `✅ **Đoán đúng!** ${getCardDisplay(lastResult.previousNumber)} → **${getCardDisplay(lastResult.newNumber)}**\n\n`;
    }

    description += `**📈 Lịch sử:** ${historyDisplay}\n`;
    description += `**🔥 Streak:** ${game.streak} lần\n`;
    description += `**💰 Thưởng:** ${formatNumber(game.currentReward)} DCoin\n\n`;
    description += `*Lá tiếp theo CAO HƠN hay THẤP HƠN?*`;

    const embed = new EmbedBuilder()
        .setTitle('🃏 CAO THẤP (Higher or Lower)')
        .setColor(game.streak >= 5 ? COLORS.legendary : COLORS.primary)
        .setDescription(description);

    if (game.streak >= 3) {
        embed.setFooter({ text: `🔥 Hot streak! Bạn có thể Double or Nothing! | Max: x7` });
    } else {
        embed.setFooter({ text: '💡 Cash out bất kỳ lúc nào để nhận thưởng!' });
    }

    return embed;
}

/**
 * ========================================
 * RPS V2 - Best of 3/5 Embeds
 * ========================================
 */

/**
 * RPS mode selection embed
 */
function createRPSModeEmbed(balance, betAmount) {
    const embed = new EmbedBuilder()
        .setTitle('✊ OẲN TÙ TÌ - CHỌN CHẾ ĐỘ')
        .setColor(COLORS.primary)
        .setDescription(
            `**💰 Tiền cược:** ${formatNumber(betAmount)} DCoin\n\n` +
            `**🎮 CHỌN CHẾ ĐỘ CHƠI:**\n\n` +
            `🎯 **Ván đơn** - Chơi 1 ván\n` +
            `└ Thắng: x2.0 | Hòa: Hoàn tiền\n\n` +
            `🏆 **Best of 3** - Thắng 2/3 ván\n` +
            `└ Thắng: x3.0 | Hấp dẫn hơn!\n\n` +
            `👑 **Best of 5** - Thắng 3/5 ván\n` +
            `└ Thắng: x5.0 | Đấu trí căng thẳng!`
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin` });

    return embed;
}

/**
 * RPS game embed with score
 */
function createRPSGameEmbed(session, lastRound = null) {
    const { playerScore, botScore, round, maxRounds, betAmount } = session;
    const winsNeeded = Math.ceil(maxRounds / 2);

    let description = `**💰 Cược:** ${formatNumber(betAmount)} DCoin\n`;
    description += `**🎯 Cần thắng:** ${winsNeeded} ván\n\n`;

    if (lastRound) {
        const { playerChoice, botChoice, result } = lastRound;
        const resultEmoji = result === 'win' ? '✅' : (result === 'draw' ? '🤝' : '❌');
        description += `**Ván ${round - 1}:** ${getEmoji(playerChoice)} vs ${getEmoji(botChoice)} ${resultEmoji}\n\n`;
    }

    // Score display
    description += `\`\`\`\n`;
    description += `  BẠN  ${playerScore} - ${botScore}  BOT\n`;
    description += `\`\`\`\n\n`;

    description += `**Ván ${round}/${maxRounds}** - Chọn nước đi!`;

    const embed = new EmbedBuilder()
        .setTitle(`✊ OẲN TÙ TÌ - Best of ${maxRounds}`)
        .setColor(playerScore > botScore ? COLORS.success : (botScore > playerScore ? COLORS.error : COLORS.primary))
        .setDescription(description)
        .setFooter({ text: '🪨 Đá > ✂️ Kéo > 📄 Bao > 🪨 Đá' });

    return embed;
}

/**
 * RPS result embed
 */
function createRPSResultEmbed(result, balance) {
    const won = result.playerScore > result.botScore;
    const draw = result.playerScore === result.botScore;

    let title, description, color;

    if (won) {
        title = '🎉 BẠN THẮNG!';
        description = `Kết quả: **${result.playerScore} - ${result.botScore}**\n\n💰 +${formatNumber(result.winnings)} DCoin!`;
        color = COLORS.success;
    } else if (draw) {
        title = '🤝 HÒA!';
        description = `Kết quả: **${result.playerScore} - ${result.botScore}**\n\n💰 Hoàn lại ${formatNumber(result.betAmount)} DCoin`;
        color = COLORS.warning;
    } else {
        title = '😢 THUA CUỘC!';
        description = `Kết quả: **${result.playerScore} - ${result.botScore}**\n\n💸 -${formatNumber(result.betAmount)} DCoin`;
        color = COLORS.error;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setDescription(description)
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin` });

    return embed;
}

/**
 * ========================================
 * HELPER FUNCTIONS
 * ========================================
 */

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

function getRarityColor(rarity) {
    const colors = {
        'LEGENDARY': 0xFFD700,
        'EPIC': 0x9B30FF,
        'RARE': 0x0080FF,
        'UNCOMMON': 0x00FF00,
        'COMMON': 0xCCCCCC
    };
    // Return color or default COMMON color (avoid undefined from config)
    return colors[rarity] || colors['COMMON'] || 0xCCCCCC;
}


function createProgressBar(current, total, length = 10) {
    const filled = Math.floor((current / total) * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${current}/${total}`;
}

function getCardDisplay(number) {
    const cards = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return cards[number] || number.toString();
}

function getCardVisual(number) {
    const display = getCardDisplay(number);
    return `┌─────┐\n│  ${display.padEnd(2)} │\n│  ♠️  │\n│ ${display.padStart(2)}  │\n└─────┘`;
}

function getEmoji(choice) {
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
    return emojis[choice] || '❓';
}

module.exports = {
    // Fishing V2
    createFishingStartEmbed,
    createFishingWaitingEmbed,
    createFishingHookEmbed,
    createFishingReelEmbed,
    createFishingResultEmbed,
    createFishingFailedEmbed,

    // Mining V2
    createMiningStartEmbed,
    createMiningDigEmbed,
    createMiningExtractEmbed,
    createMiningResultEmbed,
    createMiningFailedEmbed,

    // Higher/Lower V2
    createHigherLowerEmbedV2,

    // RPS V2
    createRPSModeEmbed,
    createRPSGameEmbed,
    createRPSResultEmbed,

    // Helpers
    getRarityEmoji,
    getRarityColor,
    createProgressBar,
    getCardDisplay,
    getCardVisual
};
