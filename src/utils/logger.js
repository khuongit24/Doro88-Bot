/**
 * Performance-Optimized Logger
 * 
 * Improvements:
 * 1. Async file writing with buffering (non-blocking)
 * 2. Batch writes to reduce I/O operations
 * 3. Write stream caching to avoid reopening files
 * 4. Graceful shutdown handling
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Current log level (can be changed via environment variable)
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

// Log directory
const logDir = path.join(process.cwd(), 'logs');

// ============ ASYNC BUFFERED LOGGING ============

// Buffer configuration
const LOG_BUFFER_SIZE = 50;       // Max messages before flush
const LOG_FLUSH_INTERVAL = 2000;  // Flush every 2 seconds
const logBuffer = [];
let flushTimeout = null;
let currentWriteStream = null;
let currentStreamDate = null;
let logDirCreated = false;

/**
 * Ensure log directory exists (cached check)
 */
function ensureLogDir() {
    if (!logDirCreated) {
        try {
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            logDirCreated = true;
        } catch (e) {
            // Silently fail
        }
    }
}

/**
 * Get current timestamp
 * @returns {string}
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Get log file path for today
 * @returns {string}
 */
function getLogFilePath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(logDir, `${date}.log`);
}

/**
 * Get or create write stream for current date
 * @returns {fs.WriteStream|null}
 */
function getWriteStream() {
    const today = new Date().toISOString().split('T')[0];
    
    // If stream exists and is for today, reuse it
    if (currentWriteStream && currentStreamDate === today) {
        return currentWriteStream;
    }
    
    // Close old stream if exists
    if (currentWriteStream) {
        currentWriteStream.end();
    }
    
    try {
        ensureLogDir();
        currentWriteStream = fs.createWriteStream(getLogFilePath(), { flags: 'a' });
        currentStreamDate = today;
        
        currentWriteStream.on('error', () => {
            currentWriteStream = null;
        });
        
        return currentWriteStream;
    } catch (e) {
        return null;
    }
}

/**
 * Flush log buffer to file (async)
 */
function flushBuffer() {
    if (logBuffer.length === 0) return;
    
    const stream = getWriteStream();
    if (!stream) {
        logBuffer.length = 0; // Clear buffer if can't write
        return;
    }
    
    // Write all buffered messages at once
    const data = logBuffer.join('\n') + '\n';
    logBuffer.length = 0; // Clear buffer
    
    stream.write(data);
}

/**
 * Schedule buffer flush
 */
function scheduleFlush() {
    if (flushTimeout) return;
    
    flushTimeout = setTimeout(() => {
        flushTimeout = null;
        flushBuffer();
    }, LOG_FLUSH_INTERVAL);
}

/**
 * Add message to buffer (async write)
 * @param {string} message 
 */
function writeToFile(message) {
    logBuffer.push(message);
    
    // Flush immediately if buffer is full
    if (logBuffer.length >= LOG_BUFFER_SIZE) {
        flushBuffer();
    } else {
        scheduleFlush();
    }
}

/**
 * Graceful shutdown - flush remaining logs
 */
function shutdown() {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }
    flushBuffer();
    if (currentWriteStream) {
        currentWriteStream.end();
        currentWriteStream = null;
    }
}

// Register shutdown handlers
process.on('exit', shutdown);
process.on('SIGINT', () => { shutdown(); process.exit(0); });
process.on('SIGTERM', () => { shutdown(); process.exit(0); });

/**
 * Format log message
 * @param {string} level 
 * @param {string} message 
 * @param {Object} meta 
 * @returns {string}
 */
function formatMessage(level, message, meta = {}) {
    const timestamp = getTimestamp();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

/**
 * Get color for log level
 * @param {string} level 
 * @returns {string}
 */
function getLevelColor(level) {
    switch (level) {
        case 'DEBUG': return colors.gray;
        case 'INFO': return colors.green;
        case 'WARN': return colors.yellow;
        case 'ERROR': return colors.red;
        default: return colors.reset;
    }
}

/**
 * Log a message
 * @param {string} level 
 * @param {string} message 
 * @param {Object} meta 
 */
function log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < currentLevel) return;

    const formattedMessage = formatMessage(level, message, meta);
    const coloredMessage = `${getLevelColor(level)}${formattedMessage}${colors.reset}`;

    // Console output
    if (level === 'ERROR') {
        console.error(coloredMessage);
    } else if (level === 'WARN') {
        console.warn(coloredMessage);
    } else {
        console.log(coloredMessage);
    }

    // File output
    writeToFile(formattedMessage);
}

/**
 * Debug log
 */
function debug(message, meta = {}) {
    log('DEBUG', message, meta);
}

/**
 * Info log
 */
function info(message, meta = {}) {
    log('INFO', message, meta);
}

/**
 * Warning log
 */
function warn(message, meta = {}) {
    log('WARN', message, meta);
}

/**
 * Error log
 */
function error(message, meta = {}) {
    log('ERROR', message, meta);
}

module.exports = {
    debug,
    info,
    warn,
    error,
    LOG_LEVELS
};
