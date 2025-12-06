const config = require('../config');

// Store active sessions in memory
const sessions = new Map();

// ============= MEMORY OPTIMIZATION =============
const MAX_SESSIONS = 5000; // Giới hạn số session để tránh memory leak

/**
 * Session data structure
 */
class Session {
    constructor(userId, messageId, channelId) {
        this.userId = userId;
        this.messageId = messageId;
        this.channelId = channelId;
        this.currentView = 'home';
        this.viewData = {};
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    setView(view, data = {}) {
        this.currentView = view;
        this.viewData = data;
        this.updateActivity();
    }

    isExpired() {
        return Date.now() - this.lastActivity > config.session.timeout;
    }
}

/**
 * Create new session
 * @param {string} userId
 * @param {string} messageId
 * @param {string} channelId
 * @returns {Session}
 */
function createSession(userId, messageId, channelId) {
    // Remove old session if exists
    if (sessions.has(userId)) {
        sessions.delete(userId);
    }

    // Enforce size limit to prevent memory leak
    if (sessions.size >= MAX_SESSIONS) {
        // First try to cleanup expired sessions
        cleanupExpiredSessions();

        // If still at limit, force remove oldest session
        if (sessions.size >= MAX_SESSIONS) {
            const oldestKey = sessions.keys().next().value;
            sessions.delete(oldestKey);
        }
    }

    const session = new Session(userId, messageId, channelId);
    sessions.set(userId, session);

    return session;
}

/**
 * Get session by user ID
 * @param {string} userId
 * @returns {Session|null}
 */
function getSession(userId) {
    const session = sessions.get(userId);

    if (!session) return null;

    // Check if session is expired
    if (session.isExpired()) {
        sessions.delete(userId);
        return null;
    }

    return session;
}

/**
 * Update session
 * @param {string} userId
 * @param {string} view
 * @param {Object} data
 * @returns {Session|null}
 */
function updateSession(userId, view, data = {}) {
    const session = getSession(userId);
    if (!session) return null;

    session.setView(view, data);
    return session;
}

/**
 * Delete session
 * @param {string} userId
 * @returns {boolean}
 */
function deleteSession(userId) {
    return sessions.delete(userId);
}

/**
 * Check if user has active session
 * @param {string} userId
 * @returns {boolean}
 */
function hasSession(userId) {
    return getSession(userId) !== null;
}

/**
 * Validate interaction belongs to session owner
 * @param {string} userId
 * @param {string} messageId
 * @returns {boolean}
 */
function validateInteraction(userId, messageId) {
    const session = getSession(userId);
    return session && session.messageId === messageId;
}

/**
 * Cleanup expired sessions
 * @returns {number} Number of cleaned sessions
 */
function cleanupExpiredSessions() {
    let cleaned = 0;
    for (const [userId, session] of sessions) {
        if (session.isExpired()) {
            sessions.delete(userId);
            cleaned++;
        }
    }
    return cleaned;
}

/**
 * Get all active sessions count
 * @returns {number}
 */
function getActiveSessionCount() {
    cleanupExpiredSessions();
    return sessions.size;
}

// Cleanup expired sessions every minute
setInterval(cleanupExpiredSessions, 60000);

module.exports = {
    createSession,
    getSession,
    updateSession,
    deleteSession,
    hasSession,
    validateInteraction,
    cleanupExpiredSessions,
    getActiveSessionCount
};
