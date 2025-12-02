import dotenv from 'dotenv'
import { createPublicClient, http, parseAbiItem, type Chain } from 'viem'
import { DatabaseService, NFTTransferEvent } from './database'
import { collections } from './collections'

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

const step = 10000

async function ingestNFTEvents(fromBlock: number, toBlock: number) {
  console.log(`Ingesting NFT Transfer events from block ${fromBlock} to ${toBlock}`)
  console.log(`Tracking ${collections.length} NFT collections`)

  const db = new DatabaseService()
  const allEvents: NFTTransferEvent[] = []

  // Process each collection
  for (const collection of collections) {
    console.log(`\nProcessing ${collection.name} (${collection.address})...`)

    // Collect Transfer events in batches
    for (let from = Math.max(fromBlock, collection.deployBlock); from <= toBlock; from += step) {
      const to = Math.min(from + step - 1, toBlock)

      const logs = await client.getLogs({
        address: collection.address as `0x${string}`,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock: BigInt(from),
        toBlock: BigInt(to)
      })

      if (logs.length > 0) {
        console.log(`  Blocks ${from}-${to}: Found ${logs.length} transfer logs for ${collection.name}`)
      }

      for (const log of logs) {
        const fromAddress = (log.args?.from as string)?.toLowerCase()
        const toAddress = (log.args?.to as string)?.toLowerCase()
        const tokenId = log.args?.tokenId?.toString() ?? '0'
        const blockNumber = Number(log.blockNumber)

        allEvents.push({
          collectionAddress: collection.address.toLowerCase(),
          from: fromAddress,
          to: toAddress,
          tokenId: tokenId,
          block: blockNumber,
          timestamp: Math.floor(Date.now() / 1000)
        })
      }

      await sleep(5)
    }
  }

  // Save all events to database
  if (allEvents.length > 0) {
    await db.saveTransferEvents(allEvents)
    console.log(`\nSaved ${allEvents.length} total NFT Transfer events to database`)
  } else {
    console.log(`\nNo transfer events found`)
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

    // Find earliest deploy block
    const earliestBlock = Math.min(...collections.map(c => c.deployBlock))

    console.log(`Starting NFT event ingestion from block ${earliestBlock} to ${toBlock}`)
    console.log(`Collections: ${collections.map(c => c.name).join(', ')}`)

    await ingestNFTEvents(earliestBlock, toBlock)
    console.log('NFT event ingestion completed successfully')
  } catch (error) {
    console.error('Ingestion failed:', error)
    process.exit(1)
  }
}

main()
