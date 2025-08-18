import 'dotenv/config'
import mongoose from 'mongoose'
import { logger } from '../src/util/logger'
import { UnstoppableDomainsService } from '../src/unstoppable-domains.service'
import { NewKeyEvent } from '../src/schema/new-key-event.schema'
import { UNSDomain } from '../src/schema/uns-domain.schema'

async function discoverAnyoneDomains() {
  const mongodbUri = process.env.MONGO_URI
  if (!mongodbUri) {
    throw new Error('Missing MONGO_URI!')
  }
  console.log(`Connecting to MongoDB at [${mongodbUri}]`)
  await mongoose.connect(mongodbUri)
  const unsService = new UnstoppableDomainsService()

  logger.info(
    'Starting discovery of anyone domains from unprocessed NewKey events...'
  )
  const newKeyEvents = await NewKeyEvent.find({ isProcessed: false })
  logger.info(`Found ${newKeyEvents.length} unprocessed NewKey events.`)

  if (newKeyEvents.length === 0) {
    logger.info('No unprocessed NewKey events found.')
    return
  }

  for (let i = 0; i < newKeyEvents.length; i++) {
    const sleepTime = 1000
    logger.info(
      `Sleeping for ${sleepTime}ms before processing NewKey event ` +
        `[${i + 1}/${newKeyEvents.length}]`
    )
    await new Promise(resolve => setTimeout(resolve, sleepTime))

    const event = newKeyEvents[i]
    logger.info(
      `Processing NewKey event ` +
        `[${event._id}][${i + 1}/${newKeyEvents.length}] ` +
        `for token ID [${event.tokenId}]`
    )

    const metadata = await unsService.getUnsMetadata(event.tokenId)
    if (!metadata) {
      logger.warn(
        `No metadata found for token ID [${event.tokenId}]. Skipping...`
      )
      continue
    }

    if (!metadata.name.endsWith(`.${unsService.unsTld}`)) {
      logger.warn(
        `Domain [${metadata.name}] does not end with TLD ` +
          `[${unsService.unsTld}]. Skipping...`
      )
      event.isProcessed = true
      await event.save()
      logger.info(`Marked NewKey event [${event._id}] as processed.`)
      continue
    }

    const existingDomain = await UNSDomain.findOne({ tokenId: event.tokenId })

    if (!existingDomain) {
      const newDomain = new UNSDomain({
        tokenId: event.tokenId,
        name: metadata.name
      })
      await newDomain.save()
      logger.info(
        `Saved domain [${metadata.name}] with token ID [${event.tokenId}]`
      )
    } else {
      logger.info(
        `Skipping existing domain [${existingDomain.name}] ` +
          `with token ID [${event.tokenId}]`
      )
    }

    event.isProcessed = true
    await event.save()
    logger.info(`Marked NewKey event [${event._id}] as processed.`)
  }
}

discoverAnyoneDomains()
  .then(() => {
    logger.info('Anyone domains discovery completed successfully.')
    process.exit(0)
  })
  .catch(err => {
    logger.error('Error discovering anyone domains:', err)
    process.exit(1)
  })
