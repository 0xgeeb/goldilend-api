#!/bin/bash

echo "Setting up PostgreSQL for Goldilend API on AWS"
echo "=============================================="

# Clean up any stale metadata
echo "Cleaning DNF metadata..."
sudo dnf clean metadata

# Install PostgreSQL 15 (if not already installed)
echo "Installing PostgreSQL 15..."
sudo dnf install -y postgresql15 postgresql15-server

# Initialize PostgreSQL database
echo "Initializing PostgreSQL database..."
if [ ! -d "/var/lib/pgsql/data/base" ]; then
    sudo /usr/bin/postgresql-setup --initdb
else
    echo "PostgreSQL already initialized, skipping..."
fi

# Enable and start the PostgreSQL service
echo "Starting PostgreSQL service..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
sleep 3

# Create database and user
echo "Setting up database and user..."
sudo -u postgres psql << SQL
CREATE USER nft_user WITH PASSWORD 'replace_me';
CREATE DATABASE goldilend_api OWNER nft_user;
SQL

echo ""
echo "✅ PostgreSQL setup completed!"
echo ""
echo "Database tables (nft_transfer_events and latest_block) will be created automatically"
echo "when you first run the application (ingest.ts, update.ts, or app.ts)."
echo ""
echo "Add these to your .env file:"
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=goldilend_api"
echo "DB_USER=nft_user"
echo "DB_PASSWORD=replace_me"
echo ""
