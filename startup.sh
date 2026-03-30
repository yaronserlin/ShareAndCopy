#!/bin/bash
set -e

# Preview: startup.sh
# Description: Starts ShareAndCopy client and server in local, localnet, or tunnel modes.

TUNNEL_LOG="cloudflared.log"
SERVER_LOG="server.log"
CLIENT_LOG="client.log"
ENV_CONFIG_FILE_CLIENT="client/public/env-config.js"
ENV_CONFIG_FILE_SERVER="server/.env"
MAX_RETRIES=30
RETRY_INTERVAL=2

log_info() { echo "[INFO] $1"; }
log_warn() { echo "[WARN] $1"; }
log_error() { echo "[ERROR] $1" >&2; }
log_success() { echo "[OK] $1"; }
log_link() { echo "[LINK] $1"; }

cleanup() {
    echo ""
    log_info "Shutting down services..."
    if [[ -f "$ENV_CONFIG_FILE_SERVER" ]]; then
        grep -v "^PUBLIC_URL=" "$ENV_CONFIG_FILE_SERVER" > "${ENV_CONFIG_FILE_SERVER}.tmp" && mv "${ENV_CONFIG_FILE_SERVER}.tmp" "$ENV_CONFIG_FILE_SERVER"
    fi
    if [[ -f "$ENV_CONFIG_FILE_CLIENT" ]]; then
        printf '' > "$ENV_CONFIG_FILE_CLIENT"
    fi
    pkill -P $$ 2>/dev/null || true
    rm -f "$TUNNEL_LOG" "$SERVER_LOG" "$CLIENT_LOG"
    log_success "Shutdown complete."
    exit 0
}

trap cleanup SIGINT

MODE="localnet"
if [[ "$1" == "--local" || "$1" == "local" ]]; then
    MODE="local"
elif [[ "$1" == "--localnet" || "$1" == "localnet" ]]; then
    MODE="localnet"
elif [[ "$1" == "--net" || "$1" == "net" ]]; then
    MODE="net"
elif [[ -n "$1" ]]; then
    log_error "Invalid argument: $1"
    echo "Usage: ./startup.sh [--local | --localnet | --net]"
    exit 1
fi

log_info "Starting ShareAndCopy ($MODE)"

check_dependency() {
    if ! command -v "$1" &>/dev/null; then
        log_error "$1 is required but was not found. Install it and try again."
        cleanup
    fi
}

check_dependency "npm"
if [[ "$MODE" == "net" ]]; then
    check_dependency "cloudflared"
fi

SERVER_PORT=5001

start_server() {
    log_info "Starting backend server..."
    (cd server && PUBLIC_URL="$1" npm run dev >> "../$SERVER_LOG" 2>&1) &
}

start_client() {
    log_info "Starting frontend client..."
    (cd client && npm run dev $1 >> "../$CLIENT_LOG" 2>&1) &
}

if [[ "$MODE" == "net" ]]; then
    log_info "Starting Cloudflare tunnel..."
    cloudflared tunnel --url http://localhost:5173 > "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    sleep 1
    if ! ps -p "$TUNNEL_PID" > /dev/null; then
        log_error "Cloudflare tunnel failed to start. Check $TUNNEL_LOG"
        cleanup
    fi

    COUNT=0
    URL=""
    while [[ $COUNT -lt $MAX_RETRIES ]]; do
        if [[ -f "$TUNNEL_LOG" ]]; then
            URL=$(grep -o 'https://.*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1)
            if [[ -n "$URL" ]]; then
                break
            fi
        fi
        sleep "$RETRY_INTERVAL"
        COUNT=$((COUNT + 1))
    done

    if [[ -z "$URL" ]]; then
        log_error "Failed to obtain Cloudflare tunnel URL."
        cleanup
    fi

    echo "window.SERVER_URL = \"$URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    printf '%s\n' "PUBLIC_URL=\"$URL\"" > "$ENV_CONFIG_FILE_SERVER"
    start_server "$URL"
    start_client ""
    log_success "Application running at $URL"
    log_link "$URL"

elif [[ "$MODE" == "localnet" ]]; then
    IP=""
    for iface in en0 en1 en2 wlan0 eth0; do
        IP=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
        if [[ -n "$IP" ]]; then
            break
        fi
    done
    if [[ -z "$IP" ]]; then
        IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    fi
    if [[ -z "$IP" ]]; then
        log_error "Unable to detect local network IP."
        cleanup
    fi

    SERVER_URL="http://$IP:$SERVER_PORT"
    CLIENT_URL="http://$IP:5173"
    echo "window.SERVER_URL = \"$SERVER_URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    start_server "$CLIENT_URL"
    start_client "-- --host"
    log_success "Application running on network: $CLIENT_URL"
    log_link "$CLIENT_URL"

else
    SERVER_URL="http://localhost:$SERVER_PORT"
    echo "window.SERVER_URL = \"$SERVER_URL\";" > "$ENV_CONFIG_FILE_CLIENT"
    start_server "$SERVER_URL"
    start_client ""
    log_success "Application running locally at http://localhost:5173"
fi

wait
