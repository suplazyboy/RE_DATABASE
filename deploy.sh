#!/bin/bash
# Server-side deployment script.
# Run this after pushing code updates to the server.
# Usage: bash deploy.sh

set -e

echo "===== Pulling latest code ====="
git pull origin master

echo "===== Rebuilding and restarting services ====="
docker compose build --no-cache backend frontend
docker compose up -d --no-deps backend frontend nginx

echo "===== Cleaning up unused images ====="
docker image prune -f

echo "===== Service status ====="
docker compose ps

echo "===== Done! ====="
