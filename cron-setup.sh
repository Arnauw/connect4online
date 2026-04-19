#!/usr/bin/env bash

# Sets up the Connect4Online cron jobs on the VPS.
# Safe to run multiple times — won't create duplicates.
# Requires: cronie (dnf install cronie)

set -e

BACKEND_DIR="/var/www/mywebapps/connect4online/backend"
LOG_FILE="/var/log/cleanup-games.log"
CRON_ENTRY="*/15 * * * * cd ${BACKEND_DIR} && php bin/console app:cleanup-stale-games >> ${LOG_FILE} 2>&1"

# Ensure cronie is installed and running
if ! command -v crontab &>/dev/null; then
    echo "cronie not found — installing..."
    sudo dnf install -y cronie
fi

if ! systemctl is-active --quiet crond; then
    echo "Enabling and starting crond..."
    sudo systemctl enable --now crond
fi

# Create log file with correct permissions if it doesn't exist
if [ ! -f "${LOG_FILE}" ]; then
    sudo touch "${LOG_FILE}"
    sudo chown fedora:fedora "${LOG_FILE}"
    echo "Created ${LOG_FILE}"
fi

# Add the cron entry only if it isn't already present
if crontab -l 2>/dev/null | grep -qF "app:cleanup-stale-games"; then
    echo "Cron job already registered — nothing to do."
else
    (crontab -l 2>/dev/null; echo "${CRON_ENTRY}") | crontab -
    echo "Cron job added: ${CRON_ENTRY}"
fi

echo "Current crontab:"
crontab -l
