#!/bin/bash

# Create .certs directory if it doesn't exist
mkdir -p .certs

# Check if certificates already exist
if [ -f ".certs/server.key" ] && [ -f ".certs/server.crt" ]; then
    echo "Certificates already exist in .certs/"
    exit 0
fi

echo "Generating self-signed certificates..."

# Generate Private Key and Certificate
openssl req -newkey rsa:2048 -nodes -keyout .certs/server.key -x509 -days 365 -out .certs/server.crt -subj "/C=US/ST=Dev/L=Local/O=Dev/CN=localhost"

echo "Certificates generated successfully!"
echo "Key: .certs/server.key"
echo "Cert: .certs/server.crt"
