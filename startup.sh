#!/bin/bash

# Configuration
TUNNEL_LOG="cloudflared.log"
SERVER_LOG="server.log"
CLIENT_LOG="client.log"
ENV_CONFIG_FILE="client/public/env-config.js"
MAX_RETRIES=30 # Increased retries for tunnel URL
RETRY_INTERVAL=2 # seconds

# Colors for better UI
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions for colored output
log_info() {
    echo "$1"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}" >&2
}

log_warn() {
    echo -e "${YELLOW}$1${NC}"
}
log_link() {
    echo -e "${BLUE}$1${NC}"
}

# Cleanup function
cleanup() {
    echo ""
    log_info "Shutting down services..."
    # Kill all child processes of the current script
    pkill -P $$ 2>/dev/null
    rm -f "$TUNNEL_LOG" "$SERVER_LOG" "$CLIENT_LOG"
    log_success "Shutdown complete."
    exit 0
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# --- Script Start ---
log_info "----------------------------------------"
log_info "      Starting Local Development Setup  "
log_info "----------------------------------------"
echo ""

# --- Dependency Checks ---
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 could not be found. Please install it."
        cleanup
    fi
}

log_info "Checking dependencies..."
check_dependency "cloudflared"
check_dependency "npm"
log_success "Dependencies checked."
echo ""

# --- Start Cloudflare Tunnel ---
log_info "Starting Cloudflare Tunnel (logging to $TUNNEL_LOG)..."
cloudflared tunnel --url http://localhost:5173 > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

# Check if cloudflared started successfully
sleep 1 # Give it a moment to start and potentially fail
if ! ps -p $TUNNEL_PID > /dev/null; then
    log_error "Cloudflare Tunnel failed to start. Check $TUNNEL_LOG for details."
    cleanup
fi
echo ""

# --- Wait for Tunnel URL ---
log_info "Waiting for Tunnel URL to become available..."
COUNT=0
URL=""

while [ $COUNT -lt $MAX_RETRIES ]; do
    if [ -f "$TUNNEL_LOG" ]; then
        URL=$(grep -o 'https://.*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1)
        if [ ! -z "$URL" ]; then
            break
        fi
    fi
    printf "${YELLOW}Waiting for Tunnel URL... (attempt %s/%s)${NC}\r" $((COUNT+1)) $MAX_RETRIES
    sleep $RETRY_INTERVAL
    COUNT=$((COUNT+1))
done

# Clear the progress line
printf "%s\r" "$(tput el)"

if [ -z "$URL" ]; then
    log_error "Failed to extract Cloudflare URL after multiple retries. Check $TUNNEL_LOG."
    cleanup
fi

log_success "Tunnel established at: $URL"
echo ""

# --- Generate env-config.js for Frontend ---
log_info "Updating Frontend configuration file: $ENV_CONFIG_FILE..."
echo "window.SERVER_URL = \"$URL\";" > "$ENV_CONFIG_FILE"
log_success "Frontend config updated."
echo ""

# --- Start Backend ---
log_info "Starting Backend Server (logging to $SERVER_LOG)..."
(cd server && PUBLIC_URL="$URL" npm run dev >> "../$SERVER_LOG" 2>&1) &
# (cd server && PUBLIC_URL="$URL" npm run dev ) &
SERVER_PID=$!
log_success "Backend server started."
echo ""

# --- Start Frontend ---
log_info "Starting Frontend Client (logging to $CLIENT_LOG)..."
(cd client && npm run dev > "../$CLIENT_LOG" 2>&1) &
CLIENT_PID=$!
log_success "Frontend client started."
echo ""

log_info "----------------------------------------"
log_success "Application is now running!"
echo ""
log_link "http://localhost:5173"
echo ""
log_link "$URL"
echo ""
log_info "----------------------------------------"
echo ""
log_info "Press Ctrl+C to stop all services."

# Wait for all background processes (cloudflared, server, client)
wait
