# NFT Holders API

Simple Express API that finds NFT IDs owned by a user in a collection.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
PORT=3000
```

3. Run the server:
```bash
npm run dev
```

## Usage

Get NFT IDs owned by a user in a collection:

```
GET /nft-ids/:userAddress/:collectionAddress?deployBlock=123456
```

**Example:**
```bash
curl "http://localhost:3000/nft-ids/0x1234567890123456789012345678901234567890/0x1234567890123456789012345678901234567890?deployBlock=15000000"
```

**Response:**
```json
{
  "userAddress": "0x1234567890123456789012345678901234567890",
  "collectionAddress": "0x1234567890123456789012345678901234567890",
  "nftIds": [1, 5, 10, 15],
  "count": 4
}
```

The API scans Transfer events from the deploy block (or last 10,000 blocks) to find ownership changes. 