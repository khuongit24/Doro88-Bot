const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const userManager = require('../../managers/userManager');
const economyManager = require('../../managers/economyManager');
const inventoryManager = require('../../managers/inventoryManager');
const mailboxManager = require('../../managers/mailboxManager');
const itemManager = require('../../managers/itemManager');
const config = require('../../config');
const { createSuccessEmbed, createErrorEmbed } = require('../../ui/embeds/coreEmbeds');
const { formatNumber } = require('../../utils/helpers');
const { TRANSACTION_TYPES, SENDER_TYPES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Các lệnh admin')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('gift')
                .setDescription('Tặng DCoin cho user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User nhận quà')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số DCoin')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setbalance')
                .setDescription('Đặt số dư cho user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Số DCoin')
                        .setRequired(true)
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sendmail')
                .setDescription('Gửi thư cho user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User nhận')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('subject')
                        .setDescription('Tiêu đề')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Nội dung'))
                .addIntegerOption(option =>
                    option.setName('dcoin')
                        .setDescription('DCoin đính kèm')
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('broadcast')
                .setDescription('Gửi thư cho tất cả users')
                .addStringOption(option =>
                    option.setName('subject')
                        .setDescription('Tiêu đề')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('Nội dung'))
                .addIntegerOption(option =>
                    option.setName('dcoin')
                        .setDescription('DCoin đính kèm')
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Cấm user sử dụng bot')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User cần cấm')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Gỡ cấm user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User cần gỡ cấm')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if user is in admin list
        const adminIds = config.adminIds;
        if (!adminIds.includes(interaction.user.id)) {
            const embed = createErrorEmbed('Bạn không có quyền sử dụng lệnh này!');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'gift':
                await handleGift(interaction);
                break;
            case 'setbalance':
                await handleSetBalance(interaction);
                break;
            case 'sendmail':
                await handleSendMail(interaction);
                break;
            case 'broadcast':
                await handleBroadcast(interaction);
                break;
            case 'ban':
                await handleBan(interaction);
                break;
            case 'unban':
                await handleUnban(interaction);
                break;
        }
    }
};

async function handleGift(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Ensure user exists
    userManager.getOrCreateUser(targetUser.id, targetUser.username);

    // Add DCoin
    economyManager.addDCoin(targetUser.id, amount, TRANSACTION_TYPES.ADMIN_GIFT, `Gift từ ${interaction.user.username}`);

    const embed = createSuccessEmbed(`Đã tặng **${formatNumber(amount)} DCoin** cho **${targetUser.username}**`);
    await interaction.reply({ embeds: [embed] });
}

async function handleSetBalance(interaction) {
    const targetUser = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Ensure user exists
    userManager.getOrCreateUser(targetUser.id, targetUser.username);

    // Set balance
    economyManager.setBalance(targetUser.id, amount);

    const embed = createSuccessEmbed(`Đã đặt số dư của **${targetUser.username}** thành **${formatNumber(amount)} DCoin**`);
    await interaction.reply({ embeds: [embed] });
}

async function handleSendMail(interaction) {
    const targetUser = interaction.options.getUser('user');
    const subject = interaction.options.getString('subject');
    const content = interaction.options.getString('content') || '';
    const dcoinReward = interaction.options.getInteger('dcoin') || 0;

    // Ensure user exists
    userManager.getOrCreateUser(targetUser.id, targetUser.username);

    // Send mail
    mailboxManager.sendMail(targetUser.id, {
        sender_type: SENDER_TYPES.ADMIN,
        subject,
        content,
        dcoin_reward: dcoinReward
    });

    const embed = createSuccessEmbed(`Đã gửi thư đến **${targetUser.username}**\n📬 ${subject}${dcoinReward > 0 ? `\n💰 ${formatNumber(dcoinReward)} DCoin` : ''}`);
    await interaction.reply({ embeds: [embed] });
}

async function handleBroadcast(interaction) {
    await interaction.deferReply();

    const subject = interaction.options.getString('subject');
    const content = interaction.options.getString('content') || '';
    const dcoinReward = interaction.options.getInteger('dcoin') || 0;

    // Broadcast
    const count = mailboxManager.broadcastMail({
        sender_type: SENDER_TYPES.ADMIN,
        subject,
        content,
        dcoin_reward: dcoinReward
    });

    const embed = createSuccessEmbed(`Đã gửi thư đến **${count}** users\n📬 ${subject}${dcoinReward > 0 ? `\n💰 ${formatNumber(dcoinReward)} DCoin/người` : ''}`);
    await interaction.editReply({ embeds: [embed] });
}

async function handleBan(interaction) {
    const targetUser = interaction.options.getUser('user');

    // Ensure user exists
    userManager.getOrCreateUser(targetUser.id, targetUser.username);

    // Ban
    userManager.banUser(targetUser.id);

    const embed = createSuccessEmbed(`Đã cấm **${targetUser.username}** sử dụng bot`);
    await interaction.reply({ embeds: [embed] });
}

async function handleUnban(interaction) {
    const targetUser = interaction.options.getUser('user');

    // Unban
    if (userManager.unbanUser(targetUser.id)) {
        const embed = createSuccessEmbed(`Đã gỡ cấm **${targetUser.username}**`);
        await interaction.reply({ embeds: [embed] });
    } else {
        const embed = createErrorEmbed(`User **${targetUser.username}** không tồn tại trong hệ thống`);
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
