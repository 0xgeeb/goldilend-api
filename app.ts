import dotenv from 'dotenv';
import express from 'express';
import { createPublicClient, http, parseAbiItem, type Chain } from 'viem';

dotenv.config();
const app = express();
const port = process.env.API_PORT;
app.use(express.json());

const rpc = process.env.RPC_URL ?? ''
const BerachainMainnet = {
  id: 80094,
  name: "Berachain",
  nativeCurrency: { name: "BERA", symbol: "BERA", decimals: 18 },
  rpcUrls: { default: { http: [rpc] }, public: { http: [rpc] } }
} as const satisfies Chain
const client = createPublicClient({
  chain: BerachainMainnet,
  transport: http()
});

const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const bandbearAddy = '0xfcC3371f88a437DD756513de3d14846c2D918a4d'
const bandbearDeployBlock = 8532704
const step = 10000

app.get('/ownedBeras/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const currentBlock = await client.getBlockNumber();
    const userTokens = new Set<number>();

    for(let from = bandbearDeployBlock; from <= Number(currentBlock); from += step) {
      const to = Math.min(from + step - 1, Number(currentBlock));
      
      const logs = await client.getLogs({
        address: bandbearAddy,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock: BigInt(from),
        toBlock: BigInt(to)
      });
      
      console.log(`checked blocks ${from} to ${to} and found ${logs.length} transfer logs`);

      for (const log of logs) {
        const fromAddress = (log.args?.from as string)?.toLowerCase();
        const toAddress = (log.args?.to as string)?.toLowerCase();
        const tokenId = Number(log.args?.tokenId);

        if (toAddress === userAddress.toLowerCase()) {
          userTokens.add(tokenId);
        } else if (fromAddress === userAddress.toLowerCase()) {
          userTokens.delete(tokenId);
        }
      }

      await sleep(5);
    }

    const nftIds = Array.from(userTokens).sort((a, b) => a - b);

    res.json({
      userAddress,
      collectionAddress: bandbearAddy,
      nftIds
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'failed to get NFT IDs' });
  }
});

app.listen(port, () => {
  console.log(`goldilend-api running on port ${port}`);
}); 