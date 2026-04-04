#!/bin/bash
#
# deploy.sh - Manual deployment script for PHE (Samadhan AI)
#
# NOTE: For automated deployments, GitHub Actions handles everything.
# This script is for manual deployments or recovery scenarios.
#
# Usage: ./deploy.sh
#

set -e

# ============================================================================
# Configuration
# ============================================================================
APP_DIR="${HOME}/PHE"
LOG_DIR="$APP_DIR/logs"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; }

# ============================================================================
# Main
# ============================================================================

cd "$APP_DIR"
mkdir -p "$LOG_DIR"

log "Starting manual deployment..."

# Check if deploy.tar.gz exists (from GitHub Actions)
if [ -f "deploy.tar.gz" ]; then
    log "Found deployment package, extracting..."
    tar -xzf deploy.tar.gz
    rm deploy.tar.gz
    
    log "Installing production dependencies..."
    npm ci --omit=dev
    
    log "Installing Python dependencies..."
    pip install -r requirements.txt --quiet 2>/dev/null || pip3 install -r requirements.txt --quiet 2>/dev/null || true
else
    log "No deployment package found. Pulling from git..."
    git fetch origin main
    git reset --hard origin/main
    
    log "Installing dependencies..."
    npm ci --omit=dev
    
    log "Installing Python dependencies..."
    pip install -r requirements.txt --quiet 2>/dev/null || pip3 install -r requirements.txt --quiet 2>/dev/null || true
    
    # Note: Building on VM is not recommended for low-memory servers
    # If you must build locally, uncomment the next line:
    # npm run build
fi

log "Restarting PM2 processes..."
pm2 reload ecosystem.config.cjs --update-env 2>/dev/null || pm2 start ecosystem.config.cjs
pm2 save

log_success "Deployment complete!"
pm2 list
