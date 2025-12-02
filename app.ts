import dotenv from 'dotenv';
import express from 'express';
import { DatabaseService } from './database';

dotenv.config();
const app = express();
const port = process.env.API_PORT;
app.use(express.json());

const db = new DatabaseService();

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

    // Get owned NFTs from database (all collections)
    const ownedNFTs = await db.getOwnedNFTs(userAddress);

    // Group NFTs by collection
    const nftsByCollection: Record<string, string[]> = {};
    ownedNFTs.forEach(nft => {
      if (!nftsByCollection[nft.collectionAddress]) {
        nftsByCollection[nft.collectionAddress] = [];
      }
      nftsByCollection[nft.collectionAddress].push(nft.tokenId);
    });

    res.json({
      userAddress,
      totalBeras: ownedNFTs.length,
      collections: nftsByCollection,
      nfts: ownedNFTs,
      latestProcessedBlock
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'failed to get NFT IDs' });
  }
});

app.get('/loans/:userAddress', async (req, res) => {
  console.log('loans request received');
  try {
    const { userAddress } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Check if any loan data has been processed
    const latestProcessedBlock = await db.getLatestLoanBlock();
    if (latestProcessedBlock === null) {
      res.status(503).json({
        error: 'Service not ready',
        message: 'No loan blocks have been processed yet. Please wait for the updater to process historical data.'
      });
      return;
    }

    // Get loans from database
    const loans = await db.getLoansByUser(userAddress);

    res.json({
      userAddress,
      totalLoans: loans.length,
      loans,
      latestProcessedBlock
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'failed to get loans' });
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