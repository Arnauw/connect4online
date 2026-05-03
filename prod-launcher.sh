#!/usr/bin/env bash

set -e

echo "Starting Docker containers..."
cd /var/www/mywebapps/connect4online/backend
docker compose --env-file .env.local up -d

echo "Waiting for database to be ready..."
sleep 5

echo "Reloading PHP-FPM to flush OPcache..."
sudo systemctl reload php85-php-fpm

echo "Stopping any existing Messenger workers..."
php bin/console messenger:stop-workers --env=prod 2>/dev/null || true

echo "Starting Messenger worker..."
nohup php bin/console messenger:consume async --env=prod -vv >> var/log/messenger-worker.log 2>&1 &

echo "Done. Worker PID: $!"
