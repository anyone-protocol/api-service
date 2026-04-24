import 'reflect-metadata'
import { DataSource } from 'typeorm'

import { UnsTokenEntity } from './schema/uns-token.entity'
import { logger } from './util/logger'

const DB_HOST = process.env.DB_HOST || ''
const DB_PORT = parseInt(process.env.DB_PORT || '5432')
const DB_USER = process.env.DB_USER || ''
const DB_PASS = process.env.DB_PASS || ''
const DB_NAME = process.env.DB_NAME || ''

export const unsIndexerDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT,
  username: DB_USER,
  password: DB_PASS,
  database: DB_NAME,
  entities: [UnsTokenEntity],
  synchronize: false,
  migrationsRun: false,
  logging: false
})

let initializePromise: Promise<DataSource> | null = null

export async function initUnsIndexerDataSource(): Promise<DataSource> {
  if (unsIndexerDataSource.isInitialized) {
    return unsIndexerDataSource
  }

  const missing = [
    ['DB_HOST', DB_HOST],
    ['DB_USER', DB_USER],
    ['DB_NAME', DB_NAME]
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(
      `Missing UNS indexer DB env vars: ${missing.join(', ')}`
    )
  }
  if (isNaN(DB_PORT)) {
    throw new Error(`Invalid DB_PORT [${process.env.DB_PORT}]`)
  }

  if (!initializePromise) {
    logger.info(
      `Initializing UNS indexer Postgres data source at ` +
        `[${DB_HOST}:${DB_PORT}/${DB_NAME}]...`
    )
    initializePromise = unsIndexerDataSource
      .initialize()
      .then(ds => {
        logger.info('UNS indexer Postgres data source initialized.')
        return ds
      })
      .catch(error => {
        initializePromise = null
        throw error
      })
  }

  return initializePromise
}

