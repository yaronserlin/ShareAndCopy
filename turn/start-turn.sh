#!/bin/sh

# Detect Public IP if not manually set
if [ -z "$EXTERNAL_IP" ]; then
    EXTERNAL_IP=$(wget -qO- https://api.ipify.org)
fi

# Use Env vars or defaults
MIN_PORT=${MIN_PORT:-49152}
MAX_PORT=${MAX_PORT:-65535}

echo "Starting Coturn with External IP: $EXTERNAL_IP, Ports: $MIN_PORT-$MAX_PORT"

turnserver \
    -n \
    --log-file stdout \
    --external-ip=$EXTERNAL_IP \
    --listening-port=3478 \
    --min-port=$MIN_PORT \
    --max-port=$MAX_PORT \
    --realm=shareandcopy.com \
    --user=${TURN_USER}:${TURN_PASSWORD} \
    --lt-cred-mech
