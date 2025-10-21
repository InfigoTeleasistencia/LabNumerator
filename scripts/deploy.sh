#!/bin/bash

################################################################################
# LabNumerator Deployment Script
# 
# Usage:
#   ./scripts/deploy.sh [environment]
#
# Environments:
#   production (default)
#   staging
#
# Example:
#   ./scripts/deploy.sh production
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="lab-numerator"
DEPLOY_PATH="/var/www/LabNumerator"

log_info "Starting deployment for environment: $ENVIRONMENT"

# Check if .env file exists
ENV_FILE=".env.${ENVIRONMENT}.local"
if [ ! -f "$ENV_FILE" ]; then
    log_error "Environment file $ENV_FILE not found!"
    log_info "Create it from .env.example:"
    log_info "  cp .env.example $ENV_FILE"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Backup current deployment
if [ -d "$DEPLOY_PATH" ]; then
    BACKUP_DIR="${DEPLOY_PATH}_backup_$(date +%Y%m%d_%H%M%S)"
    log_warning "Creating backup at $BACKUP_DIR"
    cp -r "$DEPLOY_PATH" "$BACKUP_DIR" || true
fi

# Install dependencies
log_info "Installing dependencies..."
yarn install --frozen-lockfile

# Run type check
log_info "Running type check..."
yarn type-check

# Test SOAP connectivity
log_info "Testing SOAP service connectivity..."
if node scripts/test-soap.js --check-only; then
    log_success "SOAP service is accessible"
else
    log_warning "SOAP service test failed (continuing anyway)"
fi

# Build application
log_info "Building Next.js application..."
NODE_ENV=production yarn build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed!"
    log_info "Install it with: npm install -g pm2"
    exit 1
fi

# Stop existing PM2 process
log_info "Stopping existing PM2 process (if any)..."
pm2 delete $APP_NAME 2>/dev/null || log_warning "No existing process to stop"

# Start application with PM2
log_info "Starting application with PM2..."
pm2 start ecosystem.config.js --env $ENVIRONMENT

# Save PM2 configuration
log_info "Saving PM2 configuration..."
pm2 save

# Show PM2 status
log_info "Application status:"
pm2 list
pm2 info $APP_NAME

# Wait for application to start
log_info "Waiting for application to start..."
sleep 5

# Health check
log_info "Performing health check..."
if pm2 list | grep -q "$APP_NAME.*online"; then
    log_success "Application is running!"
    
    # Try to curl the application
    if command -v curl &> /dev/null; then
        if curl -sf http://localhost:3000 > /dev/null; then
            log_success "Application is responding to HTTP requests"
        else
            log_warning "Application is running but not responding to HTTP (may need more time)"
        fi
    fi
else
    log_error "Application failed to start!"
    log_info "Check logs with: pm2 logs $APP_NAME"
    exit 1
fi

# Print logs location
log_info "Logs are available at:"
log_info "  - PM2 logs: pm2 logs $APP_NAME"
log_info "  - Application logs: $DEPLOY_PATH/logs/"

# Print success message
echo ""
log_success "========================================="
log_success "   Deployment completed successfully!"
log_success "========================================="
echo ""
log_info "Access the application at:"
log_info "  http://localhost:3000"
echo ""
log_info "Useful commands:"
log_info "  pm2 logs $APP_NAME      - View logs"
log_info "  pm2 restart $APP_NAME   - Restart application"
log_info "  pm2 stop $APP_NAME      - Stop application"
log_info "  pm2 monit               - Monitor resources"
echo ""

exit 0

