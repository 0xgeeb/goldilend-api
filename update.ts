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

const bandbearAddy = '0x12B32F41d11dF8D8f6d23090d0DC8fcB3F5Ac0f4'
const bandbearDeployBlock = 13014003
const step = 10000

class AutoUpdater {
  private db: DatabaseService
  private isRunning: boolean = false
  private checkInterval: number = 60000 // Check every minute
  private batchSize: number = 10000 // Process blocks in batches
  private rpcDelay: number = 500 // RPC delay

  constructor() {
    this.db = new DatabaseService()
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Auto updater is already running')
      return
    }

    this.isRunning = true
    console.log('Starting NFT auto updater...')
    console.log(`Check interval: ${this.checkInterval}ms (${this.checkInterval/1000}s)`)
    console.log(`Batch size: ${this.batchSize} blocks`)
    console.log(`RPC delay: ${this.rpcDelay}ms`)

    while (this.isRunning) {
      try {
        await this.processNewBlocks()
        await sleep(this.checkInterval)
      } catch (error) {
        console.error('Error in auto updater:', error)
        await sleep(10000)
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false
    console.log('Stopping auto updater...')
  }

  private async processNewBlocks(): Promise<void> {
    const currentBlock = await client.getBlockNumber()
    const currentBlockNumber = Number(currentBlock)

    // Get latest processed block
    const latestProcessed = await this.db.getLatestBlock()
    const startBlock = latestProcessed ? latestProcessed + 1 : bandbearDeployBlock

    // Process all available blocks up to current block
    if (startBlock <= currentBlockNumber) {
      let processingBlock = startBlock
      while (processingBlock <= currentBlockNumber) {
        const endBlock = Math.min(processingBlock + this.batchSize - 1, currentBlockNumber)
        const blocksToProcess = endBlock - processingBlock + 1
        console.log(`Processing NFT blocks ${processingBlock} to ${endBlock} (${blocksToProcess} blocks)`)
        await this.ingestNFTEvents(processingBlock, endBlock)
        processingBlock = endBlock + 1
      }
    }

    console.log(`Auto update check completed. Current block: ${currentBlockNumber}`)
  }

  private async ingestNFTEvents(fromBlock: number, toBlock: number): Promise<void> {
    const allEvents: NFTTransferEvent[] = []

    // Collect Transfer events
    for (let from = Math.max(fromBlock, bandbearDeployBlock); from <= toBlock; from += step) {
      const to = Math.min(from + step - 1, toBlock)
      const logs = await client.getLogs({
        address: bandbearAddy,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
        fromBlock: BigInt(from),
        toBlock: BigInt(to)
      })

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

      await sleep(this.rpcDelay)
    }

    // Save all events to database
    if (allEvents.length > 0) {
      await this.db.saveTransferEvents(allEvents)
      console.log(`Saved ${allEvents.length} NFT Transfer events to database`)
    }

    // Update the latest processed block
    await this.db.updateLatestBlock(toBlock)
    console.log(`Updated latest processed block to ${toBlock}`)
  }

  async close(): Promise<void> {
    await this.stop()
    await this.db.close()
  }
}

// Main execution
async function main() {
  const updater = new AutoUpdater()

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...')
    await updater.close()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...')
    await updater.close()
    process.exit(0)
  })

  try {
    await updater.start()
  } catch (error) {
    console.error('Auto updater failed:', error)
    await updater.close()
    process.exit(1)
  }
}

main()
