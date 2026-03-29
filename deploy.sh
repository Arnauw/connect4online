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
# We use --no-dev to exclude dev tools (like MakerBundle or Profiler) for security and speed
composer install --no-dev --optimize-autoloader

# 3. Spin up Docker Services
echo "🐳 Starting Docker containers..."
# Pull latest images and start services in detached mode
docker compose --env-file .env.local up -d --build

# 4. Run Database Migrations
echo "🗄️ Executing database migrations..."
# --no-interaction prevents the script from pausing to ask "Are you sure?"
APP_ENV=prod php bin/console doctrine:migrations:migrate --no-interaction

# 5. Clear and Warm up the Production Cache
echo "🧹 Clearing Symfony production cache..."
APP_ENV=prod php bin/console cache:clear
cd ..

# 6. Secure Permissions
# Building the frontend and installing composer packages creates new files.
# We must re-apply your fedora:nginx permissions so the web server doesn't get locked out.
echo "🔐 Resetting file permissions..."
sudo chown -R fedora:nginx /var/www/mywebapps/
sudo find /var/www/mywebapps/ -type d -exec chmod 775 {} \;
sudo find /var/www/mywebapps/ -type f -exec chmod 664 {} \;

echo "✅ Deployment complete!"