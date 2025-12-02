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

      console.log('Creating tables...')
      await client.query(createTransferTableSQL)
      await client.query(createLatestBlockTableSQL)
      console.log('Tables created successfully')

      // Create indexes for better performance
      const createIndexesSQL = [
        'CREATE INDEX IF NOT EXISTS idx_block ON nft_transfer_events(block)',
        'CREATE INDEX IF NOT EXISTS idx_collection_address ON nft_transfer_events(collection_address)',
        'CREATE INDEX IF NOT EXISTS idx_token_id ON nft_transfer_events(token_id)',
        'CREATE INDEX IF NOT EXISTS idx_from_address ON nft_transfer_events(from_address)',
        'CREATE INDEX IF NOT EXISTS idx_to_address ON nft_transfer_events(to_address)',
        'CREATE INDEX IF NOT EXISTS idx_collection_token ON nft_transfer_events(collection_address, token_id, block)'
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

  async close(): Promise<void> {
    await this.pool.end()
  }
}
