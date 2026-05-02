/* ─────────────────────────────────────────
   VPS_CTRL — Frontend Logic
   ───────────────────────────────────────── */

let connected = false;
let selectedPath = null;
let statusInterval = null;
let showHidden = false;
let lastFsData = null;

let cpuHistory = new Array(30).fill(0);
let ramHistory = new Array(30).fill(0);

let term = null;
let fitAddon = null;
let ptySocket = null;

let editor = null;
let currentOpenFile = null;

// ─── DOM Refs ──────────────────────────────
const fileTree      = document.getElementById('file-tree');
const currentPath   = document.getElementById('current-path');
const showHiddenToggle = document.getElementById('show-hidden-toggle');
const selectedDisplay = document.getElementById('selected-display');
const cpuVal        = document.getElementById('cpu-val');
const ramVal        = document.getElementById('ram-val');
const uptimeVal     = document.getElementById('uptime-val');
const logViewer     = document.getElementById('log-viewer');
const editorFilename = document.getElementById('editor-filename');
const saveBtn       = document.getElementById('save-btn');
const procList      = document.getElementById('proc-list');

const loginOverlay  = document.getElementById('login-overlay');
const loginPassword = document.getElementById('login-password');
const loginError    = document.getElementById('login-error');
const logoutBtn     = document.getElementById('logout-btn');
const killPortInput = document.getElementById('kill-port-input');

// ─── Authentication ────────────────────────
async function login() {
  const password = loginPassword.value;
  if (!password) return;

  loginError.textContent = 'Verifying...';

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    if (res.ok) {
      loginOverlay.style.display = 'none';
      loginPassword.value = '';
      loginError.textContent = '';
      initDashboard();
    } else {
      const data = await res.json();
      loginError.textContent = data.error || 'Access Denied';
    }
  } catch (err) {
    loginError.textContent = 'Connection error';
  }
}

async function logout() {
  await fetch('/logout', { method: 'POST' });
  location.reload();
}

async function initDashboard() {
  if (connected) return;
  
  try {
    const data = await apiFetch('/status');
    connected = true;
    logoutBtn.style.display = 'block';
    
    print(`Authorized. CPU: ${data.cpu}% | RAM: ${data.ram}% | Uptime: ${data.uptime}`, 'ok');
    print('Loading systems...', 'inf');
    
    loadFiles(data.root);
    startStatusPolling();
    connectPty(data.root);
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      console.error('Initialization error:', err);
      if (term) print(`System Error: ${err.message}`, 'err');
      else alert(`System Error: ${err.message}`);
    }
  }
}

// ─── API Helper ────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(endpoint, options);
  
  if (res.status === 401) {
    connected = false;
    loginOverlay.style.display = 'flex';
    logoutBtn.style.display = 'none';
    if (statusInterval) clearInterval(statusInterval);
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Terminal Output ───────────────────────
const ANSI_COLORS = {
  dim: '\x1b[2m',
  ok: '\x1b[32m',
  err: '\x1b[31m',
  inf: '\x1b[36m',
  warn: '\x1b[33m',
  reset: '\x1b[0m'
};

function initTerminal() {
  term = new Terminal({
    theme: {
      background: '#020b05',
      foreground: '#00ff88',
      cursor: '#00ff88',
    },
    fontFamily: "'Share Tech Mono', 'Courier New', monospace",
    fontSize: 12
  });
  fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.open(document.getElementById('terminal-container'));
  fitAddon.fit();

  window.addEventListener('resize', () => {
    fitAddon.fit();
  });
  
  term.onData((data) => {
    if (ptySocket && ptySocket.readyState === WebSocket.OPEN) {
      ptySocket.send(data);
    }
  });

  print('VPS_CTRL security active.', 'dim');
  printRaw('─────────────────────────────────────────────', 'dim');
}

function print(msg, cls = '') {
  if (!term) return;
  const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const color = ANSI_COLORS[cls] || '';
  term.writeln(`\x1b[2m[${now}]\x1b[0m ${color}${msg}\x1b[0m`);
}

function printRaw(msg, cls = '') {
  if (!term) return;
  const color = ANSI_COLORS[cls] || '';
  const lines = msg.split('\n');
  lines.forEach(line => {
    term.writeln(`${color}${line}\x1b[0m`);
  });
}

function clearTerminal() {
  if (term) term.clear();
}

// ─── Tabs ──────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
  const activeContent = document.getElementById(`tab-${tabId}`);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');

  if (tabId === 'terminal' && fitAddon) {
    setTimeout(() => fitAddon.fit(), 50);
    term.focus();
  }

  if (tabId === 'editor' && editor) {
    editor.layout();
  }

  if (tabId === 'processes') {
    refreshProcesses();
  }
}

// ─── Code Editor ───────────────────────────
function initEditor() {
  require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    // Define custom theme
    monaco.editor.defineTheme('vps-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: '00ff88', background: '060f09' },
        { token: 'comment', foreground: '336644', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ffaa00' },
        { token: 'string', foreground: '00ccff' },
        { token: 'number', foreground: 'ff4444' },
      ],
      colors: {
        'editor.background': '#060f09',
        'editor.foreground': '#00ff88',
        'editorCursor.foreground': '#00ff88',
        'editor.lineHighlightBackground': '#003322',
        'editorLineNumber.foreground': '#336644',
        'editor.selectionBackground': '#00ff8833',
        'editor.inactiveSelectionBackground': '#00ff8811',
      }
    });

    editor = monaco.editor.create(document.getElementById('monaco-container'), {
      value: '',
      language: 'javascript',
      theme: 'vps-theme',
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      minimap: { enabled: false },
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: false,
      cursorStyle: 'block',
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });
  });
}

async function openFile(filePath) {
  if (!connected) return;
  
  switchTab('editor');
  editorFilename.textContent = 'loading...';
  
  try {
    const data = await apiFetch(`/file-content?path=${encodeURIComponent(filePath)}`);
    
    currentOpenFile = filePath;
    editorFilename.textContent = filePath;
    saveBtn.disabled = false;
    
    const ext = filePath.split('.').pop().toLowerCase();
    const langMap = {
      'js': 'javascript', 'ts': 'typescript', 'html': 'html', 'css': 'css',
      'json': 'json', 'md': 'markdown', 'py': 'python', 'sh': 'shell'
    };
    
    monaco.editor.setModelLanguage(editor.getModel(), langMap[ext] || 'plaintext');
    editor.setValue(data.content);
  } catch (err) {
    print(`Editor Error: ${err.message}`, 'err');
    editorFilename.textContent = 'error loading file';
  }
}

async function saveFile() {
  if (!connected || !currentOpenFile || !editor) return;
  
  const content = editor.getValue();
  saveBtn.textContent = 'SAVING...';
  saveBtn.disabled = true;
  
  try {
    await apiFetch('/file-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentOpenFile, content })
    });
    print(`File saved: ${currentOpenFile}`, 'ok');
  } catch (err) {
    print(`Save Error: ${err.message}`, 'err');
  } finally {
    saveBtn.textContent = 'SAVE (Ctrl+S)';
    saveBtn.disabled = false;
  }
}

// ─── Logs ──────────────────────────────────
async function refreshLogs() {
  if (!connected) return;
  const path = selectedPath || currentPath.textContent;
  
  logViewer.innerHTML = '<span class="dim">[ fetching logs... ]</span>';
  
  try {
    // If a file is selected, attempt to tail it
    const isFile = document.querySelector('.file-entry.selected')?.dataset.type === 'file';
    const action = isFile ? 'tail_file' : 'logs';

    const data = await apiFetch('/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, path })
    });
    
    logViewer.textContent = data.output || '(no logs found)';
    logViewer.scrollTop = logViewer.scrollHeight;
  } catch (err) {
    logViewer.innerHTML = `<span class="err">[ failed to fetch logs: ${err.message} ]</span>`;
  }
}

function clearLogs() {
  logViewer.innerHTML = '<span class="dim">[ logs cleared ]</span>';
}

// ─── Processes ─────────────────────────────
async function refreshProcesses() {
  if (!connected) return;
  procList.innerHTML = '<tr><td colspan="6" class="placeholder">Updating process list...</td></tr>';
  
  try {
    const data = await apiFetch('/processes');
    procList.innerHTML = '';
    
    data.processes.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="proc-pid">${p.pid}</td>
        <td class="proc-name">${escHtml(p.name)}</td>
        <td>${p.cpu.toFixed(1)}%</td>
        <td>${p.mem.toFixed(1)}%</td>
        <td class="proc-ports">${p.ports.join(', ') || '-'}</td>
        <td>
          <button class="kill-btn" onclick="killProcess(${p.pid})">KILL</button>
        </td>
      `;
      procList.appendChild(row);
    });
  } catch (err) {
    procList.innerHTML = `<tr><td colspan="6" class="placeholder err">[ fetch failed: ${err.message} ]</td></tr>`;
  }
}

async function killProcess(pid) {
  if (!confirm(`Are you sure you want to KILL process ${pid}?`)) return;
  
  try {
    await apiFetch('/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kill_pid', pid, path: currentPath.textContent })
    });
    print(`✓ Process ${pid} killed.`, 'ok');
    refreshProcesses();
  } catch (err) {
    print(`✗ Kill failed: ${err.message}`, 'err');
  }
}

function connectPty(cwd) {
  if (ptySocket) ptySocket.close();
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/pty?path=${encodeURIComponent(cwd)}&cols=${term.cols}&rows=${term.rows}`;
  
  ptySocket = new WebSocket(url);
  
  ptySocket.onopen = () => {
    print('PTY Session Connected.', 'ok');
    term.focus();
  };
  
  ptySocket.onmessage = (event) => {
    term.write(event.data);
  };
  
  ptySocket.onclose = () => {
    print('PTY Session Disconnected.', 'err');
  };
}

// ─── API Helper ────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const res = await fetch(endpoint, options);
  
  if (res.status === 401) {
    connected = false;
    loginOverlay.style.display = 'flex';
    logoutBtn.style.display = 'none';
    if (statusInterval) clearInterval(statusInterval);
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Status Polling ────────────────────────
function startStatusPolling() {
  if (statusInterval) clearInterval(statusInterval);
  fetchStatus();
  statusInterval = setInterval(fetchStatus, 5000);
}

async function fetchStatus() {
  try {
    const data = await apiFetch('/status');
    cpuVal.textContent  = data.cpu;
    ramVal.textContent  = data.ram;
    uptimeVal.textContent = data.uptime;

    // Update history
    cpuHistory.push(data.cpu);
    cpuHistory.shift();
    ramHistory.push(data.ram);
    ramHistory.shift();

    // Draw graphs
    drawGraph('cpu-graph', cpuHistory, '#00ff88');
    drawGraph('ram-graph', ramHistory, '#00ccff');

    // Color code CPU
    cpuVal.style.color = data.cpu > 80 ? 'var(--red)' : data.cpu > 50 ? 'var(--amber)' : 'var(--green)';
    ramVal.style.color = data.ram > 85 ? 'var(--red)' : data.ram > 60 ? 'var(--amber)' : 'var(--green)';
  } catch (e) {
    // Silently fail on status polling
  }
}

function drawGraph(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  const step = w / (data.length - 1);
  data.forEach((val, i) => {
    const x = i * step;
    const y = h - (val / 100) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill gradient
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = color + '22'; // Add transparency
  ctx.fill();
}

// ─── File System Explorer ──────────────────
async function loadFiles(dirPath) {
  if (!connected) return;

  try {
    const data = await apiFetch(`/files?path=${encodeURIComponent(dirPath)}`);
    lastFsData = data;
    renderFileTree(data);
    currentPath.textContent = data.current;
    
    // Smart Actions: Show/Hide NPM buttons
    const npmButtons = document.querySelectorAll('.action-btn[data-action^="npm_"]');
    npmButtons.forEach(btn => {
      btn.style.display = data.projectType === 'node' ? 'flex' : 'none';
    });

    // Update group labels if they become empty
    const directNpmLabel = document.querySelector('.btn-group-label:nth-of-type(2)');
    if (directNpmLabel) {
      directNpmLabel.style.display = data.projectType === 'node' ? 'block' : 'none';
    }
    
    // Sync terminal path
    syncTerminalPath(data.current);
  } catch (err) {
    print(`FS Error: ${err.message}`, 'err');
    fileTree.innerHTML = `<div class="placeholder err">[ error: ${escHtml(err.message)} ]</div>`;
  }
}

function syncTerminalPath(path) {
  if (ptySocket && ptySocket.readyState === WebSocket.OPEN) {
    // Send cd command. We use a space before to hide it from some history setups, 
    // and \r to execute.
    ptySocket.send(` cd "${path}"\r`);
    // Clear the terminal line or just let the prompt refresh
    term.focus();
  }
}

function toggleHiddenFiles() {
  showHidden = showHiddenToggle.checked;
  if (lastFsData) {
    renderFileTree(lastFsData);
  }
}

function renderFileTree(data) {
  fileTree.innerHTML = '';

  // Back button
  if (data.parent) {
    const back = document.createElement('div');
    back.className = 'back-btn';
    back.innerHTML = `<span class="entry-icon">&#8617;</span><span>../</span>`;
    back.onclick = () => loadFiles(data.parent);
    fileTree.appendChild(back);
  }

  const entries = showHidden 
    ? data.entries 
    : data.entries.filter(e => !e.name.startsWith('.'));

  if (entries.length === 0) {
    fileTree.insertAdjacentHTML('beforeend', '<div class="placeholder dim">[ empty directory ]</div>');
    return;
  }

  // Sort: dirs first, then files
  const sorted = [...entries].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach(entry => {
    const el = document.createElement('div');
    el.className = `file-entry ${entry.type === 'dir' ? 'is-dir' : 'is-file'}`;
    el.dataset.path = entry.path;
    el.dataset.type = entry.type;

    const icon = entry.type === 'dir' ? '&#128193;' : '&#128196;';
    const suffix = entry.type === 'dir' ? '/' : '';

    el.innerHTML = `
      <span class="entry-icon">${icon}</span>
      <span class="entry-name">${escHtml(entry.name)}${suffix}</span>
    `;

    if (entry.type === 'dir') {
      el.onclick = (e) => {
        // Single click = select
        selectEntry(el, entry.path);
        // Double click = navigate (handled below)
      };
      el.ondblclick = () => {
        loadFiles(entry.path);
      };
    } else {
      el.onclick = () => selectEntry(el, entry.path);
      el.ondblclick = () => openFile(entry.path);
    }

    fileTree.appendChild(el);
  });
}

function selectEntry(el, entryPath) {
  // Deselect others
  document.querySelectorAll('.file-entry.selected').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');

  selectedPath = entryPath;
  selectedDisplay.textContent = entryPath;

  // Enable action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.disabled = false;
  });

  print(`Selected: ${entryPath}`, 'inf');

  // If it's a directory (from data attribute), sync terminal
  if (el.dataset.type === 'dir') {
    syncTerminalPath(entryPath);
  }
}

// ─── Actions ───────────────────────────────
async function runAction(action) {
  if (!connected) { print('Not connected.', 'err'); return; }
  if (!selectedPath) { print('No path selected.', 'warn'); return; }

  const actionLabels = {
    deploy:      'git pull',
    install:     'npm install',
    pm2_start:   'pm2 start index.js',
    pm2_restart: 'pm2 restart all',
    pm2_stop:    'pm2 stop all',
    logs:        'pm2 logs --lines 50 --nostream',
    npm_start:   'npm start',
    npm_dev:     'npm run dev'
  };

  print(`▶ Running [${action.toUpperCase()}] in ${selectedPath}`, 'warn');
  print(`$ ${actionLabels[action]}`, 'dim');

  // Disable buttons during execution
  setButtonsDisabled(true);

  try {
    const data = await apiFetch('/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, path: selectedPath })
    });

    printRaw('─'.repeat(60), 'dim');
    printRaw(data.output, data.exitCode === 0 ? 'ok' : 'err');
    printRaw('─'.repeat(60), 'dim');

    if (data.exitCode === 0) {
      print(`✓ [${action.toUpperCase()}] completed successfully.`, 'ok');
    } else {
      print(`✗ [${action.toUpperCase()}] exited with code ${data.exitCode}.`, 'err');
    }
  } catch (err) {
    print(`✗ Action failed: ${err.message}`, 'err');
  } finally {
    setButtonsDisabled(false);
  }
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.disabled = disabled || !selectedPath;
  });
}

async function killPort() {
  if (!connected) return;
  const port = killPortInput.value.trim();
  if (!port) {
    print('ERROR: Please enter a port number.', 'err');
    return;
  }

  print(`⚠ Attempting to kill processes on port ${port}...`, 'warn');
  
  try {
    const data = await apiFetch('/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kill_port', port, path: currentPath.textContent })
    });

    print(`✓ Port ${port} cleanup command executed.`, 'ok');
    if (data.output) printRaw(data.output, 'dim');
  } catch (err) {
    print(`✗ Kill port failed: ${err.message}`, 'err');
  }
}

// ─── Utilities ─────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Enter key on Login input ────────────
loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

// ─── Init ─────────────────────────
initTerminal();
initEditor();
initDashboard();
