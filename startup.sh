#!/bin/bash

# Configuration
TUNNEL_LOG="cloudflared.log"
SERVER_LOG="server.log"
CLIENT_LOG="client.log"
ENV_CONFIG_FILE_CLIENT="client/public/env-config.js"
ENV_CONFIG_FILE_SERVER="server/.env"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helpers
log_info() { echo "$1"; }
log_success() { echo -e "${GREEN}$1${NC}"; }
log_error() { echo -e "${RED}$1${NC}" >&2; }
log_warn() { echo -e "${YELLOW}$1${NC}"; }
log_link() { echo -e "${BLUE}$1${NC}"; }

# Cleanup function
cleanup() {
    echo ""
    log_info "Shutting down services..."
    
    # Remove PUBLIC_URL from server/.env
    if [ -f "$ENV_CONFIG_FILE_SERVER" ]; then
        # Remove line starting with PUBLIC_URL=
        grep -v "^PUBLIC_URL=" "$ENV_CONFIG_FILE_SERVER" > "${ENV_CONFIG_FILE_SERVER}.tmp" && mv "${ENV_CONFIG_FILE_SERVER}.tmp" "$ENV_CONFIG_FILE_SERVER"
        log_info "Removed PUBLIC_URL from $ENV_CONFIG_FILE_SERVER"
    fi

    # Clear/Reset client config
    if [ -f "$ENV_CONFIG_FILE_CLIENT" ]; then
        echo "" > "$ENV_CONFIG_FILE_CLIENT"
        log_info "Cleared $ENV_CONFIG_FILE_CLIENT"
    fi

    # Kill all child processes of the current script
    pkill -P $$ 2>/dev/null
    rm -f "$TUNNEL_LOG" "$SERVER_LOG" "$CLIENT_LOG"
    log_success "Shutdown complete."
    exit 0
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

# Default Mode and Parsing
MODE="net" # Defaulting to net to match existing behavior unless specific args used

if [[ "$1" == "--local" ]]; then
    MODE="local"
elif [[ "$1" == "--localnet" ]]; then
    MODE="localnet"
elif [[ "$1" == "--net" ]]; then
    MODE="net"
elif [[ -z "$1" ]]; then
    # Warning for default
    log_warn "No mode specified, defaulting to --net"
    MODE="net"
else
    log_error "Invalid argument: $1"
    echo "Usage: ./startup.sh [--local | --localnet | --net]"
    exit 1
fi

log_info "----------------------------------------"
log_info "      Starting Share & Copy ($MODE)     "
log_info "----------------------------------------"
echo ""

# Dependency Check
check_dependency() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 could not be found. Please install it."
        cleanup
    fi
}

log_info "Checking dependencies..."
check_dependency "npm"
if [[ "$MODE" == "net" ]]; then
    check_dependency "cloudflared"
fi
log_success "Dependencies checked."
echo ""

SERVER_PORT=5001 # Defined in server/.env

if [[ "$MODE" == "net" ]]; then
    log_info "Starting Cloudflare Tunnel (logging to $TUNNEL_LOG)..."
    cloudflared tunnel --url http://localhost:5173 > "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    
    sleep 1
    if ! ps -p $TUNNEL_PID > /dev/null; then
        log_error "Cloudflare Tunnel failed to start. Check $TUNNEL_LOG."
        cleanup
    fi

    log_info "Waiting for Tunnel URL..."
    COUNT=0
    URL=""
    while [ $COUNT -lt $MAX_RETRIES ]; do
        if [ -f "$TUNNEL_LOG" ]; then
            URL=$(grep -o 'https://.*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1)
            if [ ! -z "$URL" ]; then break; fi
        fi
        printf "${YELLOW}Waiting... (%s/%s)${NC}\r" $((COUNT+1)) $MAX_RETRIES
        sleep $RETRY_INTERVAL
        COUNT=$((COUNT+1))
    done
    printf "%s\r" "$(tput el)" # Clear line

    if [ -z "$URL" ]; then
        log_error "Failed to get Tunnel URL."
        cleanup
    fi

    log_success "Tunnel established at: $URL"
    echo ""
    
    # Config: Point to Tunnel URL. 
    log_info "Updating Frontend configuration..."
    # Client: Overwrite file
    echo "window.SERVER_URL = \"$URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    log_info "Updated $ENV_CONFIG_FILE_CLIENT with new URL"

    log_info "Updating Backend configuration..."
    # Server: Remove old PUBLIC_URL and append new one safely
    if [ -f "$ENV_CONFIG_FILE_SERVER" ]; then
        grep -v "^PUBLIC_URL=" "$ENV_CONFIG_FILE_SERVER" > "${ENV_CONFIG_FILE_SERVER}.tmp" && mv "${ENV_CONFIG_FILE_SERVER}.tmp" "$ENV_CONFIG_FILE_SERVER"
        # Ensure newline at EOF before appending
        [[ -n "$(tail -c1 "$ENV_CONFIG_FILE_SERVER")" ]] && echo "" >> "$ENV_CONFIG_FILE_SERVER"
        echo "PUBLIC_URL=\"$URL\"" >> "$ENV_CONFIG_FILE_SERVER"
        log_info "Added PUBLIC_URL to $ENV_CONFIG_FILE_SERVER"
    else
        echo "PUBLIC_URL=\"$URL\"" > "$ENV_CONFIG_FILE_SERVER"
    fi
    
    # Start Backend
    log_info "Starting Backend Server (logging to $SERVER_LOG)..."
    (cd server && PUBLIC_URL="$URL" npm run dev >> "../$SERVER_LOG" 2>&1) &
    
    # Start Frontend
    log_info "Starting Frontend Client (logging to $CLIENT_LOG)..."
    (cd client && npm run dev >> "../$CLIENT_LOG" 2>&1) &
    
    echo ""
    log_success "Application is now running!"
    log_link "$URL"

elif [[ "$MODE" == "localnet" ]]; then
    # Detect IP
    IP=""
    # Priority list for mac interfaces
    for iface in en0 en1 en2 wlan0 eth0; do
        TEMP_IP=$(ipconfig getifaddr $iface 2>/dev/null)
        if [[ ! -z "$TEMP_IP" ]]; then IP=$TEMP_IP; break; fi
    done
    
    # Fallback
    if [[ -z "$IP" ]]; then
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    fi

    if [[ -z "$IP" ]]; then
        log_error "Could not detect local IP."
        cleanup
    fi
    
    SERVER_URL="http://${IP}:${SERVER_PORT}"
    CLIENT_URL="http://${IP}:5173"
    
    log_info "Local IP detected: $IP"
    log_info "Updating Frontend configuration..."
    echo "window.SERVER_URL = \"$SERVER_URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    
    log_info "Starting Backend Server (logging to $SERVER_LOG)..."
    # Allow CORS from Client URL
    (cd server && PUBLIC_URL="$CLIENT_URL" npm run dev >> "../$SERVER_LOG" 2>&1) &
    
    log_info "Starting Frontend Client (exposed on network) (logging to $CLIENT_LOG)..."
    (cd client && npm run dev -- --host >> "../$CLIENT_LOG" 2>&1) &
    
    echo ""
    log_success "Application is now running!"
    log_link "Local: http://localhost:5173"
    log_link "Network: $CLIENT_URL"

elif [[ "$MODE" == "local" ]]; then
    SERVER_URL="http://localhost:${SERVER_PORT}"
    
    log_info "Updating Frontend configuration..."
    echo "window.SERVER_URL = \"$SERVER_URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    
    log_info "Starting Backend Server (logging to $SERVER_LOG)..."
    (cd server && npm run dev >> "../$SERVER_LOG" 2>&1) &
    
    log_info "Starting Frontend Client (logging to $CLIENT_LOG)..."
    (cd client && npm run dev >> "../$CLIENT_LOG" 2>&1) &
    
    echo ""
    log_success "Application is now running!"
    log_link "http://localhost:5173"
fi

echo ""
log_info "Press Ctrl+C to stop all services."
wait