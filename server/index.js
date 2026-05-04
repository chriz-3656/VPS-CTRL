require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const si = require('systeminformation');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5050;
const DASHBOARD_KEY = process.env.DASHBOARD_KEY || process.env.DASHBOARD_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET;
const ALLOWED_ROOT = os.homedir();

// Warn if JWT_SECRET not explicitly set
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️  WARNING: JWT_SECRET not set in production! Setting to default. Please set JWT_SECRET env var.');
  process.env.JWT_SECRET = 'vps-ctrl-secret-99';
}
const FINAL_JWT_SECRET = JWT_SECRET || 'vps-ctrl-secret-99';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit for file reads

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Auth Middleware ───────────────────────────────────────────────
function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, FINAL_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// ─── Login Endpoint ────────────────────────────────────────────────
app.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  if (password === DASHBOARD_KEY) {
    const token = jwt.sign({ authorized: true }, FINAL_JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400000 // 24 hours
    });
    return res.json({ success: true });
  }

  res.status(401).json({ error: 'Invalid password' });
});

app.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

// ─── Path Validation ───────────────────────────────────────────────
function validatePath(inputPath) {
  if (typeof inputPath !== 'string') return null;
  const resolved = path.resolve(inputPath);
  if (!resolved.startsWith(ALLOWED_ROOT)) return null;
  if (resolved.includes('\0')) return null;
  return resolved;
}

// ─── File System Explorer ──────────────────────────────────────────
app.get('/files', authenticate, (req, res) => {
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

    const isNode = entries.some(e => e.name === 'package.json');

    res.json({
      current: safePath,
      parent: safePath !== ALLOWED_ROOT ? path.dirname(safePath) : null,
      entries: result,
      projectType: isNode ? 'node' : null
    });
  });
});

// ─── System Status ─────────────────────────────────────────────────
app.get('/status', authenticate, async (req, res) => {
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

// ─── Process Manager ───────────────────────────────────────────────
app.get('/processes', authenticate, async (req, res) => {
  try {
    const [proc, connections] = await Promise.all([
      si.processes(),
      si.networkConnections()
    ]);

    // Map ports to PIDs for easier lookup
    const portMap = {};
    connections.forEach(conn => {
      if (conn.state === 'LISTEN' && conn.localPort) {
        if (!portMap[conn.pid]) portMap[conn.pid] = [];
        if (!portMap[conn.pid].includes(conn.localPort)) {
          portMap[conn.pid].push(conn.localPort);
        }
      }
    });

    // Filter and sort processes (showing top 50 by CPU/RAM or relevant to node/bot)
    const list = proc.list
      .map(p => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        mem: p.mem,
        user: p.user,
        ports: portMap[p.pid] || []
      }))
      .sort((a, b) => b.cpu - a.cpu || b.mem - a.mem)
      .slice(0, 50);

    res.json({ processes: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Utilities ─────────────────────────────────────────────────────
function getCleanEnv() {
  const env = { ...process.env };
  // Remove dashboard-specific variables so child apps can use their own defaults
  delete env.PORT;
  delete env.DASHBOARD_PASSWORD;
  delete env.JWT_SECRET;
  return env;
}

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
const ALLOWED_ACTIONS = ['deploy', 'install', 'pm2_start', 'pm2_restart', 'pm2_stop', 'logs', 'npm_start', 'npm_dev', 'kill_port', 'kill_pid', 'tail_file'];

const COMMANDS = {
  deploy:      'git pull',
  install:     'npm install',
  pm2_start:   'pm2 start index.js',
  pm2_restart: 'pm2 restart all',
  pm2_stop:    'pm2 stop all',
  logs:        'pm2 logs --lines 50 --nostream',
  npm_start:   'npm start',
  npm_dev:     'npm run dev',
  kill_port:   'fuser -k',
  kill_pid:    'kill -9',
  tail_file:   'tail -n 50'
};

app.post('/action', authenticate, (req, res) => {
  const { action, path: targetPath, port, pid } = req.body;

  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  const safePath = validatePath(targetPath);
  if (!safePath) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  if (!fs.existsSync(safePath)) {
    return res.status(400).json({ error: 'Path does not exist' });
  }

  // Validate port if kill_port action
  if (action === 'kill_port') {
    if (!port) return res.status(400).json({ error: 'Port required for kill_port' });
    const portNum = parseInt(port, 10);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({ error: 'Invalid port number (1-65535)' });
    }
  }

  // Validate PID if kill_pid action
  if (action === 'kill_pid') {
    if (!pid) return res.status(400).json({ error: 'PID required for kill_pid' });
    const pidNum = parseInt(pid, 10);
    if (!Number.isInteger(pidNum) || pidNum < 1) {
      return res.status(400).json({ error: 'Invalid PID (must be positive integer)' });
    }
  }

  // Use stat instead of checking existence first (fixes TOCTOU)
  let execCwd;
  try {
    const stats = fs.statSync(safePath);
    execCwd = stats.isDirectory() ? safePath : path.dirname(safePath);
  } catch (err) {
    return res.status(400).json({ error: 'Cannot access path' });
  }

  let cmd = COMMANDS[action];
  if (action === 'kill_port') {
    cmd = `${cmd} ${port}/tcp`;
  } else if (action === 'kill_pid') {
    cmd = `${cmd} ${pid}`;
  } else if (action === 'tail_file') {
    // Escape filename properly to prevent command injection
    const filename = path.basename(targetPath).replace(/['"\\]/g, '');
    cmd = `${cmd} ${filename}`;
  }

  exec(cmd, { cwd: execCwd, env: getCleanEnv(), timeout: 60000, maxBuffer: 1024 * 1024 * 2 }, (err, stdout, stderr) => {
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
app.get('/file-content', authenticate, (req, res) => {
  const safePath = validatePath(req.query.path);
  if (!safePath) return res.status(400).json({ error: 'Invalid path' });

  fs.stat(safePath, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if it's a directory
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, not a file' });
    }

    // Check file size limit
    if (stats.size > MAX_FILE_SIZE) {
      return res.status(413).json({ 
        error: `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB limit)` 
      });
    }

    fs.readFile(safePath, 'utf8', (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ content });
    });
  });
});

app.post('/file-save', authenticate, (req, res) => {
  const { path: targetPath, content } = req.body;
  const safePath = validatePath(targetPath);
  if (!safePath) return res.status(400).json({ error: 'Invalid path' });

  // Verify it's a file and not a directory
  fs.stat(safePath, (err, stats) => {
    if (err && err.code !== 'ENOENT') {
      return res.status(500).json({ error: 'Cannot access path' });
    }

    if (stats && stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory, cannot write' });
    }

    fs.writeFile(safePath, content, 'utf8', (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

const http = require('http');
const WebSocket = require('ws');
const terminalSessions = require('./terminalSessions');

// ─── Serve frontend ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/pty' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  const cookies = req.headers.cookie ? Object.fromEntries(req.headers.cookie.split('; ').map(c => c.split('='))) : {};
  const token = cookies.token || url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Unauthorized: No token provided');
    return;
  }

  try {
    jwt.verify(token, FINAL_JWT_SECRET);
  } catch (err) {
    ws.close(4001, 'Unauthorized: Invalid token');
    return;
  }

  // Set up session output handler
  const sendToClient = (sessionId, output) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', sessionId, output }));
    }
  };

  // For backward compatibility, immediately create a "default" session
  const requestedPath = url.searchParams.get('path');
  const initialCwd = validatePath(requestedPath) || ALLOWED_ROOT;
  const initialCols = parseInt(url.searchParams.get('cols') || '80', 10);
  const initialRows = parseInt(url.searchParams.get('rows') || '24', 10);

  try {
    const defaultPty = terminalSessions.createSession('default', initialCwd, initialCols, initialRows);
    defaultPty.onData((data) => sendToClient('default', data));
  } catch (e) {
    console.error('Failed to create default terminal session:', e);
  }

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      
      switch (data.type) {
        case 'create':
          try {
            const safeCwd = validatePath(data.cwd) || ALLOWED_ROOT;
            const newPty = terminalSessions.createSession(data.sessionId, safeCwd, data.cols, data.rows);
            newPty.onData((output) => sendToClient(data.sessionId, output));
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', message: err.message }));
          }
          break;
          
        case 'input':
          const ptyInput = terminalSessions.getSession(data.sessionId);
          if (ptyInput) ptyInput.write(data.input);
          break;
          
        case 'kill':
          terminalSessions.killSession(data.sessionId);
          break;

        case 'resize':
          const ptyResize = terminalSessions.getSession(data.sessionId);
          if (ptyResize) ptyResize.resize(data.cols, data.rows);
          break;
      }
    } catch (e) {
      // Not JSON? Treat as raw input for default session (Backward Compatibility)
      const defaultPty = terminalSessions.getSession('default');
      if (defaultPty) defaultPty.write(msg.toString());
    }
  });

  ws.on('close', () => {
    // Kill all sessions associated with this connection to avoid orphan processes
    terminalSessions.listSessions().forEach(id => terminalSessions.killSession(id));
  });
});

server.listen(PORT, () => {
  console.log(`VPS Dashboard running on http://localhost:${PORT}`);
  console.log(`Password: ${DASHBOARD_KEY === 'admin' ? 'admin (DEFAULT - PLEASE CHANGE!)' : '********'}`);
  console.log(`Allowed root: ${ALLOWED_ROOT}`);
});
