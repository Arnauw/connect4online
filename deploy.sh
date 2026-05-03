#!/usr/bin/env bash

# Stop execution immediately if any command fails
set -e

echo "Starting deployment..."

# Build React Frontend
echo "Building frontend (Vite/React)..."
cd frontend
pnpm install
pnpm build
cd ..

# Prepare the Symfony Backend
echo "Installing backend dependencies..."
cd backend
# Explicitly set the environment to prod for Composer scripts
export APP_ENV=prod
composer install --no-dev --optimize-autoloader

# Launch Docker Services
echo "Starting Docker containers..."
docker compose --env-file .env.local up -d --build

# Give PostgreSQL time to boot
echo "Waiting for the database to initialize..."
sleep 10

# Run Database Migrations
echo "Executing database migrations..."
APP_ENV=prod php bin/console doctrine:migrations:migrate --no-interaction

# Generate JWT Keys
echo "Verifying JWT SSL keys..."
APP_ENV=prod php bin/console lexik:jwt:generate-keypair --skip-if-exists

# Clear up the Production Cache
echo "Clearing Symfony production cache..."
APP_ENV=prod php bin/console cache:clear

# Flush OPcache so PHP-FPM workers pick up the new container immediately
echo "Reloading PHP-FPM to flush OPcache..."
sudo systemctl reload php85-php-fpm

# Restart the Messenger worker so it picks up the new code
echo "Stopping existing Messenger workers..."
APP_ENV=prod php bin/console messenger:stop-workers

echo "Starting Messenger worker in background..."
nohup APP_ENV=prod php bin/console messenger:consume async -vv >> var/log/messenger-worker.log 2>&1 &

cd ..

# Secure Permissions
# We must re-apply fedora:nginx permissions so the web server doesn't get locked out.
echo "Resetting file permissions..."
sudo chown -R fedora:nginx /var/www/mywebapps/
sudo find /var/www/mywebapps/ -type d -exec chmod 775 {} \;
sudo find /var/www/mywebapps/ -type f -exec chmod 664 {} \;

# Config and Symfony runtime dirs must be executable/writable
sudo chown -R fedora:nginx /var/www/mywebapps/connect4online/backend/config
sudo chmod -R 775 /var/www/mywebapps/connect4online/backend/config
sudo chmod -R 775 /var/www/mywebapps/connect4online/backend/var

# Scripts must stay executable
sudo chmod +x /var/www/mywebapps/connect4online/deploy.sh
sudo chmod +x /var/www/mywebapps/connect4online/cron-setup.sh
sudo chmod +x /var/www/mywebapps/connect4online/prod-launcher.sh

# Reapply SELinux write context on upload dir (survives restorecon after permission reset)
sudo restorecon -Rv /var/www/mywebapps/connect4online/backend/public/uploads/

echo "Deployment complete!"
