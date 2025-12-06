const { EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { formatNumber } = require('../../utils/helpers');
const logger = require('../../utils/logger');

/**
 * Create mailbox embed
 * @param {Array} mails
 * @param {Object} pagination
 * @param {number} unreadCount
 * @returns {EmbedBuilder}
 */
function createMailboxEmbed(mails, pagination, unreadCount) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle('📬 Hòm thư')
        .setFooter({ text: `Trang ${pagination.currentPage}/${pagination.totalPages} • Doro88 Bot` })
        .setTimestamp();

    if (mails.length === 0) {
        embed.setDescription('*Hòm thư trống!*');
    } else {
        const mailList = mails.map((mail, index) => {
            const icon = mail.is_claimed ? '📪' : '📬';
            const status = mail.is_claimed ? '(Đã nhận)' : '**[MỚI]**';
            const reward = mail.dcoin_reward > 0 ? `+${formatNumber(mail.dcoin_reward)} DCoin` : '';
            // Show sender name for user-to-user mail
            const sender = mail.sender_type === 'USER' && mail.sender_name 
                ? `👤 ${mail.sender_name}` 
                : '';

            return `${icon} ${sender ? sender + '\n└ ' : ''}**${mail.subject}**\n└ ${status} ${reward}`;
        }).join('\n\n');

        embed.setDescription(mailList);
        embed.addFields({ name: '📊 Thống kê', value: `Chưa nhận: ${unreadCount} thư`, inline: true });
    }

    return embed;
}

/**
 * Create mail detail embed
 * @param {Object} mail
 * @returns {EmbedBuilder}
 */
function createMailDetailEmbed(mail) {
    const senderIcon = mail.sender_type === 'ADMIN' ? '👑' : mail.sender_type === 'EVENT' ? '🎉' : mail.sender_type === 'USER' ? '👤' : '🤖';
    const senderText = mail.sender_type === 'USER' && mail.sender_name 
        ? mail.sender_name 
        : mail.sender_type;

    const embed = new EmbedBuilder()
        .setColor(mail.is_claimed ? config.colors.neutral : config.colors.info)
        .setTitle(`${senderIcon} ${mail.subject}`)
        .setDescription(mail.content || '*Không có nội dung*')
        .setFooter({ text: `Từ: ${senderText} • Doro88 Bot` })
        .setTimestamp(new Date(mail.created_at));

    // Show rewards
    const rewards = [];
    if (mail.dcoin_reward > 0) {
        rewards.push(`💰 ${formatNumber(mail.dcoin_reward)} DCoin`);
    }
    if (mail.item_rewards) {
        try {
            const items = JSON.parse(mail.item_rewards);
            rewards.push(`📦 ${items.length} vật phẩm`);
        } catch (parseError) {
            // item_rewards có thể là string không hợp lệ từ dữ liệu cũ
            logger.warn('Failed to parse mail item_rewards', { 
                mailId: mail.id, 
                itemRewards: mail.item_rewards?.substring(0, 50),
                error: parseError.message 
            });
        }
    }

    if (rewards.length > 0) {
        embed.addFields({
            name: mail.is_claimed ? '✅ Đã nhận' : '🎁 Phần thưởng',
            value: rewards.join('\n')
        });
    }

    if (mail.expires_at) {
        embed.addFields({ name: '⏰ Hết hạn', value: new Date(mail.expires_at).toLocaleString('vi-VN') });
    }

    return embed;
}

/**
 * Create help embed
 * @param {string} category
 * @returns {EmbedBuilder}
 */
function createHelpEmbed(category = 'main') {
    const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setFooter({ text: 'Doro88 Bot • Dùng dropdown để xem các mục khác' })
        .setTimestamp();

    switch (category) {
        case 'start':
            embed.setTitle('🎮 HƯỚNG DẪN BẮT ĐẦU')
                .setDescription(
                    '**👋 Chào mừng người chơi mới!**\n\n' +
                    '**📋 BƯỚC 1: Mở menu chính**\n' +
                    '```\n/startplaying\n```\n' +
                    'Gõ lệnh này để mở giao diện chính của bot.\n\n' +
                    '**🖱️ BƯỚC 2: Điều hướng bằng nút bấm**\n' +
                    '• Tất cả thao tác đều qua **nút bấm**\n' +
                    '• Không cần nhớ lệnh phức tạp!\n' +
                    '• Nhấn nút để đi đến nơi bạn muốn\n\n' +
                    '**💡 BƯỚC 3: Khám phá các tính năng**\n' +
                    '• 📅 **Điểm danh** mỗi ngày để nhận DCoin miễn phí\n' +
                    '• 🎁 **Gacha** để quay vật phẩm may mắn\n' +
                    '• 🎰 **Casino** để chơi các trò cược hấp dẫn\n' +
                    '• 🎮 **Mini Games** để giải trí nhẹ nhàng\n\n' +
                    '**⌨️ LỆNH NHANH:**\n' +
                    '• `/startplaying` - Mở menu chính\n' +
                    '• `/daily` - Nhận thưởng hàng ngày\n' +
                    '• `/balance` - Xem số dư DCoin\n' +
                    '• `/help` - Mở hướng dẫn này\n' +
                    '• `/profile` - Xem thông tin cá nhân'
                );
            break;

        case 'gacha':
            embed.setTitle('🎁 HỆ THỐNG GACHA')
                .setDescription(
                    '**🎰 Gacha là gì?**\n' +
                    'Hệ thống quay thưởng ngẫu nhiên để nhận vật phẩm!\n\n' +
                    '**📖 CÁCH CHƠI:**\n' +
                    '1️⃣ Vào **🎁 Quay Gacha** từ menu chính\n' +
                    '2️⃣ Chọn **banner** bạn muốn quay\n' +
                    '3️⃣ Nhấn **Quay x1** hoặc **Quay x10**\n' +
                    '4️⃣ Vật phẩm tự động vào **📦 Kho đồ**\n\n' +
                    '**🌟 HỆ THỐNG UP:**\n' +
                    '• Mỗi banner có **1 vật phẩm UP** (giá cao nhất)\n' +
                    '• Và **7 vật phẩm thua UP** (giá thấp hơn)\n' +
                    '• Khi ra 5★ → **50/50** được UP hoặc thua UP\n' +
                    '• **Bảo hiểm**: Thua UP → Lần 5★ sau = **ĐẢM BẢO UP!**\n\n' +
                    '**💎 GIÁ TRỊ BANNER:**\n' +
                    '`Standard` → `Limited` → `Premium` → `Luxury`\n' +
                    '*Banner cao cấp = UP bán giá cao hơn!*\n\n' +
                    '**🎯 PITY:**\n' +
                    '• 10 lần không 4★ → Đảm bảo 4★\n' +
                    '• Từ lần 74 → Tỷ lệ 5★ tăng dần\n' +
                    '• Lần 90 → **Đảm bảo 5★ LEGENDARY!**'
                );
            break;

        case 'casino':
            embed.setTitle('🎰 CASINO - SÒNG BÀI')
                .setDescription(
                    '**🏛️ Chào mừng đến Casino Doro88!**\n' +
                    '*Không thử sao biết ta không thể?*\n\n' +
                    '**🃏 XÌ DÁCH (Blackjack)**\n' +
                    '• Mục tiêu: Đạt **21 điểm** hoặc gần nhất\n' +
                    '• Quá 21 = **Bust** (thua ngay)\n' +
                    '• **Rút bài**: Lấy thêm bài\n' +
                    '• **Dừng**: Giữ điểm hiện tại\n' +
                    '• **Nhân đôi**: x2 cược, chỉ rút 1 lá\n' +
                    '• **Xì dách** (A + 10/J/Q/K): Thưởng **x2.5**\n\n' +
                    '**🎲 ROULETTE (Quay số)**\n' +
                    '• Bi lăn trên vòng quay 0-36\n' +
                    '• 🔴 Đỏ / ⚫ Đen: **x2**\n' +
                    '• Chẵn / Lẻ: **x2**\n' +
                    '• Đoán đúng số: **x36**\n' +
                    '• Số 0 (xanh): Nhà cái thắng!\n\n' +
                    '**🎰 SLOTS (Máy quay)**\n' +
                    '• 3 symbol giống nhau = Thắng\n' +
                    '• Jackpot 🎰🎰🎰 = **x100**\n\n' +
                    '**🎲 TÀI XỈU (Sic Bo)**\n' +
                    '• Tung 3 xúc xắc\n' +
                    '• 🔴 Tài (11-17): **x1.95** | 🔵 Xỉu (4-10): **x1.95**\n' +
                    '• ⚠️ Bộ ba = Tài/Xỉu thua!\n' +
                    '• 🎰 Bất kỳ bộ ba: **x28** | 🎯 Đoán tổng: **x5.5-50**\n\n' +
                    '**📈 CRASH (Đoán điểm nổ)**\n' +
                    '• Chọn mục tiêu nhân số (x1.5 - x10)\n' +
                    '• Game không nổ trước mục tiêu = Thắng!\n\n' +
                    '**🎡 WHEEL (Vòng quay)**\n' +
                    '• Quay và nhận thưởng theo ô dừng\n' +
                    '• Jackpot: **x20**!'
                );
            break;

        case 'economy':
            embed.setTitle('💰 HỆ THỐNG DCOIN')
                .setDescription(
                    '**💵 DCoin là gì?**\n' +
                    'Đơn vị tiền tệ chính trong Doro88!\n\n' +
                    '**🤑 CÁCH KIẾM DCOIN:**\n\n' +
                    '📅 **Điểm danh hàng ngày**\n' +
                    '• Nhấn **Điểm danh** mỗi ngày\n' +
                    '• Điểm danh liên tục = **Streak bonus** (tới x2)!\n' +
                    '• Reset nếu quên 1 ngày\n\n' +
                    '🎰 **Thắng cược Casino/Mini Games**\n' +
                    '• Chơi khéo có thể x2, x10 số tiền!\n' +
                    '• Chú ý: Cũng có thể thua!\n\n' +
                    '💰 **Bán vật phẩm**\n' +
                    '• Vào **🏪 Cửa hàng** → **Bán đồ**\n' +
                    '• Chọn item → Chọn số lượng bán\n' +
                    '• Giá bán = 100% giá trị cơ bản\n\n' +
                    '📬 **Nhận quà từ mail**\n' +
                    '• Admin gửi quà sự kiện\n' +
                    '• Phần thưởng hệ thống\n\n' +
                    '**💸 CÁCH TIÊU DCOIN:**\n' +
                    '• 🎁 Quay Gacha\n' +
                    '• 🎰 Đặt cược Casino/Mini Games\n' +
                    '• 🏪 Mua vật phẩm tại cửa hàng\n\n' +
                    '**⚠️ LƯU Ý:**\n' +
                    '• 99% con bạc dừng lại trước khi thắng lớn!\n' +
                    '• Hết tiền? Chơi 🎫 **Cào xổ số** (chỉ 25 DCoin để làm lại cuộc đời)'
                );
            break;

        case 'inventory':
            embed.setTitle('📦 QUẢN LÝ KHO ĐỒ')
                .setDescription(
                    '**🗃️ Kho đồ chứa gì?**\n' +
                    '• Vật phẩm từ Gacha\n' +
                    '• Quà từ hòm thư\n' +
                    '• Dụng cụ (cuốc, cần câu...)\n' +
                    '• Vật liệu (quặng, cá...)\n\n' +
                    '**📖 CÁCH SỬ DỤNG:**\n\n' +
                    '1️⃣ **Xem kho đồ**\n' +
                    '• Nhấn **📦 Kho đồ** từ menu chính\n' +
                    '• Dùng ◀️ ▶️ để chuyển trang\n\n' +
                    '2️⃣ **Bán vật phẩm**\n' +
                    '• Vào **🏪 Cửa hàng** → **💰 Bán đồ**\n' +
                    '• Chọn item từ dropdown\n' +
                    '• Chọn số lượng muốn bán\n\n' +
'**📊 ĐỘ HIẾ M VẬT PHẨM:**\n' +
                    '🟡 **Legendary** - Cực hiếm\n' +
                    '🟣 **Epic** - Rất hiếm\n' +
                    '🔵 **Rare** - Hiếm\n' +
                    '🟢 **Uncommon** - Ít gặp\n' +
                    '⚪ **Common** - Phổ biến\n\n' +
                    '**💡 MẸO:**\n' +
                    '• Bán item được 100% giá trị cơ bản\n' +
                    '• Giữ lại dụng cụ để chơi Đào mỏ/Câu cá\n' +
                    '• Nhấn "Bán tất cả" để dọn kho nhanh'
                );
            break;

        case 'mail':
            embed.setTitle('📬 HÒM THƯ & QUÀ')
                .setDescription(
                    '**✉️ Hòm thư chứa gì?**\n' +
                    '• 👑 Quà từ Admin\n' +
                    '• 🎉 Phần thưởng sự kiện\n' +
                    '• 🤖 Thông báo hệ thống\n' +
                    '• 👤 Thư từ người chơi khác\n\n' +
                    '**📖 CÁCH NHẬN QUÀ:**\n\n' +
                    '1️⃣ **Mở hòm thư**\n' +
                    '• Nhấn **📬 Hòm thư** từ menu chính\n' +
                    '• Thư có **[MỚI]** = Chưa nhận\n\n' +
                    '2️⃣ **Nhận từng thư**\n' +
                    '• Chọn thư từ dropdown\n' +
                    '• Đọc nội dung\n' +
                    '• Nhấn nhận phần thưởng\n\n' +
                    '3️⃣ **Nhận tất cả**\n' +
                    '• Nhấn **📥 Nhận tất cả**\n' +
                    '• Nhận hết quà trong 1 click!\n\n' +
                    '**✉️ GỬI THƯ:**\n' +
                    '• Nhấn **✉️ Gửi thư**\n' +
                    '• Chọn người nhận\n' +
                    '• Viết nội dung và gửi!\n\n' +
                    '**⚠️ LƯU Ý QUAN TRỌNG:**\n' +
                    '• Một số thư có **THỜI HẠN**!\n' +
                    '• Hết hạn = Mất quà vĩnh viễn\n' +
                    '• Kiểm tra hòm thư thường xuyên!'
                );
            break;

        case 'minigames':
            embed.setTitle('🎮 MINI GAMES')
                .setDescription(
                    '**🎯 ĐOÁN SỐ (Lucky Number)**\n' +
                    '• Đoán số từ 1-100\n' +
                    '• Có 7 lượt đoán\n' +
                    '• Đoán đúng ít lượt = Thưởng nhiều!\n\n' +
                    '**🃏 CAO THẤP (Higher/Lower)**\n' +
                    '• Đoán số tiếp cao hay thấp hơn\n' +
                    '• Đúng liên tục = Streak bonus\n' +
                    '• Có thể rút tiền bất kỳ lúc nào\n\n' +
                    '**⚡ TOÁN NHẨM (Quick Math)**\n' +
                    '• 10 câu toán nhanh\n' +
                    '• 8 giây/câu\n' +
                    '• Đúng nhiều = Thưởng cao!\n\n' +
                    '**🎁 TÚI MÙ (Mystery Box)**\n' +
                    '• Mở hộp may mắn\n' +
                    '• 3 loại: Thường, Vàng, Huyền thoại\n' +
                    '• Hộp đắt = Cơ hội lớn hơn!\n\n' +
                    '**🪙 TUNG XU** - Heads/Tails x2\n' +
                    '**✊ OẲN TÙ TÌ** - Đá/Kéo/Bao x2\n' +
                    '**🎫 CÀO XỔ SỐ** - 3+ ô giống = Thắng!\n' +
                    '**⛏️ ĐÀO MỎ** - Cần cuốc để đào\n' +
                    '**🎣 CÂU CÁ** - Cần cần câu để câu'
                );
            break;

        case 'shop':
            embed.setTitle('🏪 CỬA HÀNG')
                .setDescription(
                    '**🛒 MUA ĐỒ**\n' +
                    '• Dụng cụ: Cuốc, cần câu...\n' +
                    '• Vật phẩm đặc biệt\n' +
                    '• Chọn item → Xác nhận mua\n\n' +
                    '**💰 BÁN ĐỒ**\n' +
                    '• Bán vật phẩm từ kho\n' +
                    '• Giá bán = 100% giá trị cơ bản\n\n' +
                    '**🔄 GIAO DỊCH**\n' +
                    '• Trade với người chơi khác\n' +
                    '• Tạo đề nghị giao dịch\n' +
                    '• Chờ đối phương chấp nhận'
                );
            break;

        case 'level':
            embed.setTitle('⭐ HỆ THỐNG LEVEL')
                .setDescription(
                    '**📈 CÁCH LÊN LEVEL:**\n' +
                    '• Kiếm **XP** từ các hoạt động\n' +
                    '• Đủ XP → Tự động lên level!\n\n' +
                    '**🎯 CÁCH KIẾM XP:**\n' +
                    '• 📅 Điểm danh hàng ngày\n' +
                    '• 🎰 Chơi Casino/Mini Games\n' +
                    '• 🎁 Quay Gacha\n' +
                    '• ⛏️🎣 Đào mỏ, Câu cá\n\n' +
                    '**🎁 PHẦN THƯỞNG LEVEL:**\n' +
                    '• Mỗi level có thưởng DCoin\n' +
                    '• Level cao = Uy tín cao!\n' +
                    '• Hiển thị trên bảng xếp hạng'
                );
            break;

        default:
            embed.setTitle('❓ HƯỚNG DẪN DORO88 BOT')
                .setDescription(
                    '**🎉 Chào mừng đến với Doro88!**\n' +
                    '*Bot giải trí hàng đầu với Gacha, Casino & Mini Games*\n\n' +
                    '**🚀 BẮT ĐẦU NGAY:**\n' +
                    '```\n/startplaying\n```\n\n' +
                    '**📚 CHỌN MỤC HƯỚNG DẪN:**\n' +
                    '*(Dùng dropdown bên dưới)*\n\n' +
                    '🎮 **Bắt đầu chơi** - Hướng dẫn cho người mới\n' +
                    '🎁 **Gacha** - Quay vật phẩm may mắn\n' +
                    '🎰 **Casino** - Xì dách, Roulette, Slots...\n' +
                    '🎲 **Mini Games** - Tung xu, Cào số, Đoán số...\n' +
                    '💰 **DCoin** - Cách kiếm và tiêu tiền\n' +
                    '📦 **Kho đồ** - Quản lý vật phẩm\n' +
                    '📬 **Hòm thư** - Nhận quà và thư\n' +
                    '🏪 **Cửa hàng** - Mua bán vật phẩm\n' +
                    '⭐ **Level** - Hệ thống cấp độ\n\n' +
                    '**💡 GÓP Ý & BÁO LỖI:**\n' +
                    'Nhấn nút bên dưới để gửi feedback!'
                )
                .addFields(
                    { name: '⌨️ Lệnh nhanh', value: '`/startplaying` `/daily` `/balance` `/help`', inline: true }
                );
    }

    return embed;
}

/**
 * Create daily reward embed
 * @param {number} reward
 * @param {number} streak
 * @param {number} newBalance
 * @param {Object} xpResult - Optional XP result from level manager
 * @returns {EmbedBuilder}
 */
function createDailyRewardEmbed(reward, streak, newBalance, xpResult = null) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📅 Daily Reward')
        .setDescription(`🎉 Bạn đã nhận thưởng hàng ngày!`)
        .addFields(
            { name: '💰 Nhận được', value: `${formatNumber(reward)} DCoin`, inline: true },
            { name: '🔥 Streak', value: `${streak} ngày`, inline: true },
            { name: '💳 Số dư mới', value: `${formatNumber(newBalance)} DCoin`, inline: true }
        )
        .setFooter({ text: 'Doro88 Bot • Quay lại vào ngày mai!' })
        .setTimestamp();

    if (streak >= 7) {
        embed.addFields({ name: '🎊 Bonus', value: 'Max streak! x2 reward!' });
    }

    // Add XP info if available
    if (xpResult && xpResult.success) {
        const xpGained = xpResult.newXP - xpResult.oldXP;
        let xpText = `+${xpGained} XP`;
        if (xpResult.leveledUp) {
            xpText += ` 🎉 **LEVEL UP! → Lv.${xpResult.newLevel}**`;
        }
        embed.addFields({ name: '⭐ Kinh nghiệm', value: xpText, inline: false });
    }

    return embed;
}

module.exports = {
    createMailboxEmbed,
    createMailDetailEmbed,
    createHelpEmbed,
    createDailyRewardEmbed
};
