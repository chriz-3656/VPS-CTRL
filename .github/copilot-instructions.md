# Copilot Instructions for VPS-CTRL

## Quick Start

```bash
# Install and run
npm install
npm start

# Login with default password: admin
# Dashboard: http://localhost:5050

# With custom credentials
DASHBOARD_KEY=yourpassword JWT_SECRET=yoursecret npm start
```

## Architecture Overview

**VPS-CTRL** is a lightweight Express-based dashboard for managing VPS instances. It features a three-column layout (System Monitoring | Terminal | File Explorer) with real-time metrics, an interactive PTY terminal, and a built-in code editor.

### Core Structure

- **server/index.js** (366 lines) - Central Express server handling:
  - Authentication (JWT + httpOnly cookies)
  - REST API endpoints (`/status`, `/files`, `/action`, `/file-content`, `/file-save`)
  - WebSocket server for PTY (`/pty`)
  - All business logic is here; changes are typically surgical modifications within delimited comment blocks

- **server/terminalSessions.js** - PTY session manager:
  - Creates/manages up to 10 isolated terminal sessions via node-pty
  - Strips sensitive env vars (DASHBOARD_KEY, JWT_SECRET, etc.) from child shells
  - Maps sessionId → pty.Process for multi-tab terminal support

- **public/** - Frontend assets served statically
  - index.html (main dashboard UI with tabbed interface)
  - style.css (vanilla CSS)
  - **xterm.js** and **monaco-editor** loaded from CDN (NOT in node_modules)

### Data Flow

1. Browser → Login endpoint → JWT token stored in httpOnly cookie
2. Frontend sends authenticated requests (token in cookie or Authorization header)
3. Backend validates token via `authenticate` middleware
4. File operations validated via `validatePath()` to restrict to user's home directory
5. PTY commands: WebSocket message → terminalSessions → node-pty → pty.spawn()

### Security Model

- All file paths validated with `validatePath()` — prevents directory traversal
- Shell commands never interpolate user input; use predefined `COMMANDS` mapping
- Sensitive environment variables cleaned before spawning child processes
- JWT tokens expire in 24h; cookies have HttpOnly + SameSite flags

## Key Conventions

### Path Validation (Critical)

**Always use `validatePath()` for any file system operation.** It ensures paths stay within `ALLOWED_ROOT` (user's home directory).

```javascript
const safePath = validatePath(req.query.path || ALLOWED_ROOT);
if (!safePath) return res.status(400).json({ error: 'Invalid path' });
```

### Action System (Predefined Commands)

Never inject user input into shell commands. All actions use predefined `COMMANDS` mapping:

```javascript
const COMMANDS = {
  deploy:      'git pull',
  install:     'npm install',
  pm2_start:   'pm2 start index.js',
  pm2_restart: 'pm2 restart all',
  // ... etc
};
```

For variable parameters (port, pid, file), append them safely:

```javascript
if (action === 'kill_port') {
  cmd = `${cmd} ${port}/tcp`;  // port is numeric, safe to append
}
```

### Frontend Philosophy

Keep it **lightweight and vanilla**:
- No React, Vue, or heavy frameworks
- xterm.js and monaco-editor loaded via CDN (not npm packages)
- Plain HTML, CSS, and vanilla JS
- Minimize dependencies in package.json

### Environment Variables

- `DASHBOARD_KEY` (or legacy `DASHBOARD_PASSWORD`) - login password
- `JWT_SECRET` - token signing secret (default: 'vps-ctrl-secret-99', override in prod)
- `NODE_ENV` - 'production' enables secure cookie flag
- `PORT` - server port (default: 5050)

These are automatically removed from child process environments to prevent leakage.

## Available Actions

The action system supports these predefined operations (triggered via `POST /action`):

| Action | Command | Use Case |
|--------|---------|----------|
| `deploy` | `git pull` | Deploy latest code |
| `install` | `npm install` | Install dependencies |
| `pm2_start` | `pm2 start index.js` | Start app with PM2 |
| `pm2_restart` | `pm2 restart all` | Restart all PM2 apps |
| `pm2_stop` | `pm2 stop all` | Stop all PM2 apps |
| `logs` | `pm2 logs --lines 50 --nostream` | Fetch PM2 logs |
| `npm_start` | `npm start` | Run npm start |
| `npm_dev` | `npm run dev` | Run dev server |
| `kill_port` | `fuser -k <port>/tcp` | Kill process on port |
| `kill_pid` | `kill -9 <pid>` | Kill process by PID |
| `tail_file` | `tail -n 50 <filename>` | View file tail |

To add a new action:
1. Add entry to `ALLOWED_ACTIONS` array
2. Add command to `COMMANDS` mapping
3. Handle any special parameter logic in the `POST /action` handler

## API Reference

**All endpoints require JWT authentication** (except `/login`).

### Authentication
- `POST /login` - Body: `{ password }` → Response: JWT in httpOnly cookie
- `POST /logout` - Clears token cookie

### System Info
- `GET /status` - Returns `{ cpu, ram, ramUsed, ramTotal, uptime, root }`
- `GET /processes` - Returns top 50 processes by CPU/RAM with port mappings

### File Operations
- `GET /files?path=...` - Lists directory with parent link and project detection
- `GET /file-content?path=...` - Read file content
- `POST /file-save` - Body: `{ path, content }` → Save file

### Actions
- `POST /action` - Body: `{ action, path, port?, pid? }` → Execute predefined command

### Terminal (WebSocket)
- `WebSocket /pty?path=...` - Authenticated via cookie/token query param
- Messages: `{ type: 'input'|'create'|'kill'|'resize', ... }`

## Code Organization

**server/index.js is organized into comment-delimited sections:**

- Auth Middleware
- Login Endpoint
- Path Validation
- File System Explorer
- System Status
- Process Manager
- Utilities (formatBytes, formatUptime, getCleanEnv)
- Action System
- File Editor
- WebSocket PTY Handler
- Server Listen

**Keep modifications focused and preserve structure.** When adding features, create new sections between existing ones or extend within the relevant section.

## Debugging Tips

1. **PTY issues** - Check terminalSessions.js; verify node-pty compiled (requires build tools)
2. **Path traversal errors** - Review validatePath() logic or test with explicit paths
3. **JWT failures** - Ensure JWT_SECRET is consistent; verify token expiry (24h)
4. **Performance** - PTY max sessions is 10; consider increasing `MAX_SESSIONS` if needed
5. **Security audits** - Grep for shell command construction; ensure all use COMMANDS mapping

## Testing the Dashboard

```bash
# Locally
npm start
# Open http://localhost:5050

# With test credentials
DASHBOARD_KEY=testpass npm start

# Check default shell (affects PTY behavior)
echo $SHELL  # Linux/Mac
echo %COMSPEC%  # Windows (uses powershell.exe as fallback)
```

## Dependencies

- **express** - Web server
- **ws** - WebSocket for PTY
- **node-pty** - Pseudo-terminal (requires build tools: make, g++, python)
- **systeminformation** - CPU/RAM/process queries
- **jsonwebtoken** - Session tokens
- **bcryptjs** - Password hashing (currently unused; see login endpoint comment)
- **cookie-parser** - Cookie middleware
- **dotenv** - Environment config

External (CDN, not npm):
- **xterm.js** - Terminal emulator
- **monaco-editor** - Code editor

## Project Status

- **Production-ready** - Actively maintained and deployed
- **Lightweight** - Minimal dependencies, ~75KB JS footprint
- **Security-first** - Path jailing, JWT auth, secure cookies
