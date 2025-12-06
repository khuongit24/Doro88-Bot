const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeConnection } = require('./database/connection');
const { runMigrations } = require('./database/migrations');
const { seedDatabase } = require('./database/seeders');
const { loadCommands, handleCommand } = require('./handlers/commandHandler');
const { handleButton } = require('./handlers/buttonHandler');
const { handleModalSubmit, handleSelectMenu } = require('./handlers/modalHandler');
const { createFeedbackModal, createBugReportModal } = require('./ui/modals/gameModals');
const { HELP_BUTTONS } = require('./utils/constants');

// Create client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Ready event
client.once(Events.ClientReady, async (c) => {
    logger.info(`Bot is ready! Logged in as ${c.user.tag}`);
    logger.info(`Serving ${c.guilds.cache.size} guilds`);

    // Initialize database (async for sql.js)
    try {
        await initDatabase();
        runMigrations();
        seedDatabase();
        logger.info('Database initialized successfully');
    } catch (error) {
        logger.error('Database initialization failed', { error: error.message });
        process.exit(1);
    }

    // Load commands
    loadCommands(client);

    // Set activity
    c.user.setActivity('/startplaying để bắt đầu', { type: 0 });
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            await handleCommand(interaction);
        }
        // Handle button clicks
        else if (interaction.isButton()) {
            // Special case for modal buttons - need to show modal before deferring
            if (interaction.customId === HELP_BUTTONS.FEEDBACK) {
                const modal = createFeedbackModal();
                await interaction.showModal(modal);
                return;
            }
            if (interaction.customId === HELP_BUTTONS.BUG_REPORT) {
                const modal = createBugReportModal();
                await interaction.showModal(modal);
                return;
            }

            await handleButton(interaction);
        }
        // Handle select menus
        else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            await handleModalSubmit(interaction);
        }
    } catch (error) {
        logger.error('Interaction error', {
            type: interaction.type,
            error: error.message,
            stack: error.stack
        });
    }
});

// Error handling
client.on(Events.Error, (error) => {
    logger.error('Client error', { error: error.message });
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection', { error: error.message });
});

process.on('SIGINT', () => {
    logger.info('Shutting down...');
    closeConnection();
    client.destroy();
    process.exit(0);
});

// Login
client.login(config.token).catch((error) => {
    logger.error('Failed to login', { error: error.message });
    process.exit(1);
});
