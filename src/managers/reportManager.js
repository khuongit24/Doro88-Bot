const { getConnection } = require('../database/connection');
const { paginate } = require('../utils/helpers');
const { REPORT_TYPES } = require('../utils/constants');
const fs = require('fs');
const path = require('path');

// Data directory for JSON backups
const dataDir = path.join(process.cwd(), 'data');

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Create report
 * @param {Object} reportData
 * @returns {Object}
 */
function createReport(reportData) {
    const db = getConnection();

    const stmt = db.prepare(`
        INSERT INTO reports (discord_id, username, type, title, content)
        VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        reportData.discord_id,
        reportData.username,
        reportData.type,
        reportData.title,
        reportData.content
    );

    const report = getReportById(result.lastInsertRowid);

    // Also save to JSON file for backup
    saveReportToFile(report);

    return report;
}

/**
 * Get report by ID
 * @param {number} reportId
 * @returns {Object|null}
 */
function getReportById(reportId) {
    const db = getConnection();
    return db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
}

/**
 * Get all reports
 * @param {string} type - Optional filter by type
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
function getReports(type = null, page = 1, perPage = 20) {
    const db = getConnection();

    let countQuery = 'SELECT COUNT(*) as total FROM reports';
    let dataQuery = 'SELECT * FROM reports';
    const params = [];

    if (type) {
        countQuery += ' WHERE type = ?';
        dataQuery += ' WHERE type = ?';
        params.push(type);
    }

    const countResult = db.prepare(countQuery).get(...params);
    const pagination = paginate(countResult.total, page, perPage);

    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const reports = db.prepare(dataQuery).all(...params, pagination.perPage, pagination.offset);

    return { reports, pagination };
}

/**
 * Get feedback reports
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
function getFeedbacks(page = 1, perPage = 20) {
    return getReports(REPORT_TYPES.FEEDBACK, page, perPage);
}

/**
 * Get bug reports
 * @param {number} page
 * @param {number} perPage
 * @returns {Object}
 */
function getBugReports(page = 1, perPage = 20) {
    return getReports(REPORT_TYPES.BUG, page, perPage);
}

/**
 * Delete report
 * @param {number} reportId
 * @returns {boolean}
 */
function deleteReport(reportId) {
    const db = getConnection();
    const result = db.prepare('DELETE FROM reports WHERE id = ?').run(reportId);
    return result.changes > 0;
}

/**
 * Save report to JSON file
 * @param {Object} report
 */
function saveReportToFile(report) {
    ensureDataDir();

    const filename = report.type === REPORT_TYPES.FEEDBACK ? 'feedback.json' : 'bugs.json';
    const filepath = path.join(dataDir, filename);

    let reports = [];
    if (fs.existsSync(filepath)) {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            reports = JSON.parse(content);
        } catch (e) {
            reports = [];
        }
    }

    reports.push({
        id: report.id,
        discord_id: report.discord_id,
        username: report.username,
        title: report.title,
        content: report.content,
        created_at: report.created_at
    });

    fs.writeFileSync(filepath, JSON.stringify(reports, null, 2));
}

/**
 * Get report statistics
 * @returns {Object}
 */
function getReportStats() {
    const db = getConnection();

    const feedbackCount = db.prepare(`
        SELECT COUNT(*) as count FROM reports WHERE type = ?
    `).get(REPORT_TYPES.FEEDBACK);

    const bugCount = db.prepare(`
        SELECT COUNT(*) as count FROM reports WHERE type = ?
    `).get(REPORT_TYPES.BUG);

    return {
        feedbacks: feedbackCount?.count || 0,
        bugs: bugCount?.count || 0,
        total: (feedbackCount?.count || 0) + (bugCount?.count || 0)
    };
}

module.exports = {
    createReport,
    getReportById,
    getReports,
    getFeedbacks,
    getBugReports,
    deleteReport,
    getReportStats
};
