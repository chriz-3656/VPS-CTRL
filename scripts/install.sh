#!/bin/bash

# VPS-CTRL Automated Installer
# 🚀 Lightweight self-hosted VPS management panel

set -e

echo "📦 Starting VPS-CTRL installation..."

# Check for node
if ! command -v node &> /dev/null
then
    echo "❌ Node.js not found. Please install Node.js v18 or higher."
    exit 1
fi

# Clone repository if not already in directory
if [ ! -f "package.json" ]; then
    echo "📥 Cloning VPS-CTRL repository..."
    git clone https://github.com/chriz-3656/VPS-CTRL.git .
fi

echo "📂 Installing dependencies..."
npm install --silent

echo "⚙️ Configuring environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Generate a random JWT secret
    JWT_SEC=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
    sed -i "s/change_me_to_something_very_long_and_random/$JWT_SEC/" .env
    echo "✅ Created .env with random JWT_SECRET"
fi

echo "🚀 VPS-CTRL is ready!"
echo "------------------------------------------------"
echo "To start the dashboard:"
echo "npm start"
echo ""
echo "Default password: admin (Change this in .env!)"
echo "Access at: http://localhost:5050"
echo "------------------------------------------------"
