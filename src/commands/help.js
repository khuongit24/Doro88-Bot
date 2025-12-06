const { SlashCommandBuilder } = require('discord.js');
const { createHelpEmbed } = require('../ui/embeds/secondaryEmbeds');
const { createHelpButtons } = require('../ui/buttons/navigationButtons');
const { createHelpSelectMenu } = require('../ui/menus/selectMenus');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem hướng dẫn sử dụng bot'),

    async execute(interaction) {
        const embed = createHelpEmbed('main');
        const selectMenu = createHelpSelectMenu();
        const buttons = createHelpButtons();

        await interaction.reply({
            embeds: [embed],
            components: [selectMenu, ...buttons]
        });
    }
};
