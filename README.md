# Goldilend API

API service to track BandBear NFT ownership using PostgreSQL database for fast queries.

## Architecture

- **app.ts** - Express API server that serves NFT ownership data from database
- **database.ts** - PostgreSQL service for storing and querying NFT transfer events
- **ingest.ts** - One-time script to backfill historical NFT transfer events
- **update.ts** - Continuous background service to ingest new NFT transfer events

## Quick Setup (Ubuntu/Debian)

1. Run the automated setup script:
```bash
./scripts/setup.sh
```

This will:
- Install PostgreSQL
- Create the database and user
- Configure everything automatically

2. Install dependencies:
```bash
npm install
```

3. The `.env` file is already configured with the default values from the setup script.

4. Run initial data ingestion (backfill historical events - this takes time!):
```bash
npm run ingest
```

5. Start the background updater (processes new blocks continuously):
```bash
npm run update
```

6. Start the API server:
```bash
npm run app
```

## AWS/Amazon Linux Setup

1. Run the server setup script:
```bash
./scripts/setupserver.sh
```

2. Follow steps 2-6 from above

## Manual Setup

If you prefer manual setup or need custom configuration:

1. Install PostgreSQL:
```bash
sudo apt install postgresql postgresql-contrib
```

2. Create database and user:
```bash
sudo -u postgres psql
CREATE DATABASE nft_ownership;
CREATE USER nft_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nft_ownership TO nft_user;
\q
```

3. Update `.env` with your database credentials

4. Follow steps 2-6 from Quick Setup

## API Endpoints

### GET /ownedBeras/:userAddress

Returns the latest NFT ownership data for a given user address.

**Response:**
```json
{
  "userAddress": "0x...",
  "collectionAddress": "0x12B32F41d11dF8D8f6d23090d0DC8fcB3F5Ac0f4",
  "nftIds": [1, 5, 42, ...],
  "latestProcessedBlock": 8900000
}
```

## Utility Scripts

### Cleanup Scripts

**Local cleanup** (truncate database tables):
```bash
./scripts/cleanup.sh
```

**Server cleanup** (stop PM2, remove logs, truncate database):
```bash
./scripts/cleanupserver.sh
```

### Testing Scripts

**Test local API**:
```bash
./scripts/testlocal.sh
```

**Test live/production API**:
```bash
./scripts/testlive.sh
```

## Running in Production

Use PM2 to manage processes:

```bash
# Install PM2
npm install -g pm2

# Start updater service
pm2 start npm --name "goldilend-update" -- run update

# Start API server
pm2 start npm --name "goldilend-api" -- run app

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# View logs
pm2 logs goldilend-api
pm2 logs goldilend-update

# Monitor status
pm2 status
pm2 monit

# Restart services
pm2 restart goldilend-api
pm2 restart goldilend-update
```