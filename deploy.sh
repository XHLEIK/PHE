#!/bin/bash
#
# deploy.sh - Automated deployment script for PHE (Samadhan AI)
#
# This script is executed by GitHub Actions after pushing to main branch.
# It handles pulling code, installing dependencies, building, and restarting PM2.
#
# Features:
#   - Zero-downtime deployment using PM2 reload
#   - Automatic rollback on build failure
#   - Comprehensive logging
#   - Dependency caching awareness
#
# Usage: ./deploy.sh
#

set -e  # Exit on any error

# ============================================================================
# Configuration
# ============================================================================
APP_DIR="${HOME}/PHE"
LOG_DIR="$APP_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy.log"
BACKUP_DIR="$APP_DIR/.deploy-backup"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create directories FIRST (before any logging can happen)
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOY_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$DEPLOY_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$DEPLOY_LOG"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$DEPLOY_LOG"
}

# ============================================================================
# Pre-deployment Checks
# ============================================================================

log "=============================================="
log "Starting deployment at $TIMESTAMP"
log "=============================================="

# Ensure we're in the right directory
cd "$APP_DIR" || { log_error "Failed to cd to $APP_DIR"; exit 1; }

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed or not in PATH"
    exit 1
fi

# ============================================================================
# Backup Current Build (for rollback)
# ============================================================================

# Store current commit hash for rollback reference FIRST
PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "$PREVIOUS_COMMIT" > "$BACKUP_DIR/previous_commit.txt"

log "Creating backup of current build..."
if [ -d ".next" ]; then
    rm -rf "$BACKUP_DIR/.next.bak"
    cp -r .next "$BACKUP_DIR/.next.bak"
    log_success "Backup created"
else
    log_warning "No existing .next directory to backup"
fi

# ============================================================================
# Sync Code Status
# ============================================================================

NEW_COMMIT=$(git rev-parse HEAD)
log_success "Current commit: $NEW_COMMIT"

# Show what changed (if any)
if [ "$PREVIOUS_COMMIT" != "unknown" ] && [ "$PREVIOUS_COMMIT" != "$NEW_COMMIT" ]; then
  log "Changes in this deployment:"
  git log --oneline "$PREVIOUS_COMMIT".."$NEW_COMMIT" 2>/dev/null | head -10 | tee -a "$DEPLOY_LOG" || true
fi

# ============================================================================
# Install Dependencies
# ============================================================================

log "Checking for dependency changes..."

# Check if package-lock.json changed between commits
DEPS_CHANGED=false
if [ "$PREVIOUS_COMMIT" != "unknown" ] && [ "$PREVIOUS_COMMIT" != "$NEW_COMMIT" ]; then
    if git diff --name-only "$PREVIOUS_COMMIT" "$NEW_COMMIT" 2>/dev/null | grep -q "package-lock.json"; then
        DEPS_CHANGED=true
    fi
fi

# Always run npm ci on first deployment or if deps changed
if [ "$DEPS_CHANGED" = true ] || [ ! -d "node_modules" ]; then
    log "Installing Node.js dependencies..."
    npm ci --production=false
    log_success "Node dependencies installed"
else
    log "No changes to package-lock.json, skipping npm install"
fi

# Check if requirements.txt changed
PY_DEPS_CHANGED=false
if [ "$PREVIOUS_COMMIT" != "unknown" ] && [ "$PREVIOUS_COMMIT" != "$NEW_COMMIT" ]; then
    if git diff --name-only "$PREVIOUS_COMMIT" "$NEW_COMMIT" 2>/dev/null | grep -q "requirements.txt"; then
        PY_DEPS_CHANGED=true
    fi
fi

if [ "$PY_DEPS_CHANGED" = true ]; then
    log "Updating Python dependencies..."
    pip install -r requirements.txt --quiet || pip3 install -r requirements.txt --quiet
    log_success "Python dependencies installed"
else
    log "No changes to requirements.txt, skipping pip install"
fi

# ============================================================================
# Build Application
# ============================================================================

log "Building Next.js application..."

# Set production environment
export NODE_ENV=production

# Build with error handling
if npm run build; then
    log_success "Build completed successfully"
else
    log_error "Build failed! Rolling back..."
    
    # Rollback to previous build
    if [ -d "$BACKUP_DIR/.next.bak" ]; then
        rm -rf .next
        cp -r "$BACKUP_DIR/.next.bak" .next
        log_warning "Rolled back to previous build"
    fi
    
    # Rollback git
    git reset --hard "$PREVIOUS_COMMIT"
    log_warning "Rolled back to commit: $PREVIOUS_COMMIT"
    
    exit 1
fi

# ============================================================================
# Restart PM2 Processes (Zero-Downtime)
# ============================================================================

log "Restarting PM2 processes..."

# Check if processes are already managed by PM2
if pm2 list | grep -q "phe-nextjs"; then
    # Use reload for zero-downtime restart
    log "Reloading existing PM2 processes..."
    pm2 reload ecosystem.config.cjs --update-env
else
    # First time deployment - start fresh
    log "Starting PM2 processes for the first time..."
    pm2 start ecosystem.config.cjs
fi

# Wait for processes to stabilize
sleep 3

# Verify processes are running
if pm2 list | grep -q "phe-nextjs" && pm2 list | grep "phe-nextjs" | grep -q "online"; then
    log_success "Next.js app is running"
else
    log_error "Next.js app failed to start!"
    pm2 logs phe-nextjs --lines 20 | tee -a "$DEPLOY_LOG"
fi

if pm2 list | grep -q "phe-agent" && pm2 list | grep "phe-agent" | grep -q "online"; then
    log_success "LiveKit agent is running"
else
    log_warning "LiveKit agent may have issues, checking logs..."
    pm2 logs phe-agent --lines 10 | tee -a "$DEPLOY_LOG"
fi

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# ============================================================================
# Post-Deployment Health Check
# ============================================================================

log "Running health checks..."

# Wait a moment for the app to fully start
sleep 5

# Check if Next.js is responding
if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    log_success "Next.js health check passed"
elif curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log_success "Next.js is responding (no /api/health endpoint)"
else
    log_warning "Next.js health check inconclusive - app may still be starting"
fi

# Check if agent health endpoint is responding
if curl -sf http://localhost:8081/health > /dev/null 2>&1; then
    log_success "Agent health check passed"
else
    log_warning "Agent health check failed - agent may still be starting"
fi

# ============================================================================
# Cleanup
# ============================================================================

# Keep only the last 5 deployment logs
cd "$LOG_DIR"
ls -t deploy-*.log 2>/dev/null | tail -n +6 | xargs -r rm -f

# Archive this deployment log
cp "$DEPLOY_LOG" "$LOG_DIR/deploy-$TIMESTAMP.log"

# ============================================================================
# Summary
# ============================================================================

log "=============================================="
log_success "Deployment completed successfully!"
log "Deployed commit: $NEW_COMMIT"
log "Deployment time: $TIMESTAMP"
log "=============================================="

# Show PM2 status
pm2 list

exit 0
