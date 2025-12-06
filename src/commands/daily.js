const { SlashCommandBuilder } = require('discord.js');
const userManager = require('../managers/userManager');
const economyManager = require('../managers/economyManager');
const levelManager = require('../managers/levelManager');
const config = require('../config');
const { createDailyRewardEmbed } = require('../ui/embeds/secondaryEmbeds');
const { createErrorEmbed } = require('../ui/embeds/coreEmbeds');
const { isToday, timeUntilMidnight } = require('../utils/helpers');
const { TRANSACTION_TYPES } = require('../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận thưởng hàng ngày'),

    async execute(interaction) {
        const discordId = interaction.user.id;
        const username = interaction.user.username;

        // Check if user is banned
        if (userManager.isUserBanned(discordId)) {
            return interaction.reply({
                content: '❌ Bạn đã bị cấm sử dụng bot.',
                ephemeral: true
            });
        }

        // Get or create user
        const user = userManager.getOrCreateUser(discordId, username);

        // Check if already claimed today
        if (user.last_daily_claim && isToday(user.last_daily_claim)) {
            const timeLeft = timeUntilMidnight();
            const embed = createErrorEmbed(`Bạn đã nhận thưởng hôm nay rồi!\nQuay lại sau: **${timeLeft}**`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Calculate reward
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
        // ENTERTAINMENT MODE v3.0: Max streak multiplier 2x - rewarding hơn cho streak dài
        const baseReward = config.economy.dailyReward;
        const streakBonus = config.economy.dailyStreakBonus * (newStreak - 1);
        const finalReward = newStreak >= config.economy.maxDailyStreak
            ? Math.floor((baseReward + streakBonus) * 2.0)  // 2x bonus cho max streak!
            : baseReward + streakBonus;

        // Add reward
        economyManager.addDCoin(discordId, finalReward, TRANSACTION_TYPES.EARN, `Daily reward (streak ${newStreak})`);

        // Award XP for daily claim with streak bonus
        const xpResult = levelManager.awardXP(discordId, 'DAILY_CLAIM', { streak: newStreak });

        // Update user
        userManager.updateUser(discordId, {
            daily_streak: newStreak,
            last_daily_claim: new Date().toISOString()
        });

        // Get new balance
        const newBalance = economyManager.getBalance(discordId);

        // Create response
        const embed = createDailyRewardEmbed(finalReward, newStreak, newBalance, xpResult);

        await interaction.reply({ embeds: [embed] });
    }
};
