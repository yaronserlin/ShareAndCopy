#!/bin/bash

# Configuration
TUNNEL_LOG="cloudflared.log"
ENV_CONFIG_FILE="client/public/env-config.js"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    rm -f "$TUNNEL_LOG"
    echo "✅ Shutdown complete."
    exit
}

# Trap SIGINT (Ctrl+C)
trap cleanup SIGINT

echo "🚀 Starting Cloudflare Tunnel..."
# Start cloudflared in the background and log output
# Tunneling port 5173 (Client)
cloudflared tunnel --url http://localhost:5173 > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

echo "⏳ Waiting for Tunnel URL..."
# Loop until URL is found in the log file
MAX_RETRIES=20
COUNT=0
URL=""

while [ $COUNT -lt $MAX_RETRIES ]; do
    if [ -f "$TUNNEL_LOG" ]; then
        URL=$(grep -o 'https://.*\.trycloudflare\.com' "$TUNNEL_LOG" | head -n 1)
        if [ ! -z "$URL" ]; then
            break
        fi
    fi
    sleep 2
    COUNT=$((COUNT+1))
    echo -n "."
done

echo ""

if [ -z "$URL" ]; then
    echo "❌ Failed to extract Cloudflare URL."
    cleanup
fi

echo "✅ Tunnel established at: $URL"

# Generate env-config.js for Frontend
echo "📝 Updating Frontend Config..."
echo "window.SERVER_URL = \"$URL\";" > "$ENV_CONFIG_FILE"
echo "Saved to $ENV_CONFIG_FILE"

# Start Backend
echo "🛠 Starting Backend Server..."
# Pass the URL as PUBLIC_URL for CORS
(cd server && PUBLIC_URL="$URL" npm start) &

# Start Frontend
echo "🎨 Starting Frontend Client..."
(cd client && npm run dev) &

echo "The public URL is: $URL" &

# Wait for all background processes
wait
