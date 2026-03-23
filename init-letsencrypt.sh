#!/bin/bash
# First-time Let's Encrypt certificate setup.
# Run this ONCE on the server after cloning the repo.
# Usage: bash init-letsencrypt.sh

set -e

# ---- Configuration ----
# Load DOMAIN from .env if present
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DOMAIN" ]; then
    echo "ERROR: DOMAIN is not set. Edit .env and set DOMAIN=your-domain.com"
    exit 1
fi

EMAIL="${CERT_EMAIL:-admin@${DOMAIN}}"   # set CERT_EMAIL in .env to override
STAGING="${STAGING:-0}"                  # set STAGING=1 in .env for testing

echo ">>> Domain : $DOMAIN"
echo ">>> Email  : $EMAIL"
echo ">>> Staging: $STAGING"

# ---- Certbot config paths ----
CERTBOT_CONF="./certbot_conf"

# ---- Download recommended TLS parameters ----
if [ ! -e "$CERTBOT_CONF/options-ssl-nginx.conf" ]; then
    echo ">>> Downloading recommended TLS parameters..."
    mkdir -p "$CERTBOT_CONF"
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
        > "$CERTBOT_CONF/options-ssl-nginx.conf"
    openssl dhparam -out "$CERTBOT_CONF/ssl-dhparams.pem" 2048
fi

# ---- Start Nginx with temporary HTTP-only config ----
echo ">>> Starting temporary Nginx for ACME challenge..."
cp nginx/nginx-init.conf nginx/nginx-active.conf
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx-active.conf
docker compose run --rm --no-deps \
    -v "$(pwd)/nginx/nginx-active.conf:/etc/nginx/conf.d/default.conf:ro" \
    -p 80:80 nginx nginx -g "daemon off;" &
NGINX_PID=$!
sleep 3

# ---- Request certificate ----
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    STAGING_FLAG="--staging"
fi

echo ">>> Requesting certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    $STAGING_FLAG \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# ---- Stop temporary Nginx ----
kill $NGINX_PID 2>/dev/null || true
rm -f nginx/nginx-active.conf

# ---- Substitute domain in production nginx.conf ----
echo ">>> Updating nginx/nginx.conf with domain $DOMAIN..."
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/nginx.conf

echo ""
echo ">>> Certificate obtained successfully!"
echo ">>> Run 'docker compose up -d' to start all services."
