#!/bin/bash

# AudioFlux VPS Deployment Script
# This script deploys both frontend and backend on a VPS

set -e

echo "🚀 Starting AudioFlux deployment..."

# Configuration
PROJECT_DIR="/var/www/audioflux"
BACKEND_DIR="$PROJECT_DIR/Backend"
FRONTEND_DIR="$PROJECT_DIR"
NODE_VERSION="18"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    npm install -g pm2
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    apt-get install -y nginx
fi

# Create project directory
print_status "Setting up project directory..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Clone or pull latest code (update this with your repo)
if [ -d ".git" ]; then
    print_status "Pulling latest changes..."
    git pull origin main
else
    print_status "Cloning repository..."
    # git clone YOUR_REPO_URL .
    print_error "Please update this script with your repository URL"
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd $BACKEND_DIR
npm install --production

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
cd $FRONTEND_DIR
npm install
npm run build

# Setup environment files
print_status "Setting up environment variables..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_error "Backend .env file not found. Please create it with required variables."
    exit 1
fi

if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    print_error "Frontend .env.local file not found. Please create it with required variables."
    exit 1
fi

# Start/Restart services with PM2
print_status "Starting services with PM2..."

# Stop existing processes
pm2 delete audioflux-backend 2>/dev/null || true
pm2 delete audioflux-frontend 2>/dev/null || true

# Start backend
cd $BACKEND_DIR
pm2 start server.js --name audioflux-backend

# Start frontend
cd $FRONTEND_DIR
pm2 start npm --name audioflux-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u root --hp /root

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/audioflux << 'EOF'
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/audioflux /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Setup firewall
print_status "Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

print_success "Deployment completed!"
print_status "Services status:"
pm2 status

echo ""
print_status "Next steps:"
echo "1. Update Nginx configuration with your domain names"
echo "2. Install SSL certificate with: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "3. Configure your environment variables in .env files"
echo ""
print_success "Your application is now running!"
