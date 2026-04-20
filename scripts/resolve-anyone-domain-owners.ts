import 'dotenv/config'
import mongoose from 'mongoose'
import { logger } from '../src/util/logger'
import { UNSDomain } from '../src/schema/uns-domain.schema'
import { TransferEvent } from '../src/schema/transfer-event.schema'
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

  // Step 1: Apply unprocessed Transfer events (zero RPC calls)
  await applyTransferEvents(tld)

  // Step 2: Resolve owners for domains that still have no owner (new domains)
  await resolveNewDomainOwners(unsService, tld)
}

async function applyTransferEvents(tld: string) {
  const unprocessedTransfers = await TransferEvent.find({ isProcessed: false })
  logger.info(
    `Found [${unprocessedTransfers.length}] unprocessed Transfer events.`
  )

  if (unprocessedTransfers.length === 0) {
    return
  }

  let applied = 0
  for (const transfer of unprocessedTransfers) {
    const domain = await UNSDomain.findOne({
      tokenId: transfer.tokenId,
      tld
    })

    if (domain) {
      domain.owner = transfer.to
      domain.ownerUpdatedAtBlock = transfer.blockNumber
      await domain.save()
      applied++
      logger.info(
        `Applied Transfer event: domain [${domain.name}] ` +
          `ownership → [${transfer.to}] at block [${transfer.blockNumber}]`
      )
    }

    transfer.isProcessed = true
    await transfer.save()
  }

  logger.info(
    `Applied [${applied}] Transfer events to .anyone domains ` +
      `(${unprocessedTransfers.length} total processed).`
  )
}

async function resolveNewDomainOwners(
  unsService: UnstoppableDomainsService,
  tld: string
) {
  const domainsWithoutOwner = await UNSDomain.find({
    tld,
    $or: [
      { owner: { $exists: false } },
      { owner: null },
      { owner: '' }
    ]
  })

  logger.info(
    `Found [${domainsWithoutOwner.length}] [${tld}] domains without an owner.`
  )

  if (domainsWithoutOwner.length === 0) {
    logger.info('All domains already have owners. Nothing to resolve.')
    return
  }

  const batchSize = 5
  const delayBetweenBatches = 5000

  for (let i = 0; i < domainsWithoutOwner.length; i += batchSize) {
    const batch = domainsWithoutOwner.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(domainsWithoutOwner.length / batchSize)

    logger.info(
      `Processing batch ${batchNumber}/${totalBatches} ` +
        `(${batch.length} domains)...`
    )

    try {
      const batchResults = await Promise.all(
        batch.map(async domain =>
          unsService.getOwnerOfToken(domain.tokenId)
        )
      )

      for (const result of batchResults) {
        if (result) {
          const domain = domainsWithoutOwner.find(
            d => d.tokenId === result.tokenId
          )
          if (domain) {
            domain.owner = result.owner
            await domain.save()
            logger.info(
              `Resolved owner for domain [${domain.name}] ` +
                `with token ID [${domain.tokenId}]: [${result.owner}]`
            )
          }
        }
      }

      logger.info(
        `Batch ${batchNumber}/${totalBatches} completed successfully`
      )

      if (i + batchSize < domainsWithoutOwner.length) {
        logger.info(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    } catch (error) {
      logger.error(
        `Error processing batch ${batchNumber}/${totalBatches}:`,
        error
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
