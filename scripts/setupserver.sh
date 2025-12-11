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

# Create database and user first (before changing auth)
echo "Setting up database and user..."
sudo -u postgres psql << SQL
CREATE USER nft_user WITH PASSWORD 'replace_me';
CREATE DATABASE goldilend_api OWNER nft_user;
GRANT ALL PRIVILEGES ON DATABASE goldilend_api TO nft_user;
SQL

# Configure PostgreSQL to use password authentication for non-postgres users
echo "Configuring PostgreSQL authentication..."
# Add a line allowing md5 auth for nft_user specifically
sudo bash -c 'echo "host    goldilend_api    nft_user    127.0.0.1/32    md5" >> /var/lib/pgsql/data/pg_hba.conf'
sudo bash -c 'echo "host    goldilend_api    nft_user    ::1/128         md5" >> /var/lib/pgsql/data/pg_hba.conf'

# Restart PostgreSQL to apply authentication changes
echo "Restarting PostgreSQL..."
sudo systemctl restart postgresql
sleep 3

echo ""
echo "✅ PostgreSQL setup completed!"
echo ""
echo "Database tables will be created automatically when you first run the application:"
echo "  - nft_transfer_events, latest_block (NFT tracking)"
echo "  - loan_events, loan_repay_events, loan_liquidate_events, loan_renew_events, latest_loan_block (loan tracking)"
echo ""
echo "Add these to your .env file:"
echo "DB_HOST=localhost"
echo "DB_PORT=5432"
echo "DB_NAME=goldilend_api"
echo "DB_USER=nft_user"
echo "DB_PASSWORD=replace_me"
echo ""
