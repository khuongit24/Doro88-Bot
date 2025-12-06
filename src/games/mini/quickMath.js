const economyManager = require('../../managers/economyManager');
const levelManager = require('../../managers/levelManager');
const { TRANSACTION_TYPES } = require('../../utils/constants');
const { randomInt } = require('../../utils/helpers');
const logger = require('../../utils/logger');

// Store active games
const activeGames = new Map();

// Store timeout callbacks for auto-timeout
const gameTimeouts = new Map();

// Store warning timeouts (fires 3 seconds before timeout)
const warningTimeouts = new Map();
const WARNING_BEFORE_MS = 3000; // Warning 3 seconds before timeout

// Cooldowns
const cooldowns = new Map();
const COOLDOWN_MS = 30000; // 30 seconds - cân bằng với reward cao hơn

// Game settings
const TIME_LIMIT_MS = 10000; // 10 seconds per question - thoải mái hơn
const TIMEOUT_BUFFER_MS = 500; // Extra buffer for Discord latency

// Reward settings - ENTERTAINMENT MODE v3.0
// Mục tiêu: Max ~150 DCoin/session (10 câu hoàn hảo) - vui hơn!
const BASE_REWARD = 8;      // Tăng từ 3 - mỗi câu đúng rewarding hơn
const STREAK_BONUS = 3;     // Tăng từ 1 - streak có giá trị hơn

/**
 * V2 Difficulty settings
 */
const DIFFICULTY_SETTINGS = {
    easy: {
        name: 'Dễ',
        emoji: '🟢',
        operations: ['+', '-'],
        numRange: { min: 5, max: 50 },
        timeLimit: 12000,
        rewardMultiplier: 1.0,
        description: 'Chỉ cộng trừ, số nhỏ'
    },
    medium: {
        name: 'Trung bình',
        emoji: '🟡',
        operations: ['+', '-', '×'],
        numRange: { min: 10, max: 99 },
        timeLimit: 10000,
        rewardMultiplier: 1.3,
        description: 'Có nhân, số vừa'
    },
    hard: {
        name: 'Khó',
        emoji: '🔴',
        operations: ['+', '-', '×', '÷'],
        numRange: { min: 20, max: 150 },
        timeLimit: 8000,
        rewardMultiplier: 1.8,
        description: 'Cả bốn phép, số lớn'
    }
};

/**
 * V2 Powerup types
 */
const POWERUPS = {
    skip: {
        name: 'Bỏ qua',
        emoji: '⏭️',
        description: 'Bỏ qua câu hỏi này (không mất streak)'
    },
    fiftyFifty: {
        name: '50/50',
        emoji: '🎯',
        description: 'Loại bỏ 2 đáp án sai'
    },
    extraTime: {
        name: 'Thêm giờ',
        emoji: '⏰',
        description: 'Thêm 5 giây cho câu hỏi này'
    }
};

/**
 * Generate a math problem
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Object}
 */
function generateProblem(difficulty = 'medium') {
    const settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
    const operations = settings.operations;
    const operation = operations[randomInt(0, operations.length - 1)];
    const { min, max } = settings.numRange;

    let a, b, answer;

    switch (operation) {
        case '+':
            a = randomInt(min, max);
            b = randomInt(min, max);
            answer = a + b;
            break;
        case '-':
            a = randomInt(min + 20, max);
            b = randomInt(min, a - 1);
            answer = a - b;
            break;
        case '×':
            // For multiplication, keep numbers reasonable
            a = randomInt(2, Math.min(12, Math.floor(max / 10)));
            b = randomInt(2, Math.min(12, Math.floor(max / 10)));
            answer = a * b;
            break;
        case '÷':
            // For division, ensure clean result
            b = randomInt(2, 12);
            answer = randomInt(2, 15);
            a = b * answer; // a / b = answer
            break;
        default:
            a = randomInt(min, max);
            b = randomInt(min, max);
            answer = a + b;
    }

    // Generate wrong answers
    const wrongAnswers = new Set();
    while (wrongAnswers.size < 3) {
        const offset = randomInt(-20, 20);
        if (offset !== 0) {
            const wrong = answer + offset;
            if (wrong > 0 && wrong !== answer) {
                wrongAnswers.add(wrong);
            }
        }
    }

    // Shuffle answers
    const allAnswers = [answer, ...wrongAnswers];
    for (let i = allAnswers.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }

    return {
        question: `${a} ${operation} ${b} = ?`,
        correctAnswer: answer,
        options: allAnswers,
        correctIndex: allAnswers.indexOf(answer),
        operation,
        difficulty
    };
}

/**
 * Create new Quick Math game
 * @param {string} discordId 
 * @param {Function} onTimeout - Callback when question times out (for auto-timeout)
 * @param {string} difficulty - 'easy', 'medium', or 'hard' (V2 feature)
 * @param {Function} onWarning - Callback when 3 seconds left (for countdown warning)
 * @returns {Object}
 */
function createGame(discordId, onTimeout = null, difficulty = 'medium', onWarning = null) {
    // Check cooldown
    const lastPlayed = cooldowns.get(discordId);
    if (lastPlayed && Date.now() - lastPlayed < COOLDOWN_MS) {
        const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastPlayed)) / 1000);
        return { error: 'cooldown', remaining };
    }

    // Cancel any existing game/timeout
    cancelGame(discordId);

    // Get difficulty settings
    const difficultySettings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.medium;
    const problem = generateProblem(difficulty);

    const game = {
        discordId,
        currentProblem: problem,
        questionNumber: 1,
        totalQuestions: 10,
        correctAnswers: 0,
        streak: 0,
        maxStreak: 0,
        totalReward: 0,
        problemStartTime: Date.now(),
        timeLimit: difficultySettings.timeLimit,
        status: 'playing',
        startTime: Date.now(),
        onTimeout, // Store callback for auto-timeout
        onWarning, // Store callback for warning (3s before timeout)
        // V2 Features
        difficulty,
        difficultySettings,
        powerups: {
            skip: 1,        // Can skip 1 question
            fiftyFifty: 1,  // Can use 50/50 once
            extraTime: 1    // Can add time once
        },
        bonusTimeActive: false
    };

    activeGames.set(discordId, game);

    // Set up auto-timeout for first question
    if (onTimeout) {
        setQuestionTimeout(discordId, game);
    }

    logger.info('Quick Math game started', { discordId, difficulty });

    return game;
}

/**
 * Set timeout for current question
 * When time runs out, auto-submit as timeout
 * Also sets a warning timer 3 seconds before timeout
 * @param {string} discordId 
 * @param {Object} game 
 */
function setQuestionTimeout(discordId, game) {
    // Clear any existing timeout and warning
    clearQuestionTimeout(discordId);

    // Set warning timer (3 seconds before timeout)
    if (game.onWarning && game.timeLimit > WARNING_BEFORE_MS + 1000) {
        const warningTime = game.timeLimit - WARNING_BEFORE_MS;
        const warningId = setTimeout(() => {
            const currentGame = activeGames.get(discordId);
            if (currentGame && currentGame.status === 'playing' && currentGame.onWarning) {
                logger.info('Quick Math warning timer triggered', {
                    discordId,
                    questionNumber: currentGame.questionNumber,
                    secondsLeft: Math.ceil(WARNING_BEFORE_MS / 1000)
                });
                currentGame.onWarning(discordId, Math.ceil(WARNING_BEFORE_MS / 1000));
            }
        }, warningTime);
        warningTimeouts.set(discordId, warningId);
    }

    // Set new timeout with buffer for Discord latency
    const timeoutId = setTimeout(() => {
        const currentGame = activeGames.get(discordId);
        if (currentGame && currentGame.status === 'playing' && currentGame.onTimeout) {
            logger.info('Quick Math question timeout', {
                discordId,
                questionNumber: currentGame.questionNumber
            });
            // Call the timeout callback provided during game creation
            currentGame.onTimeout(discordId);
        }
    }, game.timeLimit + TIMEOUT_BUFFER_MS);

    gameTimeouts.set(discordId, timeoutId);
}

/**
 * Clear question timeout and warning
 * @param {string} discordId 
 */
function clearQuestionTimeout(discordId) {
    // Clear warning timeout
    const warningId = warningTimeouts.get(discordId);
    if (warningId) {
        clearTimeout(warningId);
        warningTimeouts.delete(discordId);
    }

    // Clear main timeout
    const timeoutId = gameTimeouts.get(discordId);
    if (timeoutId) {
        clearTimeout(timeoutId);
        gameTimeouts.delete(discordId);
    }
}

/**
 * Submit answer
 * @param {string} discordId 
 * @param {number} answerIndex 
 * @returns {Object}
 */
function submitAnswer(discordId, answerIndex) {
    // Clear any pending timeout (user answered before timeout)
    clearQuestionTimeout(discordId);

    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    const timeSpent = Date.now() - game.problemStartTime;
    const timedOut = timeSpent > game.timeLimit;

    const isCorrect = !timedOut && answerIndex === game.currentProblem.correctIndex;

    // LƯU đáp án đúng của câu HIỆN TẠI trước khi tạo câu mới
    const currentCorrectAnswer = game.currentProblem.correctAnswer;

    if (isCorrect) {
        game.correctAnswers++;
        game.streak++;
        if (game.streak > game.maxStreak) {
            game.maxStreak = game.streak;
        }

        // Rewards: base + streak bonus (balanced) with difficulty multiplier
        const diffMultiplier = game.difficultySettings?.rewardMultiplier || 1.0;
        const questionReward = Math.floor((BASE_REWARD + (game.streak * STREAK_BONUS)) * diffMultiplier);
        game.totalReward += questionReward;
    } else {
        game.streak = 0;
    }

    // Check if game is finished
    if (game.questionNumber >= game.totalQuestions) {
        game.status = 'finished';

        // Bonus for completing all questions (reduced from x1.5 to x1.25)
        if (game.correctAnswers >= 8) {
            game.totalReward = Math.floor(game.totalReward * 1.25);
        }

        // Add reward
        if (game.totalReward > 0) {
            economyManager.addDCoin(discordId, game.totalReward, TRANSACTION_TYPES.GAME_WIN,
                `Quick Math (${game.correctAnswers}/${game.totalQuestions} đúng)`);
        }

        // Award XP - bonus for perfect score
        const xpAction = game.correctAnswers === game.totalQuestions ? 'QUICK_MATH_PERFECT' : 'QUICK_MATH_PLAY';
        const xpResult = levelManager.awardXP(discordId, xpAction);

        // Clear timeout and cleanup
        clearQuestionTimeout(discordId);
        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        logger.info('Quick Math finished', {
            discordId,
            correct: game.correctAnswers,
            total: game.totalQuestions,
            reward: game.totalReward
        });

        return {
            game,
            isCorrect,
            timedOut,
            correctAnswer: currentCorrectAnswer,
            finished: true,
            finalReward: game.totalReward,
            xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0,
            levelUp: xpResult.leveledUp || false,
            newLevel: xpResult.newLevel || null
        };
    }

    // Generate next problem SAU khi đã lưu đáp án câu cũ (use same difficulty)
    game.questionNumber++;
    game.currentProblem = generateProblem(game.difficulty || 'medium');
    game.problemStartTime = Date.now();
    game.bonusTimeActive = false; // Reset bonus time for new question

    // Set up timeout for next question
    if (game.onTimeout) {
        setQuestionTimeout(discordId, game);
    }

    return {
        game,
        isCorrect,
        timedOut,
        correctAnswer: currentCorrectAnswer,  // Sử dụng đáp án đã lưu
        finished: false,
        nextProblem: game.currentProblem
    };
}

/**
 * Get active game
 * @param {string} discordId 
 * @returns {Object|null}
 */
function getGame(discordId) {
    return activeGames.get(discordId) || null;
}

/**
 * Cancel game
 * @param {string} discordId 
 */
function cancelGame(discordId) {
    clearQuestionTimeout(discordId);
    activeGames.delete(discordId);
}

/**
 * Get cooldown remaining
 * @param {string} discordId 
 * @returns {number}
 */
function getCooldown(discordId) {
    const lastPlayed = cooldowns.get(discordId);
    if (!lastPlayed) return 0;

    const remaining = COOLDOWN_MS - (Date.now() - lastPlayed);
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * V2: Use skip powerup - skip current question without losing streak
 * @param {string} discordId
 * @returns {Object}
 */
function useSkipPowerup(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (!game.powerups || game.powerups.skip <= 0) {
        return { error: 'no_powerup' };
    }

    // Use powerup
    game.powerups.skip--;

    // Clear timeout
    clearQuestionTimeout(discordId);

    // Save current answer for display
    const skippedAnswer = game.currentProblem.correctAnswer;

    // Check if game should end
    if (game.questionNumber >= game.totalQuestions) {
        // Force finish with current stats
        game.status = 'finished';

        // Bonus for completing all
        if (game.correctAnswers >= 8) {
            game.totalReward = Math.floor(game.totalReward * 1.25);
        }

        if (game.totalReward > 0) {
            economyManager.addDCoin(discordId, game.totalReward, TRANSACTION_TYPES.GAME_WIN,
                `Quick Math (${game.correctAnswers}/${game.totalQuestions} đúng)`);
        }

        const xpAction = game.correctAnswers === game.totalQuestions ? 'QUICK_MATH_PERFECT' : 'QUICK_MATH_PLAY';
        const xpResult = levelManager.awardXP(discordId, xpAction);

        cooldowns.set(discordId, Date.now());
        activeGames.delete(discordId);

        return {
            game,
            skipped: true,
            skippedAnswer,
            finished: true,
            finalReward: game.totalReward,
            xpGained: xpResult.success ? (xpResult.newXP - xpResult.oldXP) : 0
        };
    }

    // Generate next problem
    game.questionNumber++;
    game.currentProblem = generateProblem(game.difficulty);
    game.problemStartTime = Date.now();
    game.bonusTimeActive = false;

    // Set new timeout
    if (game.onTimeout) {
        setQuestionTimeout(discordId, game);
    }

    logger.info('Quick Math skip used', { discordId, skipsLeft: game.powerups.skip });

    return {
        game,
        skipped: true,
        skippedAnswer,
        finished: false,
        nextProblem: game.currentProblem,
        powerupsLeft: game.powerups
    };
}

/**
 * V2: Use 50/50 powerup - remove 2 wrong answers
 * @param {string} discordId
 * @returns {Object}
 */
function useFiftyFiftyPowerup(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (!game.powerups || game.powerups.fiftyFifty <= 0) {
        return { error: 'no_powerup' };
    }

    const problem = game.currentProblem;
    if (problem.options.length <= 2) {
        return { error: 'already_reduced' };
    }

    // Use powerup
    game.powerups.fiftyFifty--;

    // Keep correct answer and one random wrong
    const correctAnswer = problem.correctAnswer;
    const wrongAnswers = problem.options.filter(opt => opt !== correctAnswer);
    const oneWrong = wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];

    // Update options to only 2
    const newOptions = Math.random() < 0.5 ? [correctAnswer, oneWrong] : [oneWrong, correctAnswer];
    problem.options = newOptions;
    problem.correctIndex = newOptions.indexOf(correctAnswer);

    logger.info('Quick Math 50/50 used', { discordId, fiftyFiftyLeft: game.powerups.fiftyFifty });

    return {
        game,
        fiftyFiftyUsed: true,
        newOptions,
        powerupsLeft: game.powerups
    };
}

/**
 * V2: Use extra time powerup - add 5 seconds
 * @param {string} discordId
 * @returns {Object}
 */
function useExtraTimePowerup(discordId) {
    const game = activeGames.get(discordId);
    if (!game || game.status !== 'playing') {
        return { error: 'no_game' };
    }

    if (!game.powerups || game.powerups.extraTime <= 0) {
        return { error: 'no_powerup' };
    }

    // Use powerup
    game.powerups.extraTime--;

    // Add 5 seconds
    const extraTime = 5000;
    game.timeLimit += extraTime;
    game.bonusTimeActive = true;

    // Reset timeout with new time
    clearQuestionTimeout(discordId);
    if (game.onTimeout) {
        const remainingTime = (game.problemStartTime + game.timeLimit) - Date.now();
        if (remainingTime > 0) {
            const timeoutId = setTimeout(() => {
                const currentGame = activeGames.get(discordId);
                if (currentGame && currentGame.status === 'playing' && currentGame.onTimeout) {
                    currentGame.onTimeout(discordId);
                }
            }, remainingTime + TIMEOUT_BUFFER_MS);
            gameTimeouts.set(discordId, timeoutId);
        }
    }

    logger.info('Quick Math extra time used', { discordId, extraTimeLeft: game.powerups.extraTime });

    return {
        game,
        extraTimeUsed: true,
        newTimeLimit: game.timeLimit,
        powerupsLeft: game.powerups
    };
}

/**
 * V2: Get difficulty settings
 * @returns {Object}
 */
function getDifficultySettings() {
    return DIFFICULTY_SETTINGS;
}

/**
 * V2: Get powerup info
 * @returns {Object}
 */
function getPowerupInfo() {
    return POWERUPS;
}

module.exports = {
    createGame,
    submitAnswer,
    getGame,
    cancelGame,
    getCooldown,
    generateProblem,
    // V2 exports
    useSkipPowerup,
    useFiftyFiftyPowerup,
    useExtraTimePowerup,
    getDifficultySettings,
    getPowerupInfo,
    DIFFICULTY_SETTINGS,
    POWERUPS
};
