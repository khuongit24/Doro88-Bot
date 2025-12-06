/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format DCoin amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount with DCoin emoji
 */
function formatDCoin(amount) {
    return `💰 ${formatNumber(amount)} DCoin`;
}

/**
 * Calculate time difference in readable format
 * @param {Date|string} date - Date to compare
 * @returns {string} Readable time difference
 */
function timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return `${seconds} giây trước`;
}

/**
 * Check if two dates are the same day
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {boolean}
 */
function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

/**
 * Check if a date is today
 * @param {Date|string} date 
 * @returns {boolean}
 */
function isToday(date) {
    return isSameDay(date, new Date());
}

/**
 * Get time until midnight
 * @returns {string} Formatted time remaining
 */
function timeUntilMidnight() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const diffMs = midnight - now;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
}

/**
 * Random integer between min and max (inclusive)
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random item from array
 * @param {Array} array 
 * @returns {*}
 */
function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 * @param {Array} array 
 * @returns {Array}
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Weighted random selection
 * @param {Object} weights - Object with items as keys and weights as values
 * @returns {string} Selected key
 */
function weightedRandom(weights) {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (const [item, weight] of entries) {
        random -= weight;
        if (random <= 0) return item;
    }

    return entries[entries.length - 1][0];
}

/**
 * Truncate string with ellipsis
 * @param {string} str 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}

/**
 * Create progress bar
 * @param {number} current 
 * @param {number} max 
 * @param {number} length 
 * @returns {string}
 */
function progressBar(current, max, length = 10) {
    const percentage = Math.min(current / max, 1);
    const filled = Math.round(percentage * length);
    const empty = length - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Parse duration string to milliseconds
 * @param {string} duration - e.g., "1h", "30m", "1d"
 * @returns {number} Milliseconds
 */
function parseDuration(duration) {
    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    return parseInt(match[1]) * (units[match[2]] || 0);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms 
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 * @param {Array} array 
 * @param {number} size 
 * @returns {Array[]}
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Calculate pagination info
 * @param {number} total - Total items
 * @param {number} page - Current page (1-indexed)
 * @param {number} perPage - Items per page
 * @returns {Object}
 */
function paginate(total, page, perPage) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * perPage;

    return {
        currentPage,
        totalPages,
        offset,
        perPage,
        total,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
    };
}

module.exports = {
    formatNumber,
    formatDCoin,
    timeAgo,
    isSameDay,
    isToday,
    timeUntilMidnight,
    randomInt,
    randomChoice,
    shuffleArray,
    weightedRandom,
    truncate,
    progressBar,
    parseDuration,
    sleep,
    chunkArray,
    paginate
};
