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
  const anyoneDomains = await UNSDomain.find({
    owner: { $exists: false },
    tld
  })
  logger.info(
    `Found [${anyoneDomains.length}] [${tld}] domains without owners.`
  )
  if (anyoneDomains.length === 0) {
    logger.info(`No [${tld}] domains found without owners.`)
    return
  }

  logger.info(`Resolving owners for [${anyoneDomains.length}] domains...`)
  const tokenOwnersByTokenId = (await Promise.all(
      anyoneDomains.map(
      async domain => unsService.getOwnerOfToken(domain.tokenId)
    )
  )).reduce(
    (obj, item) => item ? (obj[item.tokenId] = item.owner, obj) : obj,
    {} as Record<string, string>
  )

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
