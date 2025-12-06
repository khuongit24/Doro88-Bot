const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const userManager = require('../managers/userManager');
const economyManager = require('../managers/economyManager');
const config = require('../config');
const { formatNumber } = require('../utils/helpers');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Gửi DCoin cho người chơi khác')
        .addUserOption(option =>
            option.setName('người_nhận')
                .setDescription('Người bạn muốn gửi tiền')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('số_tiền')
                .setDescription('Số DCoin muốn gửi (tối thiểu 10)')
                .setRequired(true)
                .setMinValue(10)),

    async execute(interaction) {
        const senderId = interaction.user.id;
        const senderName = interaction.user.username;
        const recipient = interaction.options.getUser('người_nhận');
        const amount = interaction.options.getInteger('số_tiền');

        // Kiểm tra không tự gửi cho mình
        if (recipient.id === senderId) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Không thể gửi')
                .setDescription('Bạn không thể gửi DCoin cho chính mình!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Kiểm tra không gửi cho bot
        if (recipient.bot) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Không thể gửi')
                .setDescription('Bạn không thể gửi DCoin cho bot!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Kiểm tra số tiền tối thiểu
        if (amount < 10) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Số tiền quá nhỏ')
                .setDescription('Số tiền gửi tối thiểu là **10 DCoin**!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Lấy thông tin người gửi
        const sender = userManager.getOrCreateUser(senderId, senderName);
        if (!sender) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Lỗi')
                .setDescription('Không thể tìm thấy thông tin tài khoản của bạn!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Kiểm tra số dư
        if (!economyManager.canAfford(senderId, amount)) {
            const balance = economyManager.getBalance(senderId);
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Không đủ tiền')
                .setDescription(`Bạn không đủ DCoin để gửi!\n\n💰 **Số dư hiện tại:** ${formatNumber(balance)} DCoin\n💸 **Số tiền cần gửi:** ${formatNumber(amount)} DCoin`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Lấy hoặc tạo tài khoản cho người nhận
        const recipientUser = userManager.getOrCreateUser(recipient.id, recipient.username);
        if (!recipientUser) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Lỗi')
                .setDescription('Không thể tạo tài khoản cho người nhận!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Thực hiện chuyển tiền
        const success = economyManager.transferDCoin(senderId, recipient.id, amount);

        if (!success) {
            const errorEmbed = new EmbedBuilder()
                .setColor(config.colors.error)
                .setTitle('❌ Giao dịch thất bại')
                .setDescription('Đã xảy ra lỗi khi chuyển tiền. Vui lòng thử lại!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Lấy số dư mới
        const newSenderBalance = economyManager.getBalance(senderId);
        const newRecipientBalance = economyManager.getBalance(recipient.id);

        // Ghi log
        logger.info('DCoin transferred via /give command', {
            from: senderId,
            fromName: senderName,
            to: recipient.id,
            toName: recipient.username,
            amount
        });

        // Tạo embed thành công
        const successEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle('✅ Gửi tiền thành công!')
            .setDescription(`Bạn đã gửi **${formatNumber(amount)} DCoin** cho **${recipient.username}**`)
            .addFields(
                { name: '👤 Người gửi', value: `${senderName}`, inline: true },
                { name: '👤 Người nhận', value: `${recipient.username}`, inline: true },
                { name: '💸 Số tiền', value: `${formatNumber(amount)} DCoin`, inline: true },
                { name: '💰 Số dư của bạn', value: `${formatNumber(newSenderBalance)} DCoin`, inline: true },
                { name: '💰 Số dư người nhận', value: `${formatNumber(newRecipientBalance)} DCoin`, inline: true }
            )
            .setFooter({ text: `ID giao dịch: ${Date.now()}` })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });
    }
};
