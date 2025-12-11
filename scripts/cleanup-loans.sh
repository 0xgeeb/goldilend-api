#!/bin/bash

echo "Cleaning up loan tables only..."
echo "================================"

# Check if PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    echo "PostgreSQL is running. Truncating loan tables..."

    echo "Truncating loan_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_repay_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_repay_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_liquidate_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_liquidate_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_renew_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_renew_events RESTART IDENTITY CASCADE;"

    echo "Truncating latest_loan_block table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE latest_loan_block RESTART IDENTITY CASCADE;"

    echo "Resetting sequences..."
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_repay_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_liquidate_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_renew_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE latest_loan_block_id_seq RESTART WITH 1;"

    echo ""
    echo "✅ Loan tables cleanup completed!"
    echo "NFT transfer tables remain untouched."
else
    echo "PostgreSQL is not running. Starting it first..."
    sudo systemctl start postgresql

    # Wait a moment for PostgreSQL to start
    sleep 2

    echo "Truncating loan_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_repay_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_repay_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_liquidate_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_liquidate_events RESTART IDENTITY CASCADE;"

    echo "Truncating loan_renew_events table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE loan_renew_events RESTART IDENTITY CASCADE;"

    echo "Truncating latest_loan_block table..."
    sudo -u postgres psql -d goldilend_api -c "TRUNCATE TABLE latest_loan_block RESTART IDENTITY CASCADE;"

    echo "Resetting sequences..."
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_repay_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_liquidate_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE loan_renew_events_id_seq RESTART WITH 1;"
    sudo -u postgres psql -d goldilend_api -c "ALTER SEQUENCE latest_loan_block_id_seq RESTART WITH 1;"

    echo ""
    echo "✅ Loan tables cleanup completed!"
    echo "NFT transfer tables remain untouched."
fi

echo ""
echo "You can now run loan ingest again with clean loan tables."
