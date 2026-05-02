<p align="center">
  <img src="logo.png" alt="VPS-CTRL Logo" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1.0-00ff88?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

---

**VPS-CTRL** is a lightweight, high-performance, and retro-styled VPS Management Dashboard. Monitor system health, explore files, edit code, and manage processes through a unified, secure web interface.

## ✨ Features

- **📊 Live System Monitoring:** Real-time CPU and RAM usage with interactive mini-graphs and history.
- **🖥️ Full PTY Terminal:** Integrated `xterm.js` terminal with `node-pty` support. Run interactive commands like `nano`, `vim`, and `top` natively.
- **⚙️ Process & Port Manager:** Dedicated tab to detect running apps, view their active ports, and kill PIDs with one click.
- **📝 Inbuilt Code Editor:** Powered by **Monaco Editor** (VS Code engine). Edit and save files directly with syntax highlighting and a custom dashboard theme.
- **📁 File Explorer:** Navigate your VPS file system with ease. Includes hidden file toggling and terminal path synchronization.
- **🛡️ Secure Authentication:** 
    - Industrial-grade **JWT-based sessions**.
    - Secure **HttpOnly Cookies** for XSS protection.
    - Restricted root access (automatic home directory detection).
- **🛠️ Action System:** 
    - **PM2 Integration:** Start, Restart, and Stop processes.
    - **Direct NPM:** Run `npm start` or `npm run dev` in an isolated environment.
    - **Port Management:** Quick "Kill Port" tool to resolve `EADDRINUSE` conflicts.
- **🎨 Retro Aesthetic:** A high-contrast, cyberpunk-inspired green terminal theme.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, WebSockets (`ws`), `node-pty`, `jsonwebtoken`, `bcryptjs`, `systeminformation`, `dotenv`.
- **Frontend:** Vanilla JS, CSS3, HTML5, xterm.js, Monaco Editor.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- Build tools (for `node-pty` compilation: `make`, `g++`, `python`)
- PM2 (optional, for PM2 actions)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chriz-3656/VPS-CTRL.git
   cd VPS-CTRL
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configuration:**
   ```bash
   cp .env.example .env
   # Edit .env to set your DASHBOARD_PASSWORD and secret
   nano .env
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the dashboard:**
   Open `http://localhost:5050` (or your configured port).

## 📖 Usage

1. **Authorize:** Enter your dashboard password on the login screen.
2. **Explore:** Use the left panel to browse files. The terminal will follow your navigation.
3. **Monitor:** Check the **PROCESSES** tab to see what apps and ports are currently active on your VPS.
4. **Edit:** Double-click any file to open it in the **EDITOR**. Use `Ctrl+S` to save.
5. **Clean Up:** If an app crashes due to port conflicts, use the **PORT MGMT** tool in the actions panel.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
<p align="center">
  <b>VPS-CTRL</b><br>
  Built with 💚 by <a href="https://github.com/chriz-3656">chriz-3656</a>
</p>
