const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userManager = require('../managers/userManager');
const economyManager = require('../managers/economyManager');
const config = require('../config');
const { formatNumber } = require('../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Xem số dư DCoin'),

    async execute(interaction) {
        const discordId = interaction.user.id;
        const username = interaction.user.username;

        // Get or create user
        const user = userManager.getOrCreateUser(discordId, username);
        const rank = userManager.getUserRank(discordId);

        const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('💰 Số dư DCoin')
            .setDescription(`**${username}**`)
            .addFields(
                { name: '💰 Số dư', value: `\`${formatNumber(user.dcoin)} DCoin\``, inline: true },
                { name: '🏆 Xếp hạng', value: `#${rank}`, inline: true }
            )
            .setFooter({ text: 'Dùng /startplaying để chơi game!' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
