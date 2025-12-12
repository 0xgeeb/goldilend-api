import dotenv from 'dotenv'
import { createPublicClient, http, parseAbiItem, type Chain } from 'viem'
import { DatabaseService, LoanEvent, LoanRepayEvent, LoanLiquidateEvent, LoanRenewEvent } from './database'

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
const lendingContractAddress = '0x80D480Ad0c48A769eD481fA8a30B7c5DDABD2FDf'
const lendingContractDeployBlock = 12941806

const step = 10000

async function ingestLoanEvents(fromBlock: number, toBlock: number) {
  console.log(`Ingesting Loan events from block ${fromBlock} to ${toBlock}`)
  console.log(`Contract: ${lendingContractAddress}`)

  const db = new DatabaseService()
  const borrowEvents: LoanEvent[] = []
  const repayEvents: LoanRepayEvent[] = []
  const liquidateEvents: LoanLiquidateEvent[] = []
  const renewEvents: LoanRenewEvent[] = []

  // Collect events in batches
  for (let from = Math.max(fromBlock, lendingContractDeployBlock); from <= toBlock; from += step) {
    const to = Math.min(from + step - 1, toBlock)

    // Collect Borrow events
    const borrowLogs = await client.getLogs({
      address: lendingContractAddress as `0x${string}`,
      event: parseAbiItem('event Borrow(address indexed user, uint256 loanID, uint256 borrowAmount, uint256 interestAmount, uint256 expiration, address collateral, uint256 collateralID)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    if (borrowLogs.length > 0) {
      console.log(`  Blocks ${from}-${to}: Found ${borrowLogs.length} Borrow events`)
    }

    for (const log of borrowLogs) {
      const user = (log.args?.user as string)?.toLowerCase()
      const loanID = log.args?.loanID?.toString() ?? '0'
      const borrowAmount = log.args?.borrowAmount?.toString() ?? '0'
      const interestAmount = log.args?.interestAmount?.toString() ?? '0'
      const expiration = log.args?.expiration?.toString() ?? '0'
      const collateral = (log.args?.collateral as string)?.toLowerCase()
      const collateralID = log.args?.collateralID?.toString() ?? '0'
      const blockNumber = Number(log.blockNumber)
      const txHash = log.transactionHash

      borrowEvents.push({
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

    // Collect Repay events
    const repayLogs = await client.getLogs({
      address: lendingContractAddress as `0x${string}`,
      event: parseAbiItem('event Repay(address indexed user, uint256 userLoanId, uint256 amount)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    if (repayLogs.length > 0) {
      console.log(`  Blocks ${from}-${to}: Found ${repayLogs.length} Repay events`)
    }

    for (const log of repayLogs) {
      const user = (log.args?.user as string)?.toLowerCase()
      const userLoanId = log.args?.userLoanId?.toString() ?? '0'
      const amount = log.args?.amount?.toString() ?? '0'
      const blockNumber = Number(log.blockNumber)
      const txHash = log.transactionHash

      repayEvents.push({
        user,
        userLoanId,
        amount,
        block: blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        txHash
      })
    }

    // Collect Liquidation events
    const liquidateLogs = await client.getLogs({
      address: lendingContractAddress as `0x${string}`,
      event: parseAbiItem('event Liquidation(address indexed loanOriginator, address indexed liquidator, uint256 amount, uint256 loanId)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    if (liquidateLogs.length > 0) {
      console.log(`  Blocks ${from}-${to}: Found ${liquidateLogs.length} Liquidation events`)
    }

    for (const log of liquidateLogs) {
      const loanOriginator = (log.args?.loanOriginator as string)?.toLowerCase()
      const liquidator = (log.args?.liquidator as string)?.toLowerCase()
      const amount = log.args?.amount?.toString() ?? '0'
      const loanId = log.args?.loanId?.toString() ?? '0'
      const blockNumber = Number(log.blockNumber)
      const txHash = log.transactionHash

      liquidateEvents.push({
        loanOriginator,
        liquidator,
        amount,
        loanId,
        block: blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        txHash
      })
    }

    // Collect Renew events
    const renewLogs = await client.getLogs({
      address: lendingContractAddress as `0x${string}`,
      event: parseAbiItem('event Renew(address indexed user, uint256 loanId, uint256 newBorrowAmount, uint256 newInterest, uint256 newDuration)'),
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    if (renewLogs.length > 0) {
      console.log(`  Blocks ${from}-${to}: Found ${renewLogs.length} Renew events`)
    }

    for (const log of renewLogs) {
      const user = (log.args?.user as string)?.toLowerCase()
      const loanId = log.args?.loanId?.toString() ?? '0'
      const newBorrowAmount = log.args?.newBorrowAmount?.toString() ?? '0'
      const newInterest = log.args?.newInterest?.toString() ?? '0'
      const newDuration = log.args?.newDuration?.toString() ?? '0'
      const blockNumber = Number(log.blockNumber)
      const txHash = log.transactionHash

      // Fetch block timestamp to calculate new end date
      const block = await client.getBlock({ blockNumber: log.blockNumber })
      const blockTimestamp = Number(block.timestamp)

      renewEvents.push({
        user,
        loanId,
        newBorrowAmount,
        newInterest,
        newDuration,
        block: blockNumber,
        timestamp: blockTimestamp,
        txHash
      })
    }

    await sleep(100)
  }

  // Save all events to database
  if (borrowEvents.length > 0) {
    await db.saveLoanEvents(borrowEvents)
    console.log(`\nSaved ${borrowEvents.length} Borrow events to database`)
  }

  if (repayEvents.length > 0) {
    await db.saveLoanRepayEvents(repayEvents)
    console.log(`Saved ${repayEvents.length} Repay events to database`)
  }

  if (liquidateEvents.length > 0) {
    await db.saveLoanLiquidateEvents(liquidateEvents)
    console.log(`Saved ${liquidateEvents.length} Liquidation events to database`)
  }

  if (renewEvents.length > 0) {
    await db.saveLoanRenewEvents(renewEvents)
    console.log(`Saved ${renewEvents.length} Renew events to database`)
  }

  if (borrowEvents.length === 0 && repayEvents.length === 0 && liquidateEvents.length === 0 && renewEvents.length === 0) {
    console.log(`\nNo loan events found`)
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
