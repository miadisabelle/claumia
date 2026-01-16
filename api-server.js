#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import * as storageManager from './storageManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
const SESSIONS_DIR = path.join(CLAUDE_DIR, 'sessions');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', claudeDir: CLAUDE_DIR });
});

// Get settings
app.get('/api/settings', (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      res.json({
        success: true,
        data: settings
      });
    } else {
      res.json({
        success: true,
        data: {}
      });
    }
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update settings
app.post('/api/settings', (req, res) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(req.body, null, 2), 'utf8');
    res.json({
      success: true,
      data: req.body
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List projects
app.get('/api/projects', (req, res) => {
  try {
    if (!fs.existsSync(PROJECTS_DIR)) {
      res.json([]);
      return;
    }

    const projects = fs.readdirSync(PROJECTS_DIR)
      .filter(name => {
        const stat = fs.statSync(path.join(PROJECTS_DIR, name));
        return stat.isDirectory();
      })
      .map(dirName => {
        try {
          const decodedPath = Buffer.from(dirName, 'hex').toString('utf8');
          const projectPath = path.join(PROJECTS_DIR, dirName);
          const created_at = fs.statSync(projectPath).birthtimeMs;

          return {
            id: dirName,
            path: decodedPath,
            created_at: Math.floor(created_at / 1000),
            sessions: []
          };
        } catch (e) {
          return null;
        }
      })
      .filter(p => p !== null);

    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// List running sessions
app.get('/api/sessions/running', (req, res) => {
  try {
    // No running sessions in this simple implementation
    res.json([]);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Claude version
app.get('/api/claude/version', (req, res) => {
  try {
    try {
      const output = execSync('claude --version', { encoding: 'utf8' });
      res.json({
        is_installed: true,
        version: output.trim(),
        output: output
      });
    } catch (e) {
      res.json({
        is_installed: false,
        output: e.message
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get installation info
app.get('/api/claude/installation', (req, res) => {
  try {
    try {
      const version = execSync('claude --version', { encoding: 'utf8' });
      res.json({
        installed: true,
        version: version.trim()
      });
    } catch (e) {
      res.json({
        installed: false,
        error: e.message
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List agents
app.get('/api/agents', (req, res) => {
  try {
    const agents = storageManager.loadAgents();
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent
app.post('/api/agents', (req, res) => {
  try {
    const agent = storageManager.saveAgent(req.body);
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  try {
    const agent = storageManager.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent
app.put('/api/agents/:id', (req, res) => {
  try {
    const agent = storageManager.updateAgent(req.params.id, req.body);
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete agent
app.delete('/api/agents/:id', (req, res) => {
  try {
    storageManager.deleteAgent(req.params.id);
    res.json({
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List slash commands
app.get('/api/slash-commands', (req, res) => {
  try {
    const commands = storageManager.loadCommands();
    res.json({
      success: true,
      data: commands
    });
  } catch (error) {
    console.error('Error listing slash commands:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create slash command
app.post('/api/slash-commands', (req, res) => {
  try {
    const command = storageManager.saveCommand(req.body);
    res.json({
      success: true,
      data: command
    });
  } catch (error) {
    console.error('Error creating slash command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get command by ID
app.get('/api/slash-commands/:id', (req, res) => {
  try {
    const command = storageManager.getCommand(req.params.id);
    if (!command) {
      return res.status(404).json({ success: false, error: 'Command not found' });
    }
    res.json({
      success: true,
      data: command
    });
  } catch (error) {
    console.error('Error getting slash command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update command
app.put('/api/slash-commands/:id', (req, res) => {
  try {
    const command = storageManager.updateCommand(req.params.id, req.body);
    res.json({
      success: true,
      data: command
    });
  } catch (error) {
    console.error('Error updating slash command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete command
app.delete('/api/slash-commands/:id', (req, res) => {
  try {
    storageManager.deleteCommand(req.params.id);
    res.json({
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Error deleting slash command:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claude settings
app.get('/api/settings/claude', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        model: 'haiku',
        provider: 'anthropic'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/claude', (req, res) => {
  try {
    res.json({
      success: true,
      data: req.body
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Claude binary path
app.get('/api/settings/claude/binary-path', (req, res) => {
  try {
    const binaryPath = '/usr/local/bin/claude';
    res.json({
      success: true,
      data: { path: binaryPath }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/claude/binary-path', (req, res) => {
  try {
    res.json({
      success: true,
      data: { path: req.body.path }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List Claude installations
app.get('/api/settings/claude/installations', (req, res) => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 'default',
          name: 'Default Claude Installation',
          path: '/usr/local/bin/claude',
          version: 'latest'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Storage endpoints
app.get('/api/storage/tables', (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/storage/tables/:tableName', (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/storage/tables/:tableName/rows', (req, res) => {
  try {
    res.json({
      success: true,
      data: { id: Math.random().toString(36).substring(7) }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/storage/tables/:tableName/rows/:id', (req, res) => {
  try {
    res.json({
      success: true,
      data: req.body
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/storage/tables/:tableName/rows/:id', (req, res) => {
  try {
    res.json({
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System prompt
app.get('/api/settings/system-prompt', (req, res) => {
  try {
    res.json({
      success: true,
      data: { prompt: '' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/settings/system-prompt', (req, res) => {
  try {
    res.json({
      success: true,
      data: { prompt: req.body.prompt }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generic catch-all for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Initialize storage before starting server
try {
  storageManager.initialize();
} catch (error) {
  console.error('Failed to initialize storage:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Claudia API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Claude directory: ${CLAUDE_DIR}`);
  console.log(`🚀 Ready to serve frontend on http://localhost:1420`);
});
