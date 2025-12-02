#!/bin/bash

echo "Setting up PostgreSQL for Goldilend API"
echo "========================================"

# Update system
echo "Updating system packages..."
sudo apt update

# Install PostgreSQL
echo "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
echo "Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
echo "Setting up database and user..."
sudo -u postgres psql << EOF
CREATE DATABASE goldilend_api;
CREATE USER nft_user WITH PASSWORD 'replace_me';
GRANT ALL PRIVILEGES ON DATABASE goldilend_api TO nft_user;
\q
EOF

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
