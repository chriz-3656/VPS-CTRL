# VPS Dashboard - Project Instructions

This project is a lightweight, web-based VPS Management Dashboard built with Node.js and Express. It provides a simple interface for monitoring system status, exploring the file system, and running deployment actions.

## Project Overview

- **Main Technologies:** Node.js, Express, `ws` (WebSockets), `node-pty`, `jsonwebtoken` (JWT), `bcryptjs`, `systeminformation`.
- **Frontend:** Vanilla HTML/CSS/JS, `xterm.js`, `monaco-editor`.
- **Architecture:**
    - `server.js`: Main Express server handling authentication, API endpoints, and PTY WebSocket.
    - `public/`: Contains the frontend assets.
    - **Security:** Password-based login with JWT session tokens stored in `httpOnly` cookies. Path validation ensures file operations are restricted to the system's home directory.

## Features

- **System Status:** Real-time monitoring of CPU load, RAM usage, and system uptime, featuring **live mini-graphs** in the top bar.
- **Tabbed Interface:** Organize your workspace with dedicated sections for management and monitoring.
- **Interactive Terminal:** Fully functional pseudo-terminal (PTY) using `xterm.js`, supporting interactive commands like `nano`, `top`, and `vim`. Automatically synchronizes its working directory when navigating the File Explorer.
- **Live Logs:** Dedicated logs viewer to quickly inspect PM2 or application logs for the selected directory.
- **Code Editor:** Inbuilt Monaco Editor for viewing and editing files directly. Supports syntax highlighting and `Ctrl+S` to save. Double-click any file in the File Explorer to open it.
- **File Explorer:** Browse directories, select target paths for actions, and toggle visibility of hidden files.
- **Process Manager:** Persistent sidebar utility to monitor running apps, view active ports, and kill PIDs in real-time.
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
# Default (Password: admin)
npm start

# With custom Password and JWT Secret
DASHBOARD_PASSWORD=your_password JWT_SECRET=your_secret npm start
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

- `POST /login`: Authenticates user and issues JWT cookie.
- `POST /logout`: Clears the session cookie.
- `GET /status`: Returns system metrics (Requires Auth).
- `GET /files?path=...`: Lists directory contents (Requires Auth).
- `POST /action`: Executes a predefined command (Requires Auth).
- `GET /file-content?path=...`: Retrieves file content (Requires Auth).
- `POST /file-save`: Saves file content (Requires Auth).
- `WebSocket /pty?path=...`: PTY session (Requires Auth via Cookie).
