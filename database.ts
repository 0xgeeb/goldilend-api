import { Pool } from 'pg'

export interface NFTTransferEvent {
  id?: number
  collectionAddress: string
  from: string
  to: string
  tokenId: string
  block: number
  timestamp: number
}

export interface LoanEvent {
  id?: number
  user: string
  loanID: string
  borrowAmount: string
  interestAmount: string
  expiration: string
  collateral: string
  collateralID: string
  block: number
  timestamp: number
  txHash?: string
  repaidAmount?: string
}

export interface LoanRepayEvent {
  id?: number
  user: string
  userLoanId: string
  amount: string
  block: number
  timestamp: number
  txHash?: string
}

export interface LoanLiquidateEvent {
  id?: number
  loanOriginator: string
  liquidator: string
  amount: string
  loanId: string
  block: number
  timestamp: number
  txHash?: string
}

export class DatabaseService {
  private pool: Pool

  constructor() {
    console.log('Initializing database connection...')
    console.log('DB_HOST:', process.env.DB_HOST || 'localhost')
    console.log('DB_PORT:', process.env.DB_PORT || '5432')
    console.log('DB_NAME:', process.env.DB_NAME || 'goldilend_api')
    console.log('DB_USER:', process.env.DB_USER || 'postgres')

    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'goldilend_api',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

    this.initDatabase()
  }

  private async initDatabase(): Promise<void> {
    try {
      console.log('Connecting to database...')
      const client = await this.pool.connect()
      console.log('Connected to database successfully')

      // Create table for NFT transfer events
      const createTransferTableSQL = `
        CREATE TABLE IF NOT EXISTS nft_transfer_events (
          id SERIAL PRIMARY KEY,
          collection_address VARCHAR(42) NOT NULL,
          from_address VARCHAR(42) NOT NULL,
          to_address VARCHAR(42) NOT NULL,
          token_id TEXT NOT NULL,
          block BIGINT NOT NULL,
          timestamp BIGINT NOT NULL
        )
      `

      // Create table for tracking latest processed block
      const createLatestBlockTableSQL = `
        CREATE TABLE IF NOT EXISTS latest_block (
          id SERIAL PRIMARY KEY,
          latest_block BIGINT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      // Create table for loan events
      const createLoanTableSQL = `
        CREATE TABLE IF NOT EXISTS loan_events (
          id SERIAL PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          loan_id TEXT NOT NULL,
          borrow_amount TEXT NOT NULL,
          interest_amount TEXT NOT NULL,
          expiration TEXT NOT NULL,
          collateral_address VARCHAR(42) NOT NULL,
          collateral_id TEXT NOT NULL,
          block BIGINT NOT NULL,
          timestamp BIGINT NOT NULL,
          tx_hash VARCHAR(66)
        )
      `

      // Create table for loan repay events
      const createLoanRepayTableSQL = `
        CREATE TABLE IF NOT EXISTS loan_repay_events (
          id SERIAL PRIMARY KEY,
          user_address VARCHAR(42) NOT NULL,
          user_loan_id TEXT NOT NULL,
          amount TEXT NOT NULL,
          block BIGINT NOT NULL,
          timestamp BIGINT NOT NULL,
          tx_hash VARCHAR(66)
        )
      `

      // Create table for loan liquidation events
      const createLoanLiquidateTableSQL = `
        CREATE TABLE IF NOT EXISTS loan_liquidate_events (
          id SERIAL PRIMARY KEY,
          loan_originator VARCHAR(42) NOT NULL,
          liquidator VARCHAR(42) NOT NULL,
          amount TEXT NOT NULL,
          loan_id TEXT NOT NULL,
          block BIGINT NOT NULL,
          timestamp BIGINT NOT NULL,
          tx_hash VARCHAR(66)
        )
      `

      // Create table for tracking latest processed loan block
      const createLatestLoanBlockTableSQL = `
        CREATE TABLE IF NOT EXISTS latest_loan_block (
          id SERIAL PRIMARY KEY,
          latest_block BIGINT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      console.log('Creating tables...')
      await client.query(createTransferTableSQL)
      await client.query(createLatestBlockTableSQL)
      await client.query(createLoanTableSQL)
      await client.query(createLoanRepayTableSQL)
      await client.query(createLoanLiquidateTableSQL)
      await client.query(createLatestLoanBlockTableSQL)
      console.log('Tables created successfully')

      // Create indexes for better performance
      const createIndexesSQL = [
        'CREATE INDEX IF NOT EXISTS idx_block ON nft_transfer_events(block)',
        'CREATE INDEX IF NOT EXISTS idx_collection_address ON nft_transfer_events(collection_address)',
        'CREATE INDEX IF NOT EXISTS idx_token_id ON nft_transfer_events(token_id)',
        'CREATE INDEX IF NOT EXISTS idx_from_address ON nft_transfer_events(from_address)',
        'CREATE INDEX IF NOT EXISTS idx_to_address ON nft_transfer_events(to_address)',
        'CREATE INDEX IF NOT EXISTS idx_collection_token ON nft_transfer_events(collection_address, token_id, block)',
        'CREATE INDEX IF NOT EXISTS idx_loan_user ON loan_events(user_address)',
        'CREATE INDEX IF NOT EXISTS idx_loan_id ON loan_events(loan_id)',
        'CREATE INDEX IF NOT EXISTS idx_loan_collateral ON loan_events(collateral_address, collateral_id)',
        'CREATE INDEX IF NOT EXISTS idx_loan_block ON loan_events(block)',
        'CREATE INDEX IF NOT EXISTS idx_loan_user_id ON loan_events(user_address, loan_id)',
        'CREATE INDEX IF NOT EXISTS idx_repay_user_loan ON loan_repay_events(user_address, user_loan_id)',
        'CREATE INDEX IF NOT EXISTS idx_liquidate_originator_loan ON loan_liquidate_events(loan_originator, loan_id)'
      ]

      console.log('Creating indexes...')
      for (const indexSQL of createIndexesSQL) {
        try {
          await client.query(indexSQL)
        } catch (error) {
          console.log('Index creation note:', error)
        }
      }

      client.release()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Error initializing database:', error)
      console.error('Please check your database connection settings in .env file')
      console.error('Make sure PostgreSQL is running and the database exists')
      throw error
    }
  }

  async saveTransferEvents(events: NFTTransferEvent[]): Promise<void> {
    if (events.length === 0) return

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Batch insert
      const values = events.map((event, index) => {
        const offset = index * 6
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      }).join(', ')

      const flatValues = events.flatMap(event => [
        event.collectionAddress,
        event.from,
        event.to,
        event.tokenId,
        event.block,
        event.timestamp
      ])

      const query = `
        INSERT INTO nft_transfer_events (collection_address, from_address, to_address, token_id, block, timestamp)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `

      await client.query(query, flatValues)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async updateLatestBlock(block: number): Promise<void> {
    const client = await this.pool.connect()

    try {
      // Check if a record exists
      const checkQuery = 'SELECT id FROM latest_block LIMIT 1'
      const checkResult = await client.query(checkQuery)

      if (checkResult.rows.length === 0) {
        // Insert first record
        const insertQuery = 'INSERT INTO latest_block (latest_block) VALUES ($1)'
        await client.query(insertQuery, [block])
      } else {
        // Update existing record
        const updateQuery = `
          UPDATE latest_block
          SET latest_block = GREATEST(latest_block, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `
        await client.query(updateQuery, [block, checkResult.rows[0].id])
      }
    } finally {
      client.release()
    }
  }

  async getLatestBlock(): Promise<number | null> {
    const client = await this.pool.connect()

    try {
      const query = 'SELECT latest_block FROM latest_block LIMIT 1'
      const result = await client.query(query)

      if (result.rows.length === 0) {
        return null
      }

      return parseInt(result.rows[0].latest_block)
    } finally {
      client.release()
    }
  }

  async getOwnedNFTs(userAddress: string, upToBlock?: number): Promise<Array<{ collectionAddress: string, tokenId: string }>> {
    const client = await this.pool.connect()

    try {
      const normalizedAddress = userAddress.toLowerCase()

      // Get all transfer events up to the specified block (or all if not specified)
      const query = upToBlock
        ? `
          SELECT collection_address, from_address, to_address, token_id
          FROM nft_transfer_events
          WHERE block <= $1
          ORDER BY block ASC, id ASC
        `
        : `
          SELECT collection_address, from_address, to_address, token_id
          FROM nft_transfer_events
          ORDER BY block ASC, id ASC
        `

      const result = upToBlock
        ? await client.query(query, [upToBlock])
        : await client.query(query)

      // Track current owner of each (collection, tokenId) pair
      const tokenOwners: Map<string, string> = new Map()

      result.rows.forEach((row: any) => {
        const collectionAddress = row.collection_address.toLowerCase()
        const fromAddress = row.from_address.toLowerCase()
        const toAddress = row.to_address.toLowerCase()
        const tokenId = row.token_id

        // Create unique key for collection + tokenId
        const key = `${collectionAddress}:${tokenId}`

        // Update the current owner (last recipient wins)
        tokenOwners.set(key, toAddress)
      })

      // Filter to get only tokens owned by the user
      const ownedTokens: Array<{ collectionAddress: string, tokenId: string }> = []
      tokenOwners.forEach((owner, key) => {
        if (owner === normalizedAddress) {
          const [collectionAddress, tokenId] = key.split(':', 2)
          ownedTokens.push({
            collectionAddress,
            tokenId
          })
        }
      })

      // Sort by collection address, then by token ID (as strings for huge numbers)
      return ownedTokens.sort((a, b) => {
        if (a.collectionAddress !== b.collectionAddress) {
          return a.collectionAddress.localeCompare(b.collectionAddress)
        }
        // Try numeric sort if possible, fall back to string sort
        const aNum = BigInt(a.tokenId)
        const bNum = BigInt(b.tokenId)
        if (aNum < bNum) return -1
        if (aNum > bNum) return 1
        return 0
      })
    } finally {
      client.release()
    }
  }

  async saveLoanEvents(events: LoanEvent[]): Promise<void> {
    if (events.length === 0) return

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Batch insert
      const values = events.map((event, index) => {
        const offset = index * 10
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      }).join(', ')

      const flatValues = events.flatMap(event => [
        event.user,
        event.loanID,
        event.borrowAmount,
        event.interestAmount,
        event.expiration,
        event.collateral,
        event.collateralID,
        event.block,
        event.timestamp,
        event.txHash || null
      ])

      const query = `
        INSERT INTO loan_events (user_address, loan_id, borrow_amount, interest_amount, expiration, collateral_address, collateral_id, block, timestamp, tx_hash)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `

      await client.query(query, flatValues)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async saveLoanRepayEvents(events: LoanRepayEvent[]): Promise<void> {
    if (events.length === 0) return

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Batch insert
      const values = events.map((event, index) => {
        const offset = index * 6
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      }).join(', ')

      const flatValues = events.flatMap(event => [
        event.user,
        event.userLoanId,
        event.amount,
        event.block,
        event.timestamp,
        event.txHash || null
      ])

      const query = `
        INSERT INTO loan_repay_events (user_address, user_loan_id, amount, block, timestamp, tx_hash)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `

      await client.query(query, flatValues)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async saveLoanLiquidateEvents(events: LoanLiquidateEvent[]): Promise<void> {
    if (events.length === 0) return

    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      // Batch insert
      const values = events.map((event, index) => {
        const offset = index * 7
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      }).join(', ')

      const flatValues = events.flatMap(event => [
        event.loanOriginator,
        event.liquidator,
        event.amount,
        event.loanId,
        event.block,
        event.timestamp,
        event.txHash || null
      ])

      const query = `
        INSERT INTO loan_liquidate_events (loan_originator, liquidator, amount, loan_id, block, timestamp, tx_hash)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `

      await client.query(query, flatValues)
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async updateLatestLoanBlock(block: number): Promise<void> {
    const client = await this.pool.connect()

    try {
      // Check if a record exists
      const checkQuery = 'SELECT id FROM latest_loan_block LIMIT 1'
      const checkResult = await client.query(checkQuery)

      if (checkResult.rows.length === 0) {
        // Insert first record
        const insertQuery = 'INSERT INTO latest_loan_block (latest_block) VALUES ($1)'
        await client.query(insertQuery, [block])
      } else {
        // Update existing record
        const updateQuery = `
          UPDATE latest_loan_block
          SET latest_block = GREATEST(latest_block, $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `
        await client.query(updateQuery, [block, checkResult.rows[0].id])
      }
    } finally {
      client.release()
    }
  }

  async getLatestLoanBlock(): Promise<number | null> {
    const client = await this.pool.connect()

    try {
      const query = 'SELECT latest_block FROM latest_loan_block LIMIT 1'
      const result = await client.query(query)

      if (result.rows.length === 0) {
        return null
      }

      return parseInt(result.rows[0].latest_block)
    } finally {
      client.release()
    }
  }

  async getLoansByUser(userAddress: string): Promise<LoanEvent[]> {
    const client = await this.pool.connect()

    try {
      const normalizedAddress = userAddress.toLowerCase()

      const query = `
        SELECT
          le.id, le.user_address, le.loan_id, le.borrow_amount, le.interest_amount,
          le.expiration, le.collateral_address, le.collateral_id, le.block, le.timestamp, le.tx_hash,
          COALESCE(SUM(lre.amount::NUMERIC), 0)::TEXT as repaid_amount
        FROM loan_events le
        LEFT JOIN loan_repay_events lre
          ON lre.user_address = le.user_address AND lre.user_loan_id = le.loan_id
        WHERE le.user_address = $1
        GROUP BY le.id, le.user_address, le.loan_id, le.borrow_amount, le.interest_amount,
                 le.expiration, le.collateral_address, le.collateral_id, le.block, le.timestamp, le.tx_hash
        ORDER BY le.block DESC, le.id DESC
      `

      const result = await client.query(query, [normalizedAddress])

      return result.rows.map((row: any) => ({
        id: row.id,
        user: row.user_address,
        loanID: row.loan_id,
        borrowAmount: row.borrow_amount,
        interestAmount: row.interest_amount,
        expiration: row.expiration,
        collateral: row.collateral_address,
        collateralID: row.collateral_id,
        block: parseInt(row.block),
        timestamp: parseInt(row.timestamp),
        txHash: row.tx_hash,
        repaidAmount: row.repaid_amount
      }))
    } finally {
      client.release()
    }
  }

  async getLiquidatableLoans(): Promise<LoanEvent[]> {
    const client = await this.pool.connect()

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const LOAN_GRACE_PERIOD = 86400 // 1 day in seconds
      const AUCTION_PERIOD = 172800 // 2 days in seconds

      const query = `
        SELECT DISTINCT ON (le.user_address, le.loan_id)
          le.id, le.user_address, le.loan_id, le.borrow_amount, le.interest_amount,
          le.expiration, le.collateral_address, le.collateral_id, le.block, le.timestamp, le.tx_hash
        FROM loan_events le
        WHERE
          CAST(le.expiration AS BIGINT) + $1 <= $2
          AND CAST(le.expiration AS BIGINT) + $1 + $3 > $2
          AND (
            SELECT COALESCE(SUM(CAST(lre.amount AS NUMERIC)), 0)
            FROM loan_repay_events lre
            WHERE lre.user_address = le.user_address AND lre.user_loan_id = le.loan_id
          ) < CAST(le.borrow_amount AS NUMERIC)
          AND NOT EXISTS (
            SELECT 1 FROM loan_liquidate_events lle
            WHERE lle.loan_originator = le.user_address AND lle.loan_id = le.loan_id
          )
        ORDER BY le.user_address, le.loan_id, le.block DESC
      `

      const result = await client.query(query, [LOAN_GRACE_PERIOD, currentTimestamp, AUCTION_PERIOD])

      return result.rows.map((row: any) => ({
        id: row.id,
        user: row.user_address,
        loanID: row.loan_id,
        borrowAmount: row.borrow_amount,
        interestAmount: row.interest_amount,
        expiration: row.expiration,
        collateral: row.collateral_address,
        collateralID: row.collateral_id,
        block: parseInt(row.block),
        timestamp: parseInt(row.timestamp),
        txHash: row.tx_hash
      }))
    } finally {
      client.release()
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
