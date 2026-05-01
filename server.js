const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const si = require('systeminformation');

const app = express();
const PORT = 5050;
const API_KEY = process.env.DASHBOARD_KEY || 'SECRET';
const ALLOWED_ROOT = os.homedir();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth Middleware ───────────────────────────────────────────────
function requireKey(req, res, next) {
  const key = req.query.key || req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid API key' });
  }
  next();
}

// ─── Path Validation ───────────────────────────────────────────────
function validatePath(inputPath) {
  if (typeof inputPath !== 'string') return null;
  // Resolve to absolute, stripping traversal attempts
  const resolved = path.resolve(inputPath);
  // Must stay within ALLOWED_ROOT
  if (!resolved.startsWith(ALLOWED_ROOT)) return null;
  // No null bytes
  if (resolved.includes('\0')) return null;
  return resolved;
}

// ─── File System Explorer ──────────────────────────────────────────
app.get('/files', requireKey, (req, res) => {
  const safePath = validatePath(req.query.path || ALLOWED_ROOT);
  if (!safePath) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  fs.readdir(safePath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const result = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'dir' : 'file',
      path: path.join(safePath, entry.name)
    }));

    res.json({
      current: safePath,
      parent: safePath !== ALLOWED_ROOT ? path.dirname(safePath) : null,
      entries: result
    });
  });
});

// ─── System Status ─────────────────────────────────────────────────
app.get('/status', requireKey, async (req, res) => {
  try {
    const [cpu, mem, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.time()
    ]);

    res.json({
      cpu: parseFloat(cpu.currentLoad.toFixed(1)),
      ram: parseFloat(((mem.used / mem.total) * 100).toFixed(1)),
      ramUsed: formatBytes(mem.used),
      ramTotal: formatBytes(mem.total),
      uptime: formatUptime(time.uptime),
      root: ALLOWED_ROOT
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatBytes(bytes) {
  const gb = bytes / 1024 / 1024 / 1024;
  return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / 1024 / 1024).toFixed(0)}MB`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

// ─── Action System ─────────────────────────────────────────────────
const ALLOWED_ACTIONS = ['deploy', 'install', 'pm2_start', 'pm2_restart', 'pm2_stop', 'logs', 'npm_start', 'npm_dev'];

const COMMANDS = {
  deploy:      'git pull',
  install:     'npm install',
  pm2_start:   'pm2 start index.js',
  pm2_restart: 'pm2 restart all',
  pm2_stop:    'pm2 stop all',
  logs:        'pm2 logs --lines 50 --nostream',
  npm_start:   'npm start',
  npm_dev:     'npm run dev'
};

app.post('/action', requireKey, (req, res) => {
  const { action, path: targetPath } = req.body;

  // Validate action
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  // Validate path
  const safePath = validatePath(targetPath);
  if (!safePath) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  // Check path exists and ensure it is a directory for exec
  if (!fs.existsSync(safePath)) {
    return res.status(400).json({ error: 'Path does not exist' });
  }

  const stats = fs.statSync(safePath);
  const execCwd = stats.isDirectory() ? safePath : path.dirname(safePath);

  const cmd = COMMANDS[action];

  // Execute in the safe directory, never injecting user input into cmd
  exec(cmd, { cwd: execCwd, timeout: 60000, maxBuffer: 1024 * 1024 * 2 }, (err, stdout, stderr) => {
    const output = [stdout, stderr].filter(Boolean).join('\n');
    res.json({
      action,
      path: safePath,
      exitCode: err ? (err.code || 1) : 0,
      output: output || '(no output)'
    });
  });
});

// ─── File Editor ──────────────────────────────────────────────────
app.get('/file-content', requireKey, (req, res) => {
  const safePath = validatePath(req.query.path);
  if (!safePath) return res.status(400).json({ error: 'Invalid path' });

  fs.readFile(safePath, 'utf8', (err, content) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ content });
  });
});

app.post('/file-save', requireKey, (req, res) => {
  const { path: targetPath, content } = req.body;
  const safePath = validatePath(targetPath);
  if (!safePath) return res.status(400).json({ error: 'Invalid path' });

  fs.writeFile(safePath, content, 'utf8', (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const http = require('http');
const WebSocket = require('ws');
const pty = require('node-pty');

// ─── Serve frontend ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/pty' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const key = url.searchParams.get('key');
  
  if (key !== API_KEY) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const requestedPath = url.searchParams.get('path');
  let cwd = validatePath(requestedPath) || ALLOWED_ROOT;
  
  // Ensure cwd is a directory
  if (fs.existsSync(cwd) && !fs.statSync(cwd).isDirectory()) {
    cwd = path.dirname(cwd);
  }

  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: parseInt(url.searchParams.get('cols') || '80', 10),
    rows: parseInt(url.searchParams.get('rows') || '24', 10),
    cwd: cwd,
    env: process.env
  });

  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  ws.on('message', (msg) => {
    ptyProcess.write(msg.toString());
  });

  ws.on('close', () => {
    ptyProcess.kill();
  });
});

server.listen(PORT, () => {
  console.log(`VPS Dashboard running on http://localhost:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
  console.log(`Allowed root: ${ALLOWED_ROOT}`);
});
