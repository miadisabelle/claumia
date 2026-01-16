/**
 * Storage Manager - Persistence Layer for Agents and Slash Commands
 * Handles file-based storage with atomic operations and error recovery
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const AGENTS_FILE = path.join(CLAUDE_DIR, 'agents.json');
const COMMANDS_FILE = path.join(CLAUDE_DIR, 'commands.json');

/**
 * Generate unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Get current ISO timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Ensure directory and file exist, create if needed
 */
function ensureFileExists(filePath, defaultData = []) {
  try {
    if (!fs.existsSync(CLAUDE_DIR)) {
      fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
    }
  } catch (error) {
    console.error(`Error ensuring file exists at ${filePath}:`, error);
    throw error;
  }
}

/**
 * Safe read JSON file
 */
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Atomic write JSON file (write to temp, then rename)
 */
function writeJsonFile(filePath, data) {
  try {
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Initialize storage (create files if they don't exist)
 */
export function initialize() {
  try {
    ensureFileExists(AGENTS_FILE, []);
    ensureFileExists(COMMANDS_FILE, []);
    console.log('✅ Storage manager initialized');
  } catch (error) {
    console.error('❌ Failed to initialize storage:', error);
    throw error;
  }
}

// ============== AGENTS OPERATIONS ==============

/**
 * Load all agents from file
 */
export function loadAgents() {
  try {
    return readJsonFile(AGENTS_FILE);
  } catch (error) {
    console.error('Error loading agents:', error);
    return [];
  }
}

/**
 * Get single agent by ID
 */
export function getAgent(id) {
  try {
    const agents = loadAgents();
    return agents.find(agent => agent.id === id) || null;
  } catch (error) {
    console.error(`Error getting agent ${id}:`, error);
    return null;
  }
}

/**
 * Save new agent
 */
export function saveAgent(agentData) {
  try {
    const agents = loadAgents();
    const agent = {
      id: agentData.id || generateId(),
      name: agentData.name || 'New Agent',
      systemPrompt: agentData.systemPrompt || '',
      model: agentData.model || 'claude-opus',
      createdAt: agentData.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    agents.push(agent);
    writeJsonFile(AGENTS_FILE, agents);
    return agent;
  } catch (error) {
    console.error('Error saving agent:', error);
    throw error;
  }
}

/**
 * Update existing agent
 */
export function updateAgent(id, agentData) {
  try {
    const agents = loadAgents();
    const index = agents.findIndex(agent => agent.id === id);
    if (index === -1) {
      throw new Error(`Agent ${id} not found`);
    }

    const updated = {
      ...agents[index],
      ...agentData,
      id: agents[index].id, // Preserve original ID
      createdAt: agents[index].createdAt, // Preserve original creation time
      updatedAt: getCurrentTimestamp()
    };

    agents[index] = updated;
    writeJsonFile(AGENTS_FILE, agents);
    return updated;
  } catch (error) {
    console.error(`Error updating agent ${id}:`, error);
    throw error;
  }
}

/**
 * Delete agent by ID
 */
export function deleteAgent(id) {
  try {
    const agents = loadAgents();
    const filtered = agents.filter(agent => agent.id !== id);
    if (filtered.length === agents.length) {
      throw new Error(`Agent ${id} not found`);
    }
    writeJsonFile(AGENTS_FILE, filtered);
    return true;
  } catch (error) {
    console.error(`Error deleting agent ${id}:`, error);
    throw error;
  }
}

// ============== COMMANDS OPERATIONS ==============

/**
 * Load all commands from file
 */
export function loadCommands() {
  try {
    return readJsonFile(COMMANDS_FILE);
  } catch (error) {
    console.error('Error loading commands:', error);
    return [];
  }
}

/**
 * Get single command by ID
 */
export function getCommand(id) {
  try {
    const commands = loadCommands();
    return commands.find(cmd => cmd.id === id) || null;
  } catch (error) {
    console.error(`Error getting command ${id}:`, error);
    return null;
  }
}

/**
 * Save new command
 */
export function saveCommand(commandData) {
  try {
    const commands = loadCommands();
    const command = {
      id: commandData.id || generateId(),
      name: commandData.name || 'new-command',
      description: commandData.description || '',
      script: commandData.script || '',
      createdAt: commandData.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };
    commands.push(command);
    writeJsonFile(COMMANDS_FILE, commands);
    return command;
  } catch (error) {
    console.error('Error saving command:', error);
    throw error;
  }
}

/**
 * Update existing command
 */
export function updateCommand(id, commandData) {
  try {
    const commands = loadCommands();
    const index = commands.findIndex(cmd => cmd.id === id);
    if (index === -1) {
      throw new Error(`Command ${id} not found`);
    }

    const updated = {
      ...commands[index],
      ...commandData,
      id: commands[index].id, // Preserve original ID
      createdAt: commands[index].createdAt, // Preserve original creation time
      updatedAt: getCurrentTimestamp()
    };

    commands[index] = updated;
    writeJsonFile(COMMANDS_FILE, commands);
    return updated;
  } catch (error) {
    console.error(`Error updating command ${id}:`, error);
    throw error;
  }
}

/**
 * Delete command by ID
 */
export function deleteCommand(id) {
  try {
    const commands = loadCommands();
    const filtered = commands.filter(cmd => cmd.id !== id);
    if (filtered.length === commands.length) {
      throw new Error(`Command ${id} not found`);
    }
    writeJsonFile(COMMANDS_FILE, filtered);
    return true;
  } catch (error) {
    console.error(`Error deleting command ${id}:`, error);
    throw error;
  }
}

export default {
  initialize,
  loadAgents,
  getAgent,
  saveAgent,
  updateAgent,
  deleteAgent,
  loadCommands,
  getCommand,
  saveCommand,
  updateCommand,
  deleteCommand
};
