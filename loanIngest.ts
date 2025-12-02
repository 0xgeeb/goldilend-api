import dotenv from 'dotenv'
import { createPublicClient, http, parseAbiItem, type Chain } from 'viem'
import { DatabaseService, LoanEvent } from './database'

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

// Goldilend lending contract address
const lendingContractAddress = '0x46Ced2A745C911C76407fdA107FEACb22c32D05b'
const lendingContractDeployBlock = 13014003

const step = 10000

async function ingestLoanEvents(fromBlock: number, toBlock: number) {
  console.log(`Ingesting Loan Borrow events from block ${fromBlock} to ${toBlock}`)
  console.log(`Contract: ${lendingContractAddress}`)

  const db = new DatabaseService()
  const allEvents: LoanEvent[] = []

  // Collect Borrow events in batches
  for (let from = Math.max(fromBlock, lendingContractDeployBlock); from <= toBlock; from += step) {
    const to = Math.min(from + step - 1, toBlock)

    const logs = await client.getLogs({
      address: lendingContractAddress as `0x${string}`,
      event: parseAbiItem('event Borrow(address indexed user, uint256 loanID, uint256 borrowAmount, uint256 interestAmount, uint256 expiration, address collateral, uint256 collateralID)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    if (logs.length > 0) {
      console.log(`  Blocks ${from}-${to}: Found ${logs.length} Borrow events`)
    }

    for (const log of logs) {
      const user = (log.args?.user as string)?.toLowerCase()
      const loanID = log.args?.loanID?.toString() ?? '0'
      const borrowAmount = log.args?.borrowAmount?.toString() ?? '0'
      const interestAmount = log.args?.interestAmount?.toString() ?? '0'
      const expiration = log.args?.expiration?.toString() ?? '0'
      const collateral = (log.args?.collateral as string)?.toLowerCase()
      const collateralID = log.args?.collateralID?.toString() ?? '0'
      const blockNumber = Number(log.blockNumber)
      const txHash = log.transactionHash

      allEvents.push({
        user,
        loanID,
        borrowAmount,
        interestAmount,
        expiration,
        collateral,
        collateralID,
        block: blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        txHash
      })
    }

    await sleep(5)
  }

  // Save all events to database
  if (allEvents.length > 0) {
    await db.saveLoanEvents(allEvents)
    console.log(`\nSaved ${allEvents.length} Borrow events to database`)
  } else {
    console.log(`\nNo Borrow events found`)
  }

  // Update the latest processed block
  await db.updateLatestLoanBlock(toBlock)
  console.log(`Updated latest processed loan block to ${toBlock}`)

  await db.close()
  console.log(`Completed loan event ingestion for blocks ${fromBlock} to ${toBlock}`)
}

async function main() {
  try {
    const currentBlock = await client.getBlockNumber()
    const toBlock = Number(currentBlock)

    console.log(`Starting loan event ingestion from block ${lendingContractDeployBlock} to ${toBlock}`)

    await ingestLoanEvents(lendingContractDeployBlock, toBlock)
    console.log('Loan event ingestion completed successfully')
  } catch (error) {
    console.error('Loan ingestion failed:', error)
    process.exit(1)
  }
}

main()
