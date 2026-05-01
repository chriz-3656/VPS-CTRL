# VPS Dashboard - Project Instructions

This project is a lightweight, web-based VPS Management Dashboard built with Node.js and Express. It provides a simple interface for monitoring system status, exploring the file system, and running deployment actions.

## Project Overview

- **Main Technologies:** Node.js, Express, `ws` (WebSockets), `node-pty` (pseudo-terminal), `systeminformation` (for metrics).
- **Frontend:** Vanilla HTML/CSS/JS (located in `public/`), `xterm.js` for full terminal emulation.
- **Architecture:**
    - `server.js`: Main Express server handling API endpoints, static file serving, and the WebSocket server for the PTY.
    - `public/`: Contains the frontend assets.
    - **Security:** API Key authentication is required for all management endpoints and WebSocket connections. Path validation ensures file operations are restricted to the system's home directory (automatically detected).

## Features

- **System Status:** Real-time monitoring of CPU load, RAM usage, and system uptime, featuring **live mini-graphs** in the top bar.
- **Tabbed Interface:** Organize your workspace with dedicated sections for management and monitoring.
- **Interactive Terminal:** Fully functional pseudo-terminal (PTY) using `xterm.js`, supporting interactive commands like `nano`, `top`, and `vim`. Automatically synchronizes its working directory when navigating the File Explorer.
- **Live Logs:** Dedicated logs viewer to quickly inspect PM2 or application logs for the selected directory.
- **Code Editor:** Inbuilt Monaco Editor for viewing and editing files directly. Supports syntax highlighting and `Ctrl+S` to save. Double-click any file in the File Explorer to open it.
- **File Explorer:** Browse directories, select target paths for actions, and toggle visibility of hidden files.
- **Action System:** Trigger predefined commands for process management and deployment:
    - `deploy`: `git pull`
    - `install`: `npm install`
    - `pm2_start`: `pm2 start index.js`
    - `pm2_restart`: `pm2 restart all`
    - `pm2_stop`: `pm2 stop all`
    - `logs`: `pm2 logs --lines 50 --nostream`
    - `npm_start`: `npm start`
    - `npm_dev`: `npm run dev`

## Setup and Execution

### Prerequisites
- Node.js installed.
- Build tools (e.g., `make`, `g++`, `python`) required to compile `node-pty`.
- `pm2` installed globally (optional, required for process management actions).

### Installation
```bash
npm install
```

### Running the Dashboard
```bash
# Default (uses API Key: SECRET)
npm start

# With custom API Key
DASHBOARD_KEY=your_secret_key npm start
```
The dashboard will be available at `http://localhost:5050`.

## Development Conventions

- **Surgical Changes:** The backend logic is centralized in `server.js`. Keep modifications focused and preserve the existing structure (delimited by comment blocks).
- **Security First:**
    - Always use `validatePath()` for any file-system related inputs.
    - Never inject user-provided strings directly into shell commands. Use the predefined `COMMANDS` mapping.
- **Frontend:** Avoid adding heavy frameworks. Maintain the lightweight nature of the project using vanilla JS and CSS. External libraries like `xterm.js` are loaded via CDN to keep the repository clean.
- **Dependencies:** Minimize adding new dependencies to keep the project "lightweight".

## API Reference

All management endpoints require an API Key via query parameter `?key=...` or `x-api-key` header.

- `GET /status`: Returns system metrics.
- `GET /files?path=...`: Lists directory contents.
- `POST /action`: Executes a predefined command. Body: `{ "action": "...", "path": "..." }`.
- `GET /file-content?path=...`: Retrieves the content of a file.
- `POST /file-save`: Saves content to a file. Body: `{ "path": "...", "content": "..." }`.
- `WebSocket /pty?key=...&path=...`: Establishes a bidirectional PTY session.
