import dotenv from 'dotenv'
import { createPublicClient, http, parseAbiItem, type Chain } from 'viem'
import { DatabaseService, NFTTransferEvent } from './database'

dotenv.config()
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
})

const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const bandbearAddy = '0xfcC3371f88a437DD756513de3d14846c2D918a4d'
const bandbearDeployBlock = 8532704
const step = 10000

async function ingestNFTEvents(fromBlock: number, toBlock: number) {
  console.log(`Ingesting NFT Transfer events from block ${fromBlock} to ${toBlock}`)

  const db = new DatabaseService()
  const allEvents: NFTTransferEvent[] = []

  // Collect Transfer events in batches
  for (let from = Math.max(fromBlock, bandbearDeployBlock); from <= toBlock; from += step) {
    const to = Math.min(from + step - 1, toBlock)

    const logs = await client.getLogs({
      address: bandbearAddy,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    console.log(`Checked blocks ${from} to ${to} and found ${logs.length} transfer logs`)

    for (const log of logs) {
      const fromAddress = (log.args?.from as string)?.toLowerCase()
      const toAddress = (log.args?.to as string)?.toLowerCase()
      const tokenId = Number(log.args?.tokenId)
      const blockNumber = Number(log.blockNumber)

      allEvents.push({
        from: fromAddress,
        to: toAddress,
        tokenId: tokenId,
        block: blockNumber,
        timestamp: Math.floor(Date.now() / 1000)
      })
    }

    await sleep(5)
  }

  // Save all events to database
  if (allEvents.length > 0) {
    await db.saveTransferEvents(allEvents)
    console.log(`Saved ${allEvents.length} NFT Transfer events to database`)
  }

  // Update the latest processed block
  await db.updateLatestBlock(toBlock)
  console.log(`Updated latest processed block to ${toBlock}`)

  await db.close()
  console.log(`Completed NFT event ingestion for blocks ${fromBlock} to ${toBlock}`)
}

async function main() {
  try {
    const currentBlock = await client.getBlockNumber()
    const toBlock = Number(currentBlock)

    console.log(`Starting NFT event ingestion from block ${bandbearDeployBlock} to ${toBlock}`)

    await ingestNFTEvents(bandbearDeployBlock, toBlock)
    console.log('NFT event ingestion completed successfully')
  } catch (error) {
    console.error('Ingestion failed:', error)
    process.exit(1)
  }
}

main()
