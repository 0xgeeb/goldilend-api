#!/bin/bash

echo "Setting up PostgreSQL for Goldilend API on AWS"
echo "=============================================="

# Clean up any stale metadata
echo "Cleaning DNF metadata..."
sudo dnf clean metadata

# Install PostgreSQL 15 (if not already installed)
echo "Installing PostgreSQL 15..."
sudo dnf install -y postgresql15 postgresql15-server

# Initialize PostgreSQL database (Amazon Linux 2023 location)
echo "Initializing PostgreSQL database..."
sudo /usr/libexec/postgresql-setup --initdb

# Enable and start the PostgreSQL service
echo "Starting PostgreSQL service..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database and user
echo "Setting up database and user..."
sudo -u postgres psql << SQL
CREATE USER nft_user WITH PASSWORD 'nft_user_password_420';
CREATE DATABASE nft_ownership OWNER nft_user;
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
echo "DB_NAME=nft_ownership"
echo "DB_USER=nft_user"
echo "DB_PASSWORD=nft_user_password_420"
echo ""
echo "⚠️  Remember to change 'nft_user_password_420' to a secure password!"
