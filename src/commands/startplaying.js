const { SlashCommandBuilder } = require('discord.js');
const userManager = require('../managers/userManager');
const sessionManager = require('../managers/sessionManager');
const { createHomeEmbed } = require('../ui/embeds/coreEmbeds');
const { createMainNavButtons } = require('../ui/buttons/navigationButtons');
const { isToday, timeUntilMidnight } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startplaying')
        .setDescription('Mở trang chủ game Doro88'),

    async execute(interaction) {
        const discordId = interaction.user.id;
        const username = interaction.user.username;

        // Check if user is banned
        if (userManager.isUserBanned(discordId)) {
            return interaction.reply({
                content: '❌ Bạn đã bị cấm sử dụng bot. Liên hệ admin nếu có thắc mắc.',
                ephemeral: true
            });
        }

        // Get or create user
        const user = userManager.getOrCreateUser(discordId, username);
        const stats = userManager.getUserStats(discordId);

        // Check if user has already checked in today - ensure boolean primitive
        const hasCheckedInToday = !!(user.last_daily_claim && isToday(user.last_daily_claim));
        const timeUntilReset = hasCheckedInToday ? timeUntilMidnight() : '';

        // Create home embed
        const embed = createHomeEmbed(user, stats, { hasCheckedInToday, timeUntilReset });
        const buttons = createMainNavButtons({ hasCheckedInToday, timeUntilReset });

        // Send message with a direct mention to help users find their embed
        const message = await interaction.reply({
            content: `<@${discordId}>`,
            embeds: [embed],
            components: buttons,
            fetchReply: true
        });

        // Create session
        sessionManager.createSession(discordId, message.id, interaction.channelId);
    }
};
