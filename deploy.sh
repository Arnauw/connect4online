#!/usr/bin/env bash

# Stop execution immediately if any command fails
set -e

echo "🚀 Starting deployment..."

# 1. Build the React Frontend
echo "📦 Building frontend (Vite/React)..."
cd frontend
pnpm install
pnpm build
cd ..

# 2. Prepare the Symfony Backend
echo "🐘 Installing backend dependencies..."
cd backend
# Explicitly set the environment to prod for Composer scripts
export APP_ENV=prod
composer install --no-dev --optimize-autoloader

# 3. Spin up Docker Services
echo "🐳 Starting Docker containers..."
docker compose --env-file .env.local up -d --build

# Give PostgreSQL time to fully boot and accept connections
echo "⏳ Waiting for the database to initialize..."
sleep 10

# 4. Run Database Migrations
echo "🗄️ Executing database migrations..."
APP_ENV=prod php bin/console doctrine:migrations:migrate --no-interaction

# 5. Generate JWT Keys for Authentication
echo "🔑 Verifying JWT SSL keys..."
APP_ENV=prod php bin/console lexik:jwt:generate-keypair --skip-if-exists

# 6. Clear and Warm up the Production Cache
echo "🧹 Clearing Symfony production cache..."
APP_ENV=prod php bin/console cache:clear
cd ..

# 7. Secure Permissions
# Building the frontend and installing composer packages creates new files.
# We must re-apply your fedora:nginx permissions so the web server doesn't get locked out.
echo "🔐 Resetting file permissions..."
sudo chown -R fedora:nginx /var/www/mywebapps/
sudo find /var/www/mywebapps/ -type d -exec chmod 775 {} \;
sudo find /var/www/mywebapps/ -type f -exec chmod 664 {} \;

echo "✅ Deployment complete!"