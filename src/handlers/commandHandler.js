const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Load all commands into client.commands collection
 * @param {Client} client
 */
function loadCommands(client) {
    client.commands = new Collection();

    const commandsPath = path.join(__dirname, '../commands');
    loadCommandsFromDirectory(client, commandsPath);

    logger.info(`Loaded ${client.commands.size} commands`);
}

/**
 * Recursively load commands from directory
 * @param {Client} client
 * @param {string} dirPath
 */
function loadCommandsFromDirectory(client, dirPath) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            loadCommandsFromDirectory(client, filePath);
        } else if (file.endsWith('.js')) {
            try {
                const command = require(filePath);

                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logger.debug(`Loaded command: ${command.data.name}`);
                } else {
                    logger.warn(`Command missing data/execute: ${filePath}`);
                }
            } catch (error) {
                logger.error(`Error loading command: ${filePath}`, { error: error.message });
            }
        }
    }
}

/**
 * Handle command interactions
 * @param {Interaction} interaction
 */
async function handleCommand(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
        logger.info(`Command executed: ${interaction.commandName}`, {
            user: interaction.user.id,
            guild: interaction.guildId
        });
    } catch (error) {
        logger.error(`Command error: ${interaction.commandName}`, {
            error: error.message,
            stack: error.stack
        });

        const errorMessage = '❌ Đã xảy ra lỗi khi thực hiện lệnh!';

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

module.exports = { loadCommands, handleCommand };
