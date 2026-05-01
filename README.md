<p align="center">
  <img src="logo.png" alt="VPS-CTRL Logo" width="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-00ff88?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

---

A lightweight, high-performance, and retro-styled VPS Management Dashboard. Monitor system health, explore files, edit code, and manage processes through a unified, secure web interface.

## ✨ Features

- **📊 Live System Monitoring:** Real-time CPU and RAM usage with interactive mini-graphs.
- **📁 File Explorer:** Navigate your VPS file system with ease. Includes hidden file toggling.
- **🖥️ Full PTY Terminal:** Integrated `xterm.js` terminal with `node-pty` support. Run interactive commands like `nano`, `vim`, and `top`.
- **📝 Inbuilt Code Editor:** Powered by **Monaco Editor** (VS Code engine). Edit and save files directly with syntax highlighting.
- **⚙️ Process Management:**
    - **PM2 Integration:** Start, Restart, and Stop processes.
    - **Direct NPM:** Run `npm start` or `npm run dev` directly.
- **📜 Live Logs:** Dedicated log viewer for quick inspection of application outputs.
- **🔒 Secure Authentication:**
    - **Password Protection:** Restricted access with industrial-grade password verification.
    - **JWT Sessions:** Secure, time-limited sessions using JSON Web Tokens.
    - **HttpOnly Cookies:** Protection against Cross-Site Scripting (XSS) by storing tokens in secure cookies.
- **🔒 Security First:**
    - Strict path validation to prevent directory traversal.
    - Automatic detection of the system's home directory as the restricted root.
- **🎨 Retro Aesthetic:** A high-contrast, cyberpunk-inspired green terminal theme.

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, WebSockets (`ws`), `node-pty`, `jsonwebtoken` (JWT), `bcryptjs`, `systeminformation`.
- **Frontend:** Vanilla JS, CSS3, HTML5, xterm.js, Monaco Editor.

## 🚀 Quick Start

### Prerequisites

- Node.js (v14+)
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

3. **Start the server:**
   ```bash
   # Default password: admin
   npm start

   # Or with a custom password and JWT secret
   DASHBOARD_PASSWORD=your_secure_password JWT_SECRET=your_secret npm start
   ```

4. **Access the dashboard:**
   Open `http://localhost:5050` in your browser. You will be prompted for your password.

## 📖 Usage

1. **Authorize:** Enter your dashboard password on the login screen.
2. **Explore:** Use the left panel to browse files. The terminal working directory will automatically follow your selection.
3. **Edit:** Double-click any file in the File Explorer to open it in the **EDITOR** tab. Use `Ctrl+S` to save.
4. **Manage:** Use the **ACTIONS** panel to deploy or control your application processes.
5. **Logout:** Use the **LOGOUT** button in the top right to end your session.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
<p align="center">
  <b>VPS-CTRL</b><br>
  Built with 💚 by <a href="https://github.com/chriz3656">chriz3656</a>
</p>
