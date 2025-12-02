import dotenv from 'dotenv';
import express from 'express';
import { DatabaseService } from './database';

dotenv.config();
const app = express();
const port = process.env.API_PORT;
app.use(express.json());

const db = new DatabaseService();

const bandbearAddy = '0x12B32F41d11dF8D8f6d23090d0DC8fcB3F5Ac0f4'

app.get('/ownedBeras/:userAddress', async (req, res) => {
  console.log('ownedBeras request received');
  try {
    const { userAddress } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Check if any data has been processed
    const latestProcessedBlock = await db.getLatestBlock();
    if (latestProcessedBlock === null) {
      res.status(503).json({
        error: 'Service not ready',
        message: 'No blocks have been processed yet. Please wait for the updater to process historical data.'
      });
      return;
    }

    // Get owned NFTs from database
    const nftIds = await db.getOwnedNFTs(userAddress);

    res.json({
      userAddress,
      collectionAddress: bandbearAddy,
      nftIds,
      latestProcessedBlock
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'failed to get NFT IDs' });
  }
});

app.listen(port, () => {
  console.log(`goldilend-api running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await db.close();
  process.exit(0);
}); 