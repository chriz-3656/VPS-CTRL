<p align="center">
  <img src="logo.png" alt="VPS-CTRL Logo" width="180">
</p>

<h1 align="center">VPS-CTRL</h1>

<p align="center">
  <b>Lightweight self-hosted VPS management panel</b><br>
  The terminal-inspired command center for modern developers.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-00ff88?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/status-production--ready-success?style=flat-square" alt="Status">
</p>

---

### Intro

**VPS-CTRL** is a high-performance web dashboard that bridges the gap between raw SSH and complex enterprise panels. It provides a secure, web-based environment to monitor system health, explore files, edit code, and manage processes without ever opening a separate SSH client.

### Why VPS-CTRL?

*   **No SSH Dependency:** Access your server's core from any browser, anywhere.
*   **Pro Layout:** Advanced triple-column interface (System | Terminal | Files) for maximum productivity.
*   **Ultralight:** Minimal memory footprint, built with vanilla technologies for maximum speed.
*   **Developer-Focused:** Optimized for Node.js apps, Discord bots, and personal web projects.

---

### Features

*   **📊 Live Monitoring:** High-resolution CPU/RAM tracking with real-time mini-graphs and history.
*   **📁 File Explorer:** Sophisticated filesystem navigation with hidden file support and terminal path sync.
*   **🖥️ Multi-Tab PTY Terminal:** Full-blown interactive pseudo-terminal (`xterm.js`) with support for multiple isolated tabs and concurrent sessions.
*   **📝 Monaco Editor:** Integrated Monaco Editor (VS Code engine) with syntax highlighting and remote saving.
*   **🚀 Process Manager:** Persistent sidebar utility to monitor running apps, view active ports, and manage PIDs in real-time.
*   **⚙️ Smart Actions:** One-click deployment for Git, NPM, and PM2 workflows with intelligent project detection.

---

### Screenshots

<p align="center">
  <i>(Triple-Column Dashboard - System, Terminal, and Files in one view)</i><br>
  <img src="screenshots/dashboard.png" alt="Dashboard" width="800">
</p>

<p align="center">
  <i>(Isolated Multi-Tab Terminal - Run concurrent background tasks)</i><br>
  <img src="screenshots/terminal.png" alt="Terminal" width="800">
</p>

<p align="center">
  <i>(Integrated Code Editor - Syntax highlighting and remote save)</i><br>
  <img src="screenshots/editor.png" alt="Editor" width="800">
</p>

---

### Installation

#### One-line Install (Recommended)
```bash
bash <(curl -s https://raw.githubusercontent.com/chriz-3656/VPS-CTRL/main/scripts/install.sh)
```

#### Manual Installation
1.  **Clone the core:**
    ```bash
    git clone https://github.com/chriz-3656/VPS-CTRL.git
    cd VPS-CTRL
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure environment:**
    ```bash
    cp .env.example .env
    # Edit to set your DASHBOARD_KEY and JWT_SECRET
    nano .env
    ```
4.  **Launch system:**
    ```bash
    npm start
    ```

---

### Usage

1.  **Authorize:** Enter your `DASHBOARD_KEY` on the secure login screen.
2.  **Multitask:** Use the triple-column layout to monitor your app's CPU (Left) while typing in the Terminal (Center) and navigating files (Right).
3.  **Manage Tabs:** Click the **(+)** button in the Terminal header to open new isolated shell sessions.
4.  **Edit Code:** Double-click any file to open it in the Editor. Save with `Ctrl+S`.
5.  **Smart Actions:** Buttons for NPM and PM2 will automatically enable when a compatible project is detected.

---

### Security

*   **JWT Authentication:** All management endpoints are protected by encrypted session tokens.
*   **Secure Cookies:** `HttpOnly` and `SameSite` flags protect against XSS and CSRF.
*   **Environment Isolation:** Child processes are sandboxed to prevent port conflicts with the dashboard.
*   **Path Jailing:** Operations are strictly restricted to the user's home directory to prevent traversal attacks.

---

### Roadmap

*   [ ] **Docker Integration:** Manage containers and view logs directly.
*   [ ] **Multi-User Support:** Role-based access control for teams.
*   [ ] **Mobile Optimization:** A dedicated mobile-responsive UI mode.

---

### Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

---

<p align="center">
  <b>VPS-CTRL</b><br>
  Built with 💚 by <a href="https://github.com/chriz-3656">chriz-3656</a>
</p>
