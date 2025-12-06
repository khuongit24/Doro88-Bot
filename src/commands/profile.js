const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userManager = require('../managers/userManager');
const economyManager = require('../managers/economyManager');
const { formatNumber, formatDCoin, timeAgo } = require('../utils/helpers');
const config = require('../config');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('📊 Xem thông tin profile của bạn hoặc người khác')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng muốn xem profile (để trống = bản thân)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Get target user (self or mentioned)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const discordId = targetUser.id;
            const username = targetUser.username;

            logger.info('Profile command executed', {
                by: interaction.user.id,
                target: discordId
            });

            // Get or create user
            const user = userManager.getOrCreateUser(discordId, username);
            if (!user) {
                await interaction.editReply({
                    content: '❌ Không thể tải thông tin người dùng!',
                });
                return;
            }

            // Get stats
            const stats = userManager.getUserStats(discordId);
            const rank = userManager.getUserRank(discordId);
            const transactions = economyManager.getTransactionHistory(discordId, 5);

            // Build embed
            const embed = new EmbedBuilder()
                .setTitle(`📊 Profile - ${username}`)
                .setColor(config.colors.primary)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '💰 Tài sản',
                        value: `**DCoin:** ${formatNumber(user.dcoin || 0)}\n**Tổng kiếm:** ${formatNumber(user.total_earned || 0)}\n**Đã tiêu:** ${formatNumber(user.total_spent || 0)}`,
                        inline: true
                    },
                    {
                        name: '🏆 Xếp hạng',
                        value: `**Rank:** #${rank || '???'}\n**Daily Streak:** ${user.daily_streak || 0} ngày`,
                        inline: true
                    },
                    {
                        name: '📦 Thống kê',
                        value: `**Inventory:** ${stats?.inventoryCount || 0} items\n**Gacha pulls:** ${stats?.gachaCount || 0}\n**Thư chưa đọc:** ${stats?.unreadMailCount || 0}`,
                        inline: true
                    }
                )
                .setFooter({
                    text: `Pity: 4★ ${user.pity4_counter || 0}/10 • 5★ ${user.pity5_counter || 0}/90 | ID: ${discordId}`
                })
                .setTimestamp();

            // Add recent transactions
            if (transactions && transactions.length > 0) {
                const txList = transactions.map(tx => {
                    const emoji = tx.amount >= 0 ? '📈' : '📉';
                    const sign = tx.amount >= 0 ? '+' : '';
                    return `${emoji} ${sign}${formatNumber(tx.amount)} - ${tx.description || tx.type}`;
                }).join('\n');

                embed.addFields({
                    name: '📜 Giao dịch gần đây',
                    value: txList || 'Chưa có giao dịch',
                    inline: false
                });
            }

            // Add account info
            embed.addFields({
                name: '📅 Thông tin tài khoản',
                value: `**Tạo lúc:** ${user.created_at ? timeAgo(user.created_at) : 'N/A'}\n**Cập nhật:** ${user.updated_at ? timeAgo(user.updated_at) : 'N/A'}`,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

            logger.info('Profile displayed successfully', { discordId });

        } catch (error) {
            logger.error('Profile command error', {
                error: error.message,
                stack: error.stack
            });

            try {
                await interaction.editReply({
                    content: '❌ Đã xảy ra lỗi khi tải profile!',
                });
            } catch (e) {
                // Ignore follow-up errors
            }
        }
    }
};
