import { initUnsIndexerDataSource, unsIndexerDataSource } from './data-source'
import { UnsTokenEntity } from './schema/uns-token.entity'
import { logger } from './util/logger'

export interface AnyoneDomain {
  tokenId: string
  name: string
  owner: string
  tld: 'anyone'
}

export class UnsTokenQueryService {
  private readonly cacheTtlSeconds: number
  private cacheTimestamp: number = 0
  private cachedDomains: AnyoneDomain[] | null = null

  constructor() {
    logger.info('Initializing UnsTokenQueryService...')

    const rawTtl = process.env.UNS_DOMAINS_CACHE_TTL_SECONDS
    const parsedTtl = parseInt(rawTtl || '30')
    if (isNaN(parsedTtl) || parsedTtl < 0) {
      this.cacheTtlSeconds = 30
      logger.warn(
        `Invalid UNS_DOMAINS_CACHE_TTL_SECONDS [${rawTtl}]. ` +
          `Using default value of 30.`
      )
    } else {
      this.cacheTtlSeconds = parsedTtl
    }
    logger.info(
      `Using UNS domains cache TTL of [${this.cacheTtlSeconds}] seconds`
    )
  }

  async listAnyoneDomains(): Promise<AnyoneDomain[]> {
    const now = Date.now()
    const cacheAge = (now - this.cacheTimestamp) / 1000
    if (this.cachedDomains && cacheAge < this.cacheTtlSeconds) {
      logger.info(
        `Using cached anyone domains (age: ${cacheAge.toFixed(2)}s, ` +
          `count: ${this.cachedDomains.length})`
      )
      return this.cachedDomains
    }

    try {
      await initUnsIndexerDataSource()
      const repo = unsIndexerDataSource.getRepository(UnsTokenEntity)
      const rows = await repo.find({
        select: ['tokenId', 'name', 'owner']
      })
      const domains: AnyoneDomain[] = rows.map(row => ({
        tokenId: row.tokenId,
        name: row.name,
        owner: row.owner,
        tld: 'anyone'
      }))
      this.cachedDomains = domains
      this.cacheTimestamp = now
      logger.info(
        `Fetched [${domains.length}] anyone domains from UNS indexer DB.`
      )
      return domains
    } catch (error: Error | any) {
      logger.error(
        `Failed to fetch anyone domains from UNS indexer DB: ${error.message}`,
        error
      )
      if (this.cachedDomains) {
        logger.warn('Returning stale cached anyone domains due to DB error.')
        return this.cachedDomains
      }
      return []
    }
  }
}
