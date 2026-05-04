# VPS-CTRL Complete Setup Guide

Complete step-by-step guide to deploy VPS-CTRL with PM2 (24/7 uptime), Nginx reverse proxy, and SSL/HTTPS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [PM2 Setup (24/7 Uptime)](#pm2-setup-247-uptime)
5. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
6. [SSL/HTTPS Setup with Let's Encrypt](#sslhttps-setup-with-lets-encrypt)
7. [Testing & Monitoring](#testing--monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Ensure your VPS has the following:

- Linux-based OS (Ubuntu 20.04+ recommended)
- Node.js v14+ installed
- npm or yarn package manager
- Build tools (gcc, g++, make, python)
- sudo access for system-level changes
- Port 80 & 443 available (or adjust configuration)
- Domain name (for SSL/HTTPS)

### Check Node.js Version

```bash
node --version && npm --version
```

### Install Build Tools

```bash
sudo apt-get update && sudo apt-get install -y build-essential python3
```

### ⚠️ Warning: Port Availability

Make sure ports 80, 443, and 5050 are available:

```bash
sudo netstat -tlnp | grep -E ':(80|443|5050)'
```

## Installation

### Step 1: Clone Repository

```bash
cd ~ && git clone https://github.com/chriz-3656/VPS-CTRL.git
cd VPS-CTRL
```

### Step 2: Install Dependencies

```bash
npm install
```

**Note:** First install may take 2-5 minutes as it compiles native modules (node-pty).

### Step 3: Test Local Run

```bash
npm start
```

Visit `http://localhost:5050` in your browser. Default password: `admin`

## Configuration

### Set Custom Password & JWT Secret

Create environment variables for secure credentials:

```bash
export DASHBOARD_PASSWORD="your_very_secure_password_here_12345"
export JWT_SECRET="your_long_random_jwt_secret_min_32_chars"
```

### Test with Custom Credentials

```bash
DASHBOARD_PASSWORD="your_password" JWT_SECRET="your_secret" npm start
```

## PM2 Setup (24/7 Uptime)

PM2 ensures VPS-CTRL runs continuously with auto-restart on crashes.

### Step 1: Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Step 2: Create PM2 Ecosystem Config

Navigate to VPS-CTRL directory and create `ecosystem.config.js`:

```bash
cat > ~/VPS-CTRL/ecosystem.config.js << 'EOFCONFIG'
module.exports = {
  apps: [{
    name: 'vps-ctrl',
    script: './server.js',
    cwd: '/root/VPS-CTRL',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5050,
      DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD,
      JWT_SECRET: process.env.JWT_SECRET
    },
    watch: false,
    max_memory_restart: '200M',
    error_file: '/root/.pm2/logs/vps-ctrl-error.log',
    out_file: '/root/.pm2/logs/vps-ctrl-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    kill_timeout: 5000,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOFCONFIG
```

### Step 3: Start Application with PM2

```bash
cd ~/VPS-CTRL && pm2 start ecosystem.config.js
```

### Step 4: Enable PM2 Auto-Startup on Reboot

```bash
pm2 startup
pm2 save
```

### Monitor PM2 Status

```bash
pm2 status
pm2 logs vps-ctrl
```

## Nginx Reverse Proxy Setup

Expose VPS-CTRL through Nginx with domain support.

### Step 1: Install Nginx

```bash
sudo apt-get install -y nginx
```

### Step 2: Create Nginx Configuration

Replace `your-domain.com` with your actual domain:

```bash
sudo tee /etc/nginx/sites-available/vps-ctrl > /dev/null << 'EOFNGINX'
upstream vps_ctrl_backend {
    server 127.0.0.1:5050;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://vps_ctrl_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /pty {
        proxy_pass http://vps_ctrl_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOFNGINX
```

### Step 3: Enable Configuration & Test

```bash
sudo ln -s /etc/nginx/sites-available/vps-ctrl /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/HTTPS Setup with Let's Encrypt

### Step 1: Install Certbot

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

Replace `your-domain.com` with your actual domain:

```bash
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

### Step 3: Auto-Renewal Setup

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

### Step 4: Update Nginx Config with SSL Paths

Edit your Nginx config and replace `your-domain.com` with your actual domain in SSL paths (already done if you followed the template above).

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Testing & Monitoring

### Test Your Setup

1. **Test HTTPS Access:**
   ```bash
   curl -I https://your-domain.com
   ```

2. **Test Login:** Visit `https://your-domain.com` and log in with your custom password.

3. **Test Terminal:** Open terminal tab and run a command (e.g., `whoami`).

4. **Test File Explorer:** Browse files and verify access.

### Monitor Running Services

```bash
pm2 status
pm2 logs vps-ctrl --lines 100
pm2 monit
sudo systemctl status nginx
htop
```

### Monitor SSL Certificate Expiry

```bash
sudo certbot certificates
```

## Troubleshooting

### Issue: Port 5050 Already in Use

```bash
sudo lsof -i :5050
sudo kill -9 PROCESS_PID
```

### Issue: PM2 Not Starting on Reboot

```bash
sudo pm2 startup
pm2 save
sudo systemctl status pm2-root
```

### Issue: Nginx 502 Bad Gateway

```bash
pm2 status
pm2 restart vps-ctrl
sudo tail -f /var/log/nginx/error.log
curl http://127.0.0.1:5050
```

### Issue: SSL Certificate Not Loading

```bash
sudo ls -la /etc/letsencrypt/live/your-domain.com/
sudo nginx -t
sudo tail -f /var/log/letsencrypt/letsencrypt.log
sudo certbot renew --force-renewal
```

### Issue: WebSocket Connection Failed

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Common Commands Reference

| Command | Purpose |
|---------|---------|
| `pm2 restart vps-ctrl` | Restart VPS-CTRL |
| `pm2 stop vps-ctrl` | Stop VPS-CTRL |
| `pm2 logs vps-ctrl` | View Logs |
| `sudo systemctl reload nginx` | Reload Nginx |
| `openssl s_client -connect your-domain.com:443` | Test SSL |
| `df -h` | Check Disk Space |

## Final Checklist

- ✓ Node.js v14+ installed
- ✓ VPS-CTRL installed in ~/VPS-CTRL
- ✓ Dependencies installed with npm install
- ✓ Custom password & JWT secret configured
- ✓ PM2 installed globally
- ✓ ecosystem.config.js created and VPS-CTRL started with PM2
- ✓ PM2 auto-startup configured
- ✓ Nginx installed and configured
- ✓ Domain points to VPS IP address
- ✓ SSL certificate obtained from Let's Encrypt
- ✓ HTTPS is working
- ✓ WebSocket terminal is functional
- ✓ File explorer and editor are accessible

## Congratulations!

VPS-CTRL is now fully deployed with 24/7 uptime, HTTPS, and production-ready setup!
