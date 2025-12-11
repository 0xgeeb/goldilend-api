#!/bin/bash

echo "🧹 Starting loan tables cleanup on server..."
echo "============================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed or not in PATH."
    exit 1
fi

# Ensure PostgreSQL service is running
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running. Proceeding with cleanup..."
else
    echo "🔄 PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
    sleep 2
fi

# Truncate and reset loan tables only
echo "⚙️  Truncating loan tables and resetting sequences..."
sudo -u postgres psql -d goldilend_api <<SQL
TRUNCATE TABLE loan_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE loan_repay_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE loan_liquidate_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE loan_renew_events RESTART IDENTITY CASCADE;
TRUNCATE TABLE latest_loan_block RESTART IDENTITY CASCADE;
ALTER SEQUENCE loan_events_id_seq RESTART WITH 1;
ALTER SEQUENCE loan_repay_events_id_seq RESTART WITH 1;
ALTER SEQUENCE loan_liquidate_events_id_seq RESTART WITH 1;
ALTER SEQUENCE loan_renew_events_id_seq RESTART WITH 1;
ALTER SEQUENCE latest_loan_block_id_seq RESTART WITH 1;
SQL

echo ""
echo "✅ Loan tables cleanup completed!"
echo "NFT transfer tables remain untouched."
echo ""
echo "You can now run loan ingest again with clean loan tables."
