#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

// Generic catch-all for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Claudia API Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Claude directory: ${CLAUDE_DIR}`);
  console.log(`🚀 Ready to serve frontend on http://localhost:1420`);
});
