const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');

/**
 * Create Lucky Number game embed
 * @param {Object} game 
 * @returns {EmbedBuilder}
 */
function createLuckyNumberEmbed(game) {
    const embed = new EmbedBuilder()
        .setTitle('🎯 ĐOÁN SỐ MAY MẮN')
        .setDescription(
            '**🎮 CÁCH CHƠI:**\n' +
            '• Máy chọn một số bí mật từ **1 đến 100**\n' +
            '• Bạn có **5 lượt** để đoán đúng\n' +
            '• Sau mỗi lần đoán, máy sẽ gợi ý **CAO hơn** hoặc **THẤP hơn**\n\n' +
            '**💰 PHẦN THƯỞNG:**\n' +
            '• Đoán đúng lần 1: **100 DCoin** 🤑\n' +
            '• Đoán đúng lần 2: **60 DCoin**\n' +
            '• Đoán đúng lần 3: **40 DCoin**\n' +
            '• Đoán đúng lần 4: **25 DCoin**\n' +
            '• Đoán đúng lần 5: **15 DCoin**\n\n' +
            '*Số bí ẩn là số gì nàooo? 🧠*'
        )
        .setColor(config.colors.primary);

    if (game.guesses && game.guesses.length > 0) {
        const guessHistory = game.guesses.map((g, i) => `Lần ${i + 1}: **${g}**`).join('\n');
        embed.addFields({ name: '📝 Lịch sử đoán', value: guessHistory, inline: true });
    }

    embed.addFields(
        { name: '🎫 Lượt còn lại', value: `${game.maxAttempts - game.attempts}/${game.maxAttempts}`, inline: true }
    );

    embed.setFooter({ text: 'Nhấn nút số hoặc nhập số riêng bằng nút "Nhập số khác"' });

    return embed;
}

/**
 * Create Lucky Number result embed
 * @param {Object} result 
 * @returns {EmbedBuilder}
 */
function createLuckyNumberResultEmbed(result) {
    const embed = new EmbedBuilder()
        .setTitle(result.won ? '🎉 CHÍNH XÁC!' : '❌ Hết lượt!')
        .setColor(result.won ? config.colors.success : config.colors.error);

    if (result.won) {
        embed.setDescription(`Số bí ẩn là **${result.game.targetNumber}**!\n\nBạn đã đoán đúng sau **${result.game.attempts}** lần!`);
        embed.addFields({ name: '💰 Phần thưởng', value: `+${formatNumber(result.reward)} DCoin`, inline: true });
    } else {
        embed.setDescription(`Số bí ẩn là **${result.game.targetNumber}**!\n\n${result.hint}`);
    }

    return embed;
}

/**
 * Create Higher/Lower game embed
 * @param {Object} game 
 * @returns {EmbedBuilder}
 */
function createHigherLowerEmbed(game) {
    const cardDisplay = getCardDisplay(game.currentNumber);

    let description = `**🎮 CÁCH CHƠI:**\n`;
    description += `• Số hiện tại: **${cardDisplay}** (${game.currentNumber}/13)\n`;
    description += `• Đoán số tiếp theo **CAO HƠN** hay **THẤP HƠN**?\n`;
    description += `• Đúng liên tục = **Streak** càng cao!\n\n`;
    description += `**💰 PHẦN THƯỞNG:**\n`;
    description += `• Mỗi lần đúng: **x1.5** số tiền\n`;
    description += `• Bạn có thể **Rút tiền** bất kỳ lúc nào\n`;
    description += `• Sai = Mất hết tiền thua!\n\n`;
    description += `**Lên rồi xuống, biết đâu thắng đậm?**`;

    const embed = new EmbedBuilder()
        .setTitle('🃏 CAO THẤP (Higher or Lower)')
        .setDescription(description)
        .setColor(config.colors.primary)
        .addFields(
            { name: '🔥 Streak hiện tại', value: `**${game.streak}** lần đúng`, inline: true },
            { name: '💰 Thưởng hiện tại', value: `**${formatNumber(game.currentReward)}** DCoin`, inline: true }
        );

    if (game.streak > 0) {
        embed.setFooter({ text: '💡 Bạn có thể Cash Out bất kỳ lúc nào!' });
    }

    return embed;
}

/**
 * Create Higher/Lower result embed
 * @param {Object} result 
 * @returns {EmbedBuilder}
 */
function createHigherLowerResultEmbed(result) {
    // Null check for previousNumber and newNumber (cashOut doesn't return these)
    const prevCard = result.previousNumber != null ? getCardDisplay(result.previousNumber) : '?';
    const newCard = result.newNumber != null ? getCardDisplay(result.newNumber) : '?';

    const embed = new EmbedBuilder()
        .setColor(result.won ? config.colors.success : config.colors.error);

    if (result.won && result.canContinue) {
        embed.setTitle('✅ Đúng rồi!');
        embed.setDescription(`${prevCard} → **${newCard}**\n\nSố tiếp theo sẽ **CAO HƠN** hay **THẤP HƠN**?`);
        embed.addFields(
            { name: '🔥 Streak', value: `${result.streak}`, inline: true },
            { name: '💰 Thưởng hiện tại', value: formatNumber(result.currentReward), inline: true }
        );
    } else if (result.reward !== undefined && result.won === undefined) {
        // Cash out - won is undefined, only has reward
        embed.setTitle('💰 Cash Out thành công!');
        embed.setDescription(`🔥 Streak: **${result.streak}**\n💎 Thưởng: **+${formatNumber(result.reward)} DCoin**`);
        embed.setColor(config.colors.success);
    } else {
        embed.setTitle('❌ Sai rồi!');
        const choiceText = result.choice === 'higher' ? 'Cao hơn' : 'Thấp hơn';
        embed.setDescription(`${prevCard} → **${newCard}**\n\nBạn chọn: ${choiceText}\n\n🔥 Streak cuối: **${result.streak ?? 0}**`);
    }

    return embed;
}


/**
 * Create Quick Math game embed với Discord live timestamp
 * @param {Object} game 
 * @returns {EmbedBuilder}
 */
function createQuickMathEmbed(game) {
    // Tính timestamp khi hết giờ (Discord sẽ tự động đếm ngược)
    const endTimeMs = game.problemStartTime + game.timeLimit;
    const endTimeSeconds = Math.floor(endTimeMs / 1000);

    // Discord timestamp format: <t:UNIX_SECONDS:R> = relative time (tự động đếm ngược live!)
    const countdownTimer = `<t:${endTimeSeconds}:R>`;

    let description = `**🎮 CÁCH CHƠI:**\n`;
    description += `• Trả lời **10 câu** toán nhanh\n`;
    description += `• Mỗi câu có **8 giây**\n`;
    description += `• Nhấn nút đáp án đúng!\n\n`;
    description += `**❓ CÂU HỎI:**\n`;
    description += `# ${game.currentProblem.question}\n\n`;
    description += `⏰ **Hết giờ:** ${countdownTimer}`;

    const embed = new EmbedBuilder()
        .setTitle('⚡ TOÁN NHẨM NHANH')
        .setDescription(description)
        .setColor(config.colors.warning)
        .addFields(
            { name: '❓ Câu hỏi', value: `**${game.questionNumber}**/${game.totalQuestions}`, inline: true },
            { name: '✅ Đúng', value: `**${game.correctAnswers}** câu`, inline: true },
            { name: '🔥 Streak', value: `**${game.streak}**`, inline: true }
        )
        .setFooter({ text: `💰 Thưởng tạm tính: ${formatNumber(game.totalReward)} DCoin | Đúng liên tục = Bonus!` });

    return embed;
}

/**
 * Create Quick Math result embed
 * @param {Object} result 
 * @returns {EmbedBuilder}
 */
function createQuickMathResultEmbed(result) {
    const embed = new EmbedBuilder();

    if (result.finished) {
        embed.setTitle('🏁 Kết quả Quick Math');
        embed.setColor(result.finalReward > 0 ? config.colors.success : config.colors.error);
        embed.setDescription(`Đúng: **${result.game.correctAnswers}/${result.game.totalQuestions}**\nStreak cao nhất: **${result.game.maxStreak}**`);
        embed.addFields({ name: '💰 Tổng thưởng', value: `+${formatNumber(result.finalReward)} DCoin`, inline: true });
    } else {
        embed.setTitle(result.isCorrect ? '✅ Đúng!' : (result.timedOut ? '⏰ Hết giờ!' : '❌ Sai!'));
        embed.setColor(result.isCorrect ? config.colors.success : config.colors.error);
        if (!result.isCorrect) {
            embed.setDescription(`Đáp án đúng: **${result.correctAnswer}**`);
        }
    }

    return embed;
}

/**
 * Create Mystery Box embed
 * @param {Object} boxTypes 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createMysteryBoxEmbed(boxTypes, balance) {
    const embed = new EmbedBuilder()
        .setTitle('🎁 TÚI MÙ BÍ ẨN')
        .setDescription(
            '**🎮 CÁCH CHƠI:**\n' +
            '• Chọn loại túi mù để mở\n' +
            '• Túi đắt hơn = Cơ hội thưởng lớn hơn!\n' +
            '• Có thể ra **JACKPOT** hoặc **vật phẩm hiếm**!\n\n' +
            '**⚠️ LƯU Ý:**\n' +
            '• Cũng có thể không ra gì cả\n' +
            '• Nhưng biết đâu bạn bất ngờ **JACKPOT** thì sao? 👉👈'
        )
        .setColor(config.colors.primary)
        .addFields(
            {
                name: `📦 ${boxTypes.NORMAL.name}`,
                value: `💵 **${formatNumber(boxTypes.NORMAL.cost)}** DCoin\n🎲 Thưởng: 0 - 2,500\n📊 Tỷ lệ: Cân bằng`,
                inline: true
            },
            {
                name: `🎁 ${boxTypes.PREMIUM.name}`,
                value: `💵 **${formatNumber(boxTypes.PREMIUM.cost)}** DCoin\n🎲 Thưởng: 0 - 5,000\n📊 Tỷ lệ: Tốt hơn`,
                inline: true
            },
            {
                name: `👑 ${boxTypes.LEGENDARY.name}`,
                value: `💵 **${formatNumber(boxTypes.LEGENDARY.cost)}** DCoin\n🎲 Thưởng: 0 - 10,000+\n🌟 Cơ hội JACKPOT!`,
                inline: true
            }
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin | Chúc may mắn!` });

    return embed;
}

/**
 * Create Mystery Box result embed
 * @param {Object} result 
 * @param {number} newBalance - Balance after play
 * @returns {EmbedBuilder}
 */
function createMysteryBoxResultEmbed(result, newBalance) {
    let title, description;

    if (result.isJackpot) {
        title = '🎰 JACKPOT!!!';
        description = `Bạn đã trúng **JACKPOT**!\n\n💰 **+${formatNumber(result.reward.amount)} DCoin**`;
    } else if (result.reward.type === 'item') {
        title = '🎁 Nhận được vật phẩm!';
        description = `Bạn nhận được:\n\n🏆 **${result.reward.item.name}**\n⭐ Độ hiếm: ${result.reward.item.rarity}`;
    } else {
        const emoji = result.profit > 0 ? '💰' : (result.profit === 0 ? '😐' : '💸');
        title = `${emoji} Mở hộp ${result.box.name}`;
        description = `Bạn nhận được: **${formatNumber(result.reward.amount)} DCoin**\n\nLợi nhuận: **${result.profit > 0 ? '+' : ''}${formatNumber(result.profit)}** DCoin`;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(result.profit >= 0 ? config.colors.success : config.colors.error);

    // Add balance after play if provided
    if (typeof newBalance === 'number') {
        embed.setFooter({ text: `Số dư hiện tại: ${formatNumber(newBalance)} DCoin` });
    }

    return embed;
}

/**
 * Create Tài Xỉu game embed
 * @param {number} balance 
 * @param {string} selectedCategory - Category selected for showing specific info (optional)
 * @returns {EmbedBuilder}
 */
function createDiceEmbed(balance, selectedCategory = null) {
    const taixiu = require('../../games/casino/taixiu');

    const embed = new EmbedBuilder()
        .setTitle('🎲 TÀI XỈU (SIC BO)')
        .setColor(0xE74C3C)
        .setDescription(
            '**🎮 CÁCH CHƠI:**\n' +
            '1️⃣ Chọn loại cược bên dưới\n' +
            '2️⃣ Chọn số tiền cược\n' +
            '3️⃣ Máy tung **3 xúc xắc** (tổng 3-18)\n' +
            '4️⃣ Trùng cược = Thắng!\n\n' +
            '**⚠️ QUAN TRỌNG:**\n' +
            '• Khi ra **Bộ ba** (3 con giống nhau):\n' +
            '  → Cược Tài/Xỉu/Chẵn/Lẻ đều **THUA**!\n' +
            '• Chỉ cược "Bộ ba" mới thắng khi ra Bộ ba\n' +
            '• 🔥 **Win streak 3+** cho bonus tới 15%!\n\n' +
            '*Chọn loại cược ở các nút bên dưới:*'
        );

    // Show different info based on selected category
    if (!selectedCategory) {
        embed.addFields(
            {
                name: '🔴🔵 Cược Cơ bản (x2)',
                value: '• **Tài**: Tổng 11-17\n• **Xỉu**: Tổng 4-10\n• **Chẵn/Lẻ**: Tổng chẵn hoặc lẻ',
                inline: true
            },
            {
                name: '🎰 Cược Bộ ba (x28-150)',
                value: '• **Bất kỳ bộ ba**: Cả 3 giống (x28)\n• **Bộ ba cụ thể**: VD: 1-1-1 (x150)',
                inline: true
            },
            {
                name: '🎯 Cược Tổng (x5.5-50)',
                value: '• Đoán đúng tổng từ 4-17\n• Tổng 10/11: x5.5\n• Tổng 4/17: x50',
                inline: true
            }
        );
    } else if (selectedCategory === 'basic') {
        embed.addFields(
            {
                name: '🔴 Tài (11-17)',
                value: 'Tổng từ 11-17 (trừ Bộ ba)\nThưởng: **x2**\nTỷ lệ thắng: ~48.6%',
                inline: true
            },
            {
                name: '🔵 Xỉu (4-10)',
                value: 'Tổng từ 4-10 (trừ Bộ ba)\nThưởng: **x2**\nTỷ lệ thắng: ~48.6%',
                inline: true
            },
            {
                name: '⚫⚪ Chẵn/Lẻ',
                value: 'Tổng chẵn hoặc lẻ (trừ Bộ ba)\nThưởng: **x2**\nTỷ lệ thắng: ~48.6%',
                inline: true
            }
        );
    } else if (selectedCategory === 'triple') {
        embed.addFields(
            {
                name: '🎰 Bất kỳ Bộ ba',
                value: 'Cả 3 xúc xắc giống (bất kỳ)\nThưởng: **x28**\nTỷ lệ thắng: ~2.78%',
                inline: true
            },
            {
                name: '⚀⚁⚂ Bộ ba cụ thể',
                value: 'VD: 1-1-1, 2-2-2, ..., 6-6-6\nThưởng: **x150**\nTỷ lệ thắng: ~0.46%',
                inline: true
            }
        );
    } else if (selectedCategory === 'total') {
        embed.addFields(
            {
                name: '🎯 Tổng Hiếm (4,5,16,17)',
                value: '• Tổng 4 hoặc 17: **x50**\n• Tổng 5 hoặc 16: **x25**',
                inline: true
            },
            {
                name: '🎯 Tổng Trung bình',
                value: '• Tổng 6 hoặc 15: **x15**\n• Tổng 7 hoặc 14: **x10**\n• Tổng 8 hoặc 13: **x7**',
                inline: true
            },
            {
                name: '🎯 Tổng Phổ biến',
                value: '• Tổng 9 hoặc 12: **x6**\n• Tổng 10 hoặc 11: **x5.5**',
                inline: true
            }
        );
    }

    embed.addFields({
        name: '💰 Số dư',
        value: `**${formatNumber(balance)}** DCoin`,
        inline: false
    });

    // Roll history display
    if (taixiu.formatRollHistory) {
        const history = taixiu.formatRollHistory();
        if (history && history !== 'Chưa có lịch sử') {
            embed.addFields({
                name: '📜 Lịch sử gần nhất',
                value: history
            });
        }
    }

    // Hot/Cold analysis
    if (taixiu.getHotColdDisplay) {
        const hotCold = taixiu.getHotColdDisplay();
        if (hotCold && hotCold !== 'Chưa đủ dữ liệu') {
            embed.addFields({
                name: '📊 Phân tích',
                value: hotCold
            });
        }
    }

    embed.setFooter({ text: 'Doro88 Casino • Tài Xỉu' })
        .setTimestamp();

    return embed;
}

/**
 * Create Tài Xỉu result embed
 * @param {Object} result 
 * @returns {EmbedBuilder}
 */
function createDiceResultEmbed(result) {
    const taixiu = require('../../games/casino/taixiu');

    // Display 3 dice
    const diceDisplay = `${getDiceEmoji(result.die1)} ${getDiceEmoji(result.die2)} ${getDiceEmoji(result.die3)}`;

    // Triple indicator with special effect
    let tripleText = '';
    if (result.isTriple) {
        tripleText = `\n🎰 **BỘ BA ${result.tripleValue}!**`;
        if (result.specialEffect) {
            tripleText += `\n${result.specialEffect}`;
        }
    }

    // Win message
    const winMsgText = result.winMessage ? `\n${result.winMessage}` : '';

    // Near-miss
    const nearMissText = result.nearMiss && result.nearMissMessage ? `\n${result.nearMissMessage}` : '';

    const embed = new EmbedBuilder()
        .setTitle(result.won ? '🎉 THẮNG!' : '😢 Thua!')
        .setDescription(
            `${diceDisplay}\n\n` +
            `**Tổng: ${result.total}**${tripleText}${winMsgText}${nearMissText}\n\n` +
            `${result.resultDescription}`
        )
        .setColor(result.won ? config.colors.success : config.colors.error)
        .addFields(
            {
                name: '🎯 Đặt cược',
                value: `${result.bet.name}\n**x${result.bet.multiplier}**`,
                inline: true
            },
            {
                name: '💵 Tiền cược',
                value: `**${formatNumber(result.betAmount)}** DCoin`,
                inline: true
            },
            {
                name: result.won ? '💰 Thắng' : '💸 Thua',
                value: `**${result.won ? '+' : ''}${formatNumber(result.profit)}** DCoin`,
                inline: true
            }
        );

    // Streak bonus info
    if (result.streakBonus && result.streakBonus > 0) {
        embed.addFields({
            name: '🔥 Streak Bonus',
            value: `+${formatNumber(result.streakBonus)} DCoin`,
            inline: true
        });
    }

    // Win streak info
    if (result.currentStreak && result.currentStreak > 1) {
        embed.addFields({
            name: '🏆 Win Streak',
            value: `${result.currentStreak} lần liên tiếp!`,
            inline: true
        });
    }

    // Session stats
    if (result.session) {
        const session = result.session;
        const profitEmoji = session.profit >= 0 ? '📈' : '📉';
        const profitText = session.profit >= 0 ? `+${formatNumber(session.profit)}` : formatNumber(session.profit);

        let sessionText = `${profitEmoji} ${profitText}`;
        sessionText += ` | Win: ${session.winRate}%`;
        sessionText += ` | Rolls: ${session.totalRolls}`;
        if (session.tripleCount > 0) {
            sessionText += ` | 🎰 Triples: ${session.tripleCount}`;
        }

        embed.addFields({
            name: '📊 Phiên chơi',
            value: sessionText,
            inline: false
        });
    }

    // Roll history display
    if (taixiu.formatRollHistory) {
        const history = taixiu.formatRollHistory();
        if (history && history !== 'Chưa có lịch sử') {
            embed.addFields({
                name: '📜 Lịch sử',
                value: history,
                inline: false
            });
        }
    }

    // Add XP info if available
    if (result.xpGained > 0) {
        let xpText = `+${result.xpGained} XP`;
        if (result.levelUp) {
            xpText += ` 🎉 **LEVEL UP! → Lv.${result.newLevel}**`;
        }
        embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: false });
    }

    embed.setFooter({ text: 'Doro88 Casino • Tài Xỉu' })
        .setTimestamp();

    return embed;
}

/**
 * Create mini games menu embed
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createMiniGamesMenuEmbed(balance) {
    const embed = new EmbedBuilder()
        .setTitle('🎮 MINI GAMES')
        .setDescription(
            '**Chào mừng đến khu Mini Games!**\n' +
            'Chọn một trò chơi bên dưới để bắt đầu!\n\n' +
            '🟦 **TRÒ CHƠI TRÍ TUỆ (Miễn phí):**'
        )
        .setColor(config.colors.primary)
        .addFields(
            { name: '🎯 Đoán số', value: 'Đoán số 1-100\n**Miễn phí** - Thưởng 100-500 💰', inline: true },
            { name: '🃏 Cao thấp', value: 'Streak nhân tiền\n**Miễn phí** - x1.5/lượt', inline: true },
            { name: '⚡ Toán nhanh', value: '10 câu toán\n**Miễn phí** - Thưởng 100-500 💰', inline: true }
        )
        .addFields(
            { name: '\u200B', value: '🟩 **TRÒ CHƠI MAY RỦI:**', inline: false },
            { name: '🎁 Túi mù', value: 'Mở hộp bí ẩn\nGiá: 500-2000 💰', inline: true },
            { name: '🪙 Tung xu', value: 'Chọn mặt: x2\nGiá: Tự chọn 💰', inline: true },
            { name: '🎫 Cào xổ số', value: '3+ ô giống = Thắng\nGiá: 25-100 💰', inline: true },
            { name: '✊ Oẳn tù tì', value: 'Đá/Kéo/Bao: x2\nGiá: Tự chọn 💰', inline: true },
            { name: '⛏️ Đào mỏ', value: 'Combo đào, khai thác\n**Cần: Cuốc**', inline: true },
            { name: '🎣 Câu cá', value: 'QTE móc câu, kéo cần\n**Cần: Cần câu**', inline: true }
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin` });

    return embed;
}

/**
 * Create Coin Flip game embed
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createCoinFlipEmbed(balance, betAmount = 50) {
    return new EmbedBuilder()
        .setTitle('🪙 TUNG XU')
        .setDescription(
            '**🎮 CÁCH CHƠI:**\n' +
            '1️⃣ Chọn mức cược (hoặc tự điền)\n' +
            '2️⃣ Chọn **Mặt ngửa** hoặc **Mặt sấp**\n' +
            '3️⃣ Đồng xu được tung lên!\n' +
            '4️⃣ Đúng = Nhân **x2** số cược!\n\n' +
            `**💰 CƯỢC HIỆN TẠI:** \`${formatNumber(betAmount)} DCoin\`\n` +
            `**🎯 THẮNG ĐƯỢC:** \`${formatNumber(betAmount * 2)} DCoin\`\n\n` +
            '**📊 TỶ LỆ:** 50/50 hên xui - không hề bịp'
        )
        .setColor(config.colors.primary)
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin` });
}

/**
 * Create Coin Flip result embed
 * @param {Object} result 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createCoinFlipResultEmbed(result, balance) {
    const resultVi = result.result === 'heads' ? 'Mặt ngửa' : 'Mặt sấp';

    return new EmbedBuilder()
        .setTitle(result.won ? '🎉 Thắng!' : '😢 Thua!')
        .setDescription(`${result.emoji} Kết quả: **${resultVi}**\n\n${result.won ? `✨ +${formatNumber(result.winnings)} DCoin` : `💸 -${formatNumber(result.betAmount)} DCoin`}`)
        .setColor(result.won ? config.colors.success : config.colors.error)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin` });
}

/**
 * Create RPS game embed
 * @param {number} balance 
 * @param {number} betAmount
 * @returns {EmbedBuilder}
 */
function createRPSEmbed(balance, betAmount = 50) {
    return new EmbedBuilder()
        .setTitle('✊ OẲN TÙ TÌ')
        .setDescription(
            '**🎮 CÁCH CHƠI:**\n' +
            '1️⃣ Chọn mức cược (hoặc tự điền)\n' +
            '2️⃣ Chọn **Đá**, **Bao** hoặc **Kéo**\n' +
            '3️⃣ Bot cũng chọn ngẫu nhiên\n' +
            '4️⃣ Kết quả theo luật truyền thống!\n\n' +
            `**💰 CƯỢC HIỆN TẠI:** \`${formatNumber(betAmount)} DCoin\`\n` +
            `**🎯 THẮNG:** \`x2\` | **HÒA:** Hoàn tiền\n\n` +
            '**📋 QUY TẮC:**'
        )
        .setColor(config.colors.primary)
        .addFields(
            { name: '🪨 Đá', value: '**Thắng Kéo** ✂️\nThua Bao 📄', inline: true },
            { name: '📄 Bao', value: '**Thắng Đá** 🪨\nThua Kéo ✂️', inline: true },
            { name: '✂️ Kéo', value: '**Thắng Bao** 📄\nThua Đá 🪨', inline: true }
        )
        .setFooter({ text: `💰 Số dư: ${formatNumber(balance)} DCoin` });
}

/**
 * Create RPS result embed
 * @param {Object} result 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createRPSResultEmbed(result, balance) {
    const NAMES_VI = { rock: 'Đá', paper: 'Bao', scissors: 'Kéo' };

    let title, description, color;

    switch (result.result) {
        case 'win':
            title = '🎉 Thắng!';
            description = `${result.playerEmoji} vs ${result.botEmoji}\n**${NAMES_VI[result.playerChoice]}** vs **${NAMES_VI[result.botChoice]}**\n\n✨ +${formatNumber(result.winnings)} DCoin`;
            color = config.colors.success;
            break;
        case 'draw':
            title = '🤝 Hòa!';
            description = `${result.playerEmoji} vs ${result.botEmoji}\n**${NAMES_VI[result.playerChoice]}** vs **${NAMES_VI[result.botChoice]}**\n\n💰 Hoàn lại ${formatNumber(result.winnings)} DCoin`;
            color = config.colors.warning;
            break;
        default:
            title = '😢 Thua!';
            description = `${result.playerEmoji} vs ${result.botEmoji}\n**${NAMES_VI[result.playerChoice]}** vs **${NAMES_VI[result.botChoice]}**\n\n💸 -${formatNumber(result.betAmount)} DCoin`;
            color = config.colors.error;
    }

    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin` });
}

// Helper functions
function getCardDisplay(number) {
    const cards = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return cards[number] || number.toString();
}

function getDiceEmoji(value) {
    const emojis = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    return emojis[value] || '🎲';
}

function getRarityEmoji(rarity) {
    const emojis = {
        'COMMON': '⚪',
        'UNCOMMON': '🟢',
        'RARE': '🔵',
        'EPIC': '🟣',
        'LEGENDARY': '🟡'
    };
    return emojis[rarity] || '📦';
}

/**
 * Create Mining menu embed
 * @param {Object} miningInfo 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createMiningEmbed(miningInfo, balance) {
    const embed = new EmbedBuilder()
        .setTitle('⛏️ Đào Mỏ')
        .setColor(config.colors.primary);

    if (!miningInfo.hasPickaxe) {
        embed.setDescription(
            '❌ **Bạn chưa có cuốc!**\n\n' +
            '**📖 CÁCH CHƠI:**\n' +
            '1️⃣ Mua **cuốc** tại 🏪 Cửa hàng\n' +
            '2️⃣ Quay lại đây và nhấn **Đào**\n' +
            '3️⃣ Quặng đào được sẽ vào **Kho đồ**\n' +
            '4️⃣ Bán quặng tại 🏪 Shop để lấy DCoin\n\n' +
            '💡 *Cuốc tốt hơn = Tỉ lệ quặng hiếm cao hơn!*'
        );
    } else {
        const pickaxe = miningInfo.pickaxe;
        embed.setDescription(
            `**⛏️ Sẵn sàng đào mỏ!**\n` +
            `Dùng **${pickaxe.name}** để đào quặng quý giá.\n\n` +
            `**📖 HƯỚNG DẪN:**\n` +
            `• Nhấn **Đào** để bắt đầu\n` +
            `• Quặng vào **Kho đồ** → Bán tại **Shop**\n` +
            `• Cuốc tốt = Quặng hiếm hơn + Giá trị cao hơn!`
        );
        embed.addFields(
            { name: '🔧 Cuốc hiện tại', value: `${getRarityEmoji(pickaxe.rarity)} ${pickaxe.name}`, inline: true },
            { name: '📈 Bonus tỉ lệ', value: `+${Math.round(pickaxe.bonus.bonusRarity * 100)}%`, inline: true },
            { name: '💰 Số dư', value: `${formatNumber(balance)} DCoin`, inline: true }
        );
        embed.addFields({
            name: '💎 Các loại quặng (theo độ hiếm)',
            value: '⚪ Than đá, Đồng | 🟢 Sắt, Bạc | 🔵 Vàng, Hồng ngọc\n🟣 Ngọc lục bảo, Kim cương | 🟡 Mythril, Adamantite',
            inline: false
        });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` });
    return embed;
}

/**
 * Create Mining result embed
 * @param {Object} result 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createMiningResultEmbed(result, balance) {
    const ore = result.ore;
    const embed = new EmbedBuilder()
        .setTitle('⛏️ Kết quả đào mỏ')
        .setColor(config.colors.success);

    // Check if we got DCoin directly (fallback when item not in DB)
    if (result.dcoinReward && result.dcoinReward > 0) {
        embed.setDescription(`Bạn đã đào được:\n\n${getRarityEmoji(ore.rarity)} **${ore.name}** x${result.quantity}\n\n💰 **+${formatNumber(result.dcoinReward)} DCoin** (đã quy đổi)`);
    } else {
        embed.setDescription(`Bạn đã đào được:\n\n${getRarityEmoji(ore.rarity)} **${ore.name}** x${result.quantity}`);
    }

    embed.addFields(
        { name: '💎 Độ hiếm', value: ore.rarity, inline: true },
        { name: '💰 Giá trị', value: `${formatNumber(ore.baseValue * result.quantity)} DCoin`, inline: true },
        { name: '🔧 Cuốc', value: result.pickaxe.name, inline: true }
    );

    if (result.xpGained > 0) {
        embed.addFields({ name: '✨ XP nhận được', value: `+${result.xpGained}`, inline: true });
    }
    if (result.levelUp) {
        embed.addFields({ name: '🎉 Lên cấp!', value: `Level ${result.newLevel}`, inline: true });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin | Bán quặng tại Cửa hàng` });
    return embed;
}

/**
 * Create Fishing menu embed
 * @param {Object} fishingInfo 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createFishingEmbed(fishingInfo, balance) {
    const embed = new EmbedBuilder()
        .setTitle('🎣 Câu Cá')
        .setColor(config.colors.primary);

    if (!fishingInfo.hasRod) {
        embed.setDescription(
            '❌ **Bạn chưa có cần câu!**\n\n' +
            '**📖 CÁCH CHƠI:**\n' +
            '1️⃣ Mua **cần câu** tại 🏪 Cửa hàng\n' +
            '2️⃣ Quay lại đây và nhấn **Câu**\n' +
            '3️⃣ Cá câu được sẽ vào **Kho đồ**\n' +
            '4️⃣ Bán cá tại 🏪 Shop để lấy DCoin\n\n' +
            '💡 *Cần câu tốt hơn = Tỉ lệ cá hiếm cao hơn!*'
        );
    } else {
        const rod = fishingInfo.rod;
        embed.setDescription(
            `**🎣 Sẵn sàng câu cá!**\n` +
            `Dùng **${rod.name}** để câu những con cá quý hiếm.\n\n` +
            `**📖 HƯỚNG DẪN:**\n` +
            `• Nhấn **Câu** để thả câu\n` +
            `• Cá vào **Kho đồ** → Bán tại **Shop**\n` +
            `• Cần câu tốt = Cá hiếm hơn + Giá trị cao hơn!`
        );
        embed.addFields(
            { name: '🎣 Cần câu hiện tại', value: `${getRarityEmoji(rod.rarity)} ${rod.name}`, inline: true },
            { name: '📈 Bonus tỉ lệ', value: `+${Math.round(rod.bonus.bonusRarity * 100)}%`, inline: true },
            { name: '💰 Số dư', value: `${formatNumber(balance)} DCoin`, inline: true }
        );
        embed.addFields({
            name: '🐟 Các loại cá (theo độ hiếm)',
            value: '⚪ Cá nhỏ, Cá mòi | 🟢 Cá thu, Cá hồi | 🔵 Cá ngừ, Cá kiếm\n🟣 Bạch tuộc, Cá vàng | 🟡 Rồng biển, Kraken con',
            inline: false
        });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` });
    return embed;
}

/**
 * Create Fishing result embed
 * @param {Object} result 
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createFishingResultEmbed(result, balance) {
    const catchItem = result.catch;
    const embed = new EmbedBuilder()
        .setTitle(result.isSpecial ? '🎣 Câu được vật phẩm đặc biệt!' : '🎣 Kết quả câu cá')
        .setColor(result.isSpecial ? config.colors.legendary : config.colors.success);

    // Check if we got DCoin directly (fallback when item not in DB)
    if (result.dcoinReward && result.dcoinReward > 0) {
        embed.setDescription(`Bạn đã câu được:\n\n${getRarityEmoji(catchItem.rarity)} **${catchItem.name}** x${result.quantity}\n\n💰 **+${formatNumber(result.dcoinReward)} DCoin** (đã quy đổi)`);
    } else {
        embed.setDescription(`Bạn đã câu được:\n\n${getRarityEmoji(catchItem.rarity)} **${catchItem.name}** x${result.quantity}`);
    }

    embed.addFields(
        { name: '🐟 Độ hiếm', value: catchItem.rarity, inline: true },
        { name: '💰 Giá trị', value: `${formatNumber(catchItem.baseValue * result.quantity)} DCoin`, inline: true },
        { name: '🎣 Cần câu', value: result.rod.name, inline: true }
    );

    if (result.xpGained > 0) {
        embed.addFields({ name: '✨ XP nhận được', value: `+${result.xpGained}`, inline: true });
    }
    if (result.levelUp) {
        embed.addFields({ name: '🎉 Lên cấp!', value: `Level ${result.newLevel}`, inline: true });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin | Bán cá tại Cửa hàng` });
    return embed;
}

/**
 * Create Scratch Card menu embed
 * @param {number} balance 
 * @returns {EmbedBuilder}
 */
function createScratchCardEmbed(balance) {
    const scratchCard = require('../../games/mini/scratchCard');
    const cardTypes = scratchCard.getCardTypes();

    const embed = new EmbedBuilder()
        .setTitle('🎫 CÀO XỔ SỐ')
        .setColor(config.colors.primary)
        .setDescription(
            '**📖 CÁCH CHƠI:**\n' +
            '1️⃣ Chọn loại thẻ muốn mua\n' +
            '2️⃣ Cào thẻ và xem kết quả!\n' +
            '3️⃣ Khớp **3+ ô giống nhau** = **THẮNG!**\n\n' +
            '*Không thử sao biết ta không thể*'
        );

    // Add card type info
    for (const [key, card] of Object.entries(cardTypes)) {
        const symbols = card.symbols.slice(0, 4).map(s => s.emoji).join(' ');
        embed.addFields({
            name: `${card.name} - ${formatNumber(card.cost)} DCoin`,
            value: `${card.description}\n${symbols}...`,
            inline: true
        });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(balance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    return embed;
}

/**
 * Create Scratch Card result embed
 * @param {Object} result 
 * @returns {EmbedBuilder}
 */
function createScratchCardResultEmbed(result) {
    const scratchCard = require('../../games/mini/scratchCard');
    const won = result.result.won;

    const embed = new EmbedBuilder()
        .setTitle(won ? '🎫 TRÚNG THƯỞNG!' : '🎫 CHƯA TRÚNG')
        .setColor(won ? config.colors.success : config.colors.error);

    // Display grid
    const gridDisplay = scratchCard.formatGridSimple(result.grid);
    embed.setDescription(`**${result.cardType.name}**\n\n${gridDisplay}`);

    if (won) {
        embed.addFields(
            { name: '🎯 Kết quả', value: `${result.result.symbol.emoji} **${result.result.symbol.name}** x${result.result.matchCount}`, inline: true },
            { name: '💵 Nhân số', value: `x${result.result.multiplier.toFixed(1)}`, inline: true },
            { name: '🏆 Thắng', value: `+${formatNumber(result.profit)} DCoin`, inline: true }
        );
    } else {
        embed.addFields(
            { name: '😔 Kết quả', value: 'Không khớp đủ 3 ô', inline: true },
            { name: '💸 Mất', value: `${formatNumber(result.cost)} DCoin`, inline: true }
        );
    }

    if (result.xpGained > 0) {
        embed.addFields({ name: '⭐ Kinh nghiệm', value: `+${result.xpGained} XP`, inline: true });
    }
    if (result.levelUp) {
        embed.addFields({ name: '🎉 Lên cấp!', value: `Level ${result.newLevel}`, inline: true });
    }

    embed.setFooter({ text: `Số dư: ${formatNumber(result.newBalance)} DCoin • Doro88 Bot` })
        .setTimestamp();

    return embed;
}

module.exports = {
    createLuckyNumberEmbed,
    createLuckyNumberResultEmbed,
    createHigherLowerEmbed,
    createHigherLowerResultEmbed,
    createQuickMathEmbed,
    createQuickMathResultEmbed,
    createMysteryBoxEmbed,
    createMysteryBoxResultEmbed,
    createDiceEmbed,
    createDiceResultEmbed,
    createMiniGamesMenuEmbed,
    createCoinFlipEmbed,
    createCoinFlipResultEmbed,
    createRPSEmbed,
    createRPSResultEmbed,
    createMiningEmbed,
    createMiningResultEmbed,
    createFishingEmbed,
    createFishingResultEmbed,
    createScratchCardEmbed,
    createScratchCardResultEmbed
};
