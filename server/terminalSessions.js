const pty = require('node-pty');
const os = require('os');

const sessions = new Map();
const MAX_SESSIONS = 10;

function createSession(sessionId, cwd, cols = 80, rows = 24) {
    if (sessions.size >= MAX_SESSIONS) {
        throw new Error('Max terminal sessions reached');
    }
    const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : 'bash');
    
    const env = { ...process.env };
    // Prevent sensitive variables from leaking into the shell
    delete env.PORT;
    delete env.DASHBOARD_PASSWORD;
    delete env.JWT_SECRET;
    delete env.DASHBOARD_KEY;

    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: parseInt(cols, 10) || 80,
        rows: parseInt(rows, 10) || 24,
        cwd: cwd || os.homedir(),
        env: env
    });

    sessions.set(sessionId, ptyProcess);
    return ptyProcess;
}

function getSession(sessionId) {
    return sessions.get(sessionId);
}

function killSession(sessionId) {
    const ptyProcess = sessions.get(sessionId);
    if (ptyProcess) {
        try {
            ptyProcess.kill();
        } catch (e) {}
        sessions.delete(sessionId);
    }
}

function listSessions() {
    return Array.from(sessions.keys());
}

module.exports = {
    createSession,
    getSession,
    killSession,
    listSessions
};
