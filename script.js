// VPS-CTRL Premium Landing Page Logic

// 1. Copy Command Utility
function copyCommand(btn) {
    const code = btn.closest('.code-box').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        const originalText = btn.innerText;
        btn.innerText = 'COPIED!';
        btn.style.color = '#fff';
        btn.style.backgroundColor = 'var(--green)';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.color = '';
            btn.style.backgroundColor = '';
        }, 2000);
    });
}

// 2. Terminal Typing Simulation
const terminalElement = document.getElementById('typing-terminal');
const terminalLines = [
    { text: 'system@vps-ctrl:~$ ', type: 'prompt' },
    { text: 'vps-ctrl start', type: 'command', delay: 1000 },
    { text: '[OK] Dashboard initialized on port 5050', type: 'success', delay: 500 },
    { text: '[OK] Secure JWT session established', type: 'success', delay: 300 },
    { text: '[OK] PTY Multi-Session proxy active', type: 'success', delay: 300 },
    { text: 'system@vps-ctrl:~$ ', type: 'prompt', delay: 1000 },
    { text: 'vps-ctrl --status', type: 'command', delay: 1200 },
    { text: 'CPU: 1.2% | RAM: 14% | UPTIME: 14d 6h', type: 'info', delay: 400 },
];

async function typeTerminal() {
    terminalElement.innerHTML = '';
    
    for (const line of terminalLines) {
        if (line.delay) await new Promise(r => setTimeout(r, line.delay));
        
        const p = document.createElement('p');
        if (line.type === 'success') p.className = 'green';
        if (line.type === 'info') p.className = 'cyan';
        if (line.type === 'prompt') p.style.display = 'inline';
        
        terminalElement.appendChild(p);
        
        if (line.type === 'command') {
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            terminalElement.appendChild(cursor);
            
            for (let char of line.text) {
                p.innerHTML += char;
                await new Promise(r => setTimeout(r, 50));
            }
            cursor.remove();
            terminalElement.appendChild(document.createElement('br'));
        } else {
            p.innerHTML = line.text;
            if (line.type === 'prompt') {
                const cursor = document.createElement('span');
                cursor.className = 'cursor';
                terminalElement.appendChild(cursor);
                // If it's the last prompt, stop here
                if (line === terminalLines[terminalLines.length - 1]) return;
                await new Promise(r => setTimeout(r, 1000));
                cursor.remove();
            }
        }
    }
}

// 3. Reveal on Scroll
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            revealObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    // Start terminal typing
    typeTerminal();

    // Setup reveal animations
    const revealElements = document.querySelectorAll('.f-card, .section-heading, .terminal-window, .setup-wrapper');
    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
        revealObserver.observe(el);
    });
});

// Add dynamic class for revealed state
const style = document.createElement('style');
style.innerHTML = `
    .revealed {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);
