const { get, all, run } = require('../database/connection');
const userManager = require('./userManager');
const inventoryManager = require('./inventoryManager');
const economyManager = require('./economyManager');
const { paginate } = require('../utils/helpers');
const { SENDER_TYPES, TRANSACTION_TYPES } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Get user mailbox
 * @param {string} discordId
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
function getMailbox(discordId, page = 1, perPage = 10) {
    const user = userManager.getUser(discordId);
    if (!user) return { mails: [], pagination: paginate(0, 1, perPage) };

    const countResult = get(`
        SELECT COUNT(*) as total FROM mailbox WHERE user_id = ?
    `, [user.id]);

    const pagination = paginate(countResult?.total || 0, page, perPage);

    const mails = all(`
        SELECT * FROM mailbox
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `, [user.id, pagination.perPage, pagination.offset]);

    return { mails, pagination };
}

/**
 * Get unread mail count
 * @param {string} discordId
 * @returns {number}
 */
function getUnreadCount(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return 0;

    const result = get(`
        SELECT COUNT(*) as total FROM mailbox WHERE user_id = ? AND is_claimed = 0
    `, [user.id]);

    return result?.total || 0;
}

/**
 * Get mail by ID
 * @param {number} mailId
 * @returns {Object|null}
 */
function getMailById(mailId) {
    return get('SELECT * FROM mailbox WHERE id = ?', [mailId]);
}

/**
 * Send mail to user
 * @param {string} discordId
 * @param {Object} mailData
 * @returns {Object|null}
 */
function sendMail(discordId, mailData) {
    const user = userManager.getUser(discordId);
    if (!user) return null;

    try {
        const result = run(`
            INSERT INTO mailbox (user_id, sender_type, subject, content, dcoin_reward, item_rewards, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id,
            mailData.sender_type || SENDER_TYPES.SYSTEM,
            mailData.subject,
            mailData.content || null,
            mailData.dcoin_reward || 0,
            mailData.item_rewards ? JSON.stringify(mailData.item_rewards) : null,
            mailData.expires_at || null
        ]);

        logger.info('Sent mail', { discordId, subject: mailData.subject });
        return getMailById(result.lastInsertRowid);
    } catch (error) {
        logger.error('sendMail error', { discordId, error: error.message });
        return null;
    }
}

/**
 * Send mail to all users
 * @param {Object} mailData
 * @returns {number} Number of mails sent
 */
function broadcastMail(mailData) {
    const users = all('SELECT id FROM users WHERE is_banned = 0');
    let count = 0;

    for (const user of users) {
        try {
            run(`
                INSERT INTO mailbox (user_id, sender_type, subject, content, dcoin_reward, item_rewards, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id,
                mailData.sender_type || SENDER_TYPES.ADMIN,
                mailData.subject,
                mailData.content || null,
                mailData.dcoin_reward || 0,
                mailData.item_rewards ? JSON.stringify(mailData.item_rewards) : null,
                mailData.expires_at || null
            ]);
            count++;
        } catch (error) {
            logger.error('broadcastMail failed for user', { userId: user.id, error: error.message });
        }
    }

    logger.info('Broadcast mail sent', { count, subject: mailData.subject });
    return count;
}

/**
 * Mark mail as read
 * @param {number} mailId
 * @returns {boolean}
 */
function markAsRead(mailId) {
    try {
        const result = run(`
            UPDATE mailbox SET is_read = 1 WHERE id = ?
        `, [mailId]);
        return result.changes > 0;
    } catch (error) {
        logger.error('markAsRead error', { mailId, error: error.message });
        return false;
    }
}

/**
 * Claim mail rewards
 * @param {string} discordId
 * @param {number} mailId
 * @returns {Object|null}
 */
function claimMail(discordId, mailId) {
    const mail = getMailById(mailId);
    const user = userManager.getUser(discordId);

    if (!mail || !user || mail.user_id !== user.id) return null;
    if (mail.is_claimed) return null;

    // Check expiry
    if (mail.expires_at && new Date(mail.expires_at) < new Date()) {
        return null;
    }

    try {
        // Add DCoin reward
        if (mail.dcoin_reward > 0) {
            economyManager.addDCoin(discordId, mail.dcoin_reward, TRANSACTION_TYPES.ADMIN_GIFT, `Mail: ${mail.subject}`);
        }

        // Add item rewards
        let itemsReceived = [];
        if (mail.item_rewards) {
            const items = JSON.parse(mail.item_rewards);
            for (const item of items) {
                inventoryManager.addItem(discordId, item.item_id, item.quantity);
                itemsReceived.push(item);
            }
        }

        // Mark as claimed
        run(`
            UPDATE mailbox SET is_claimed = 1, is_read = 1 WHERE id = ?
        `, [mailId]);

        logger.info('Mail claimed', { discordId, mailId });
        return {
            dcoin: mail.dcoin_reward,
            items: itemsReceived
        };
    } catch (error) {
        logger.error('claimMail error', { discordId, mailId, error: error.message });
        return null;
    }
}

/**
 * Claim all unclaimed mails
 * @param {string} discordId
 * @returns {Object}
 */
function claimAllMails(discordId) {
    const user = userManager.getUser(discordId);
    if (!user) return { dcoin: 0, items: [] };

    const mails = all(`
        SELECT * FROM mailbox
        WHERE user_id = ? AND is_claimed = 0
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [user.id]);

    let totalDcoin = 0;
    let allItems = [];

    for (const mail of mails) {
        const result = claimMail(discordId, mail.id);
        if (result) {
            totalDcoin += result.dcoin;
            allItems = allItems.concat(result.items);
        }
    }

    return { dcoin: totalDcoin, items: allItems };
}

/**
 * Delete mail
 * @param {number} mailId
 * @returns {boolean}
 */
function deleteMail(mailId) {
    try {
        const result = run('DELETE FROM mailbox WHERE id = ?', [mailId]);
        return result.changes > 0;
    } catch (error) {
        logger.error('deleteMail error', { mailId, error: error.message });
        return false;
    }
}

/**
 * Delete expired mails
 * @returns {number}
 */
function deleteExpiredMails() {
    try {
        const result = run(`
            DELETE FROM mailbox WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
        `);
        return result.changes;
    } catch (error) {
        logger.error('deleteExpiredMails error', { error: error.message });
        return 0;
    }
}

/**
 * Send mail from one user to another (with DCoin/item transfer)
 * @param {string} senderDiscordId - Sender's Discord ID
 * @param {string} recipientIdentifier - Recipient's Discord ID or username
 * @param {Object} mailData - Mail content
 * @param {string} mailData.subject - Mail subject
 * @param {string} mailData.content - Mail content/message
 * @param {number} mailData.dcoin - DCoin to send (optional)
 * @param {Array} mailData.items - Items to send [{item_id, quantity}] (optional)
 * @returns {Object} Result object
 */
function sendMailToUser(senderDiscordId, recipientIdentifier, mailData) {
    const sender = userManager.getUser(senderDiscordId);
    if (!sender) {
        return { error: 'sender_not_found' };
    }

    // Find recipient by Discord ID or username
    let recipient = userManager.getUser(recipientIdentifier);
    if (!recipient) {
        // Try finding by username
        recipient = userManager.getUserByUsername(recipientIdentifier);
    }
    if (!recipient) {
        return { error: 'recipient_not_found' };
    }

    // Can't send to self
    if (sender.id === recipient.id) {
        return { error: 'cannot_send_to_self' };
    }

    const dcoinToSend = mailData.dcoin || 0;
    const itemsToSend = mailData.items || [];

    // Validate DCoin transfer
    if (dcoinToSend > 0) {
        if (dcoinToSend < 1) {
            return { error: 'invalid_dcoin_amount' };
        }
        if (!economyManager.canAfford(senderDiscordId, dcoinToSend)) {
            return { error: 'insufficient_balance' };
        }
    }

    // Validate items transfer
    for (const item of itemsToSend) {
        const owned = inventoryManager.getItemQuantity(senderDiscordId, item.item_id);
        if (owned < item.quantity) {
            return { error: 'insufficient_items', item_id: item.item_id };
        }
    }

    try {
        // Deduct DCoin from sender
        if (dcoinToSend > 0) {
            economyManager.deductDCoin(senderDiscordId, dcoinToSend, TRANSACTION_TYPES.TRANSFER_OUT, `Gửi thư cho ${recipient.username}`);
        }

        // Deduct items from sender
        for (const item of itemsToSend) {
            inventoryManager.removeItem(senderDiscordId, item.item_id, item.quantity);
        }

        // Create the mail
        const result = run(`
            INSERT INTO mailbox (user_id, sender_type, sender_name, subject, content, dcoin_reward, item_rewards, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            recipient.id,
            SENDER_TYPES.USER,
            sender.username,
            mailData.subject || `Thư từ ${sender.username}`,
            mailData.content || null,
            dcoinToSend,
            itemsToSend.length > 0 ? JSON.stringify(itemsToSend) : null,
            null // No expiry for user mails
        ]);

        logger.info('User sent mail', {
            senderId: senderDiscordId,
            recipientId: recipient.discord_id,
            dcoin: dcoinToSend,
            items: itemsToSend.length
        });

        return {
            success: true,
            mailId: result.lastInsertRowid,
            recipient: recipient.username,
            dcoin: dcoinToSend,
            items: itemsToSend
        };
    } catch (error) {
        logger.error('sendMailToUser error', { 
            senderDiscordId, 
            recipientIdentifier, 
            error: error.message 
        });
        return { error: 'send_failed' };
    }
}

module.exports = {
    getMailbox,
    getUnreadCount,
    getMailById,
    sendMail,
    sendMailToUser,
    broadcastMail,
    markAsRead,
    claimMail,
    claimAllMails,
    deleteMail,
    deleteExpiredMails
};
