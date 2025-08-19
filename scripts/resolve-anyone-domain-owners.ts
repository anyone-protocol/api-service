import 'dotenv/config'
import mongoose from 'mongoose'
import { logger } from '../src/util/logger'
import { UNSDomain } from '../src/schema/uns-domain.schema'
import { UnstoppableDomainsService } from '../src/unstoppable-domains.service'

async function resolveAnyoneDomainOwners() {
  const tld = 'anyone'
  const mongodbUri = process.env.MONGO_URI
  if (!mongodbUri) {
    throw new Error('Missing MONGO_URI!')
  }
  logger.info(`Connecting to MongoDB at [${mongodbUri}]`)
  await mongoose.connect(mongodbUri)
  const unsService = new UnstoppableDomainsService()

  logger.info('Resolving anyone domain owners from UNSDomain collection...')
  const anyoneDomains = await UNSDomain.find({ tld })
  logger.info(
    `Found [${anyoneDomains.length}] [${tld}] domains.`
  )
  if (anyoneDomains.length === 0) {
    logger.info(`No [${tld}] domains found.`)
    return
  }

  logger.info(`Resolving owners for [${anyoneDomains.length}] domains...`)

  // Batch the requests to avoid rate limiting
  const batchSize = 10 // Conservative batch size for Infura API
  const delayBetweenBatches = 1000 // 1 second delay between batches
  const tokenOwnersByTokenId: Record<string, string> = {}

  for (let i = 0; i < anyoneDomains.length; i += batchSize) {
    const batch = anyoneDomains.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(anyoneDomains.length / batchSize)

    logger.info(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} domains)...`)

    try {
      const batchResults = await Promise.all(
        batch.map(async domain => unsService.getOwnerOfToken(domain.tokenId))
      )

      // Add successful results to the map
      batchResults.forEach(result => {
        if (result) {
          tokenOwnersByTokenId[result.tokenId] = result.owner
        }
      })

      logger.info(`Batch ${batchNumber}/${totalBatches} completed successfully`)

      // Add delay between batches (except for the last batch)
      if (i + batchSize < anyoneDomains.length) {
        logger.info(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    } catch (error) {
      logger.error(`Error processing batch ${batchNumber}/${totalBatches}:`, error)
      // Continue with next batch instead of failing completely
    }
  }

  for (const anyoneDomain of anyoneDomains) {
    const owner = tokenOwnersByTokenId[anyoneDomain.tokenId]
    if (owner) {
      anyoneDomain.owner = owner
      await anyoneDomain.save()
      logger.info(
        `Updated owner for domain [${anyoneDomain.name}] ` +
        `with token ID [${anyoneDomain.tokenId}]: [${anyoneDomain.owner}]`
      )
    } else {
      logger.warn(
        `No owner found for domain [${anyoneDomain.name}] ` +
        `with token ID [${anyoneDomain.tokenId}].`
      )
    }
  }
}

resolveAnyoneDomainOwners()
  .then(() => {
    logger.info('Anyone domain owners resolution completed successfully.')
    process.exit(0)
  })
  .catch(err => {
    logger.error('Error resolving anyone domain owners:', err)
    process.exit(1)
  })
