import 'dotenv/config'
import mongoose from 'mongoose'
import { NewKeyEvent } from '../src/schema/new-key-event.schema'
import { TransferEvent } from '../src/schema/transfer-event.schema'
import { UNSDomain } from '../src/schema/uns-domain.schema'
import { UnstoppableDomainsService } from '../src/unstoppable-domains.service'
import { logger } from '../src/util/logger'
import {
  DiscoverNewKeyEventsState
} from '../src/schema/discover-new-key-events-state.schema'
import { ethers } from 'ethers'

async function discoverNewKeyEvents() {
  const mongodbUri = process.env.MONGO_URI
  if (!mongodbUri) {
    throw new Error('Missing MONGO_URI!')
  }
  const jsonRpcUrl = process.env.JSON_RPC_URL || ''
  if (!jsonRpcUrl) {
    throw new Error('Missing JSON_RPC_URL!')
  }
  logger.info(`Using JSON-RPC URL [${jsonRpcUrl}]`)
  console.log(`Connecting to MongoDB at [${mongodbUri}]`)
  await mongoose.connect(mongodbUri)
  const provider = new ethers.JsonRpcProvider(jsonRpcUrl)
  const unsService = new UnstoppableDomainsService()
  const fromBlock = await getLastSafeCompleteBlockNumber()
  const currentBlock = await provider.getBlockNumber()
  logger.info(
    `Starting discovery from block [${fromBlock}] to [${currentBlock}]`
  )
  const newKeyEvents = await unsService.queryNewKeyEvents(
    fromBlock,
    currentBlock
  )

  if (newKeyEvents.length === 0) {
    logger.info('No new key events found.')
    return
  }

  const existingNewKeyEvents = (await NewKeyEvent.find()).map(
    event => event.tokenId
  )

  logger.info(`Found ${newKeyEvents.length} new key events.`)
  const newKeyEventDocuments = newKeyEvents.map(event => {
    return new NewKeyEvent({
      eventName: 'NewKeyEvent',
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      transactionHash: event.transactionHash,
      tokenId: event.args.tokenId,
      keyIndex: event.args.keyIndex?.toString(),
      key: event.args.key
    })
  }).filter(event => !existingNewKeyEvents.includes(event.tokenId))
  logger.info(
    `Found ${newKeyEventDocuments.length} after filtering on duplicate tokenIds`
  )

  await NewKeyEvent.insertMany(newKeyEventDocuments)
  logger.info(`Saved ${newKeyEventDocuments.length} new key events to MongoDB.`)

  // Query Transfer events for known .anyone domains in same block range
  await discoverTransferEvents(unsService, fromBlock, currentBlock)

  await setLastSafeCompleteBlockNumber(currentBlock)
  logger.info(
    `Updated last safe complete block number to [${currentBlock}].`
  )
}

async function discoverTransferEvents(
  unsService: UnstoppableDomainsService,
  fromBlock: number,
  toBlock: number
) {
  const knownDomains = await UNSDomain.find(
    { tld: 'anyone' },
    { tokenId: 1 }
  )
  const knownTokenIds = new Set(knownDomains.map(d => d.tokenId))
  logger.info(
    `Querying Transfer events for [${knownTokenIds.size}] known .anyone domains`
  )

  if (knownTokenIds.size === 0) {
    logger.info('No known .anyone domains yet, skipping Transfer event query.')
    return
  }

  const transferEvents = await unsService.queryTransferEvents(
    fromBlock,
    toBlock,
    knownTokenIds
  )

  if (transferEvents.length === 0) {
    logger.info('No Transfer events found for known .anyone domains.')
    return
  }

  const existingTransferHashes = new Set(
    (await TransferEvent.find(
      {},
      { transactionHash: 1, tokenId: 1 }
    )).map(e => `${e.transactionHash}-${e.tokenId}`)
  )

  const transferDocs = transferEvents
    .map(event => new TransferEvent({
      blockNumber: event.blockNumber,
      blockHash: event.blockHash,
      transactionHash: event.transactionHash,
      tokenId: event.args.tokenId.toString(),
      from: event.args.from,
      to: event.args.to
    }))
    .filter(doc => !existingTransferHashes.has(
      `${doc.transactionHash}-${doc.tokenId}`
    ))

  if (transferDocs.length > 0) {
    await TransferEvent.insertMany(transferDocs)
    logger.info(
      `Saved [${transferDocs.length}] Transfer events to MongoDB.`
    )
  } else {
    logger.info('All Transfer events already recorded, nothing new to save.')
  }
}

async function getLastSafeCompleteBlockNumber(): Promise<number> {
  const state = await DiscoverNewKeyEventsState
    .findOne({}, { lastSafeCompleteBlock: 1 })

  logger.info(`Got last safe complete block state: ${JSON.stringify(state)}`)

  if (state && state.lastSafeCompleteBlock) {
    return state.lastSafeCompleteBlock
  }

  logger.info(
    'No last safe complete block found, using falling back to ' +
      'UNS_START_BLOCK.'
  )
  const unsStartBlock = Number.parseInt(process.env.UNS_START_BLOCK || '')
  if (isNaN(unsStartBlock) || unsStartBlock < 0) {
    throw new Error('Invalid UNS_START_BLOCK!')
  }

  return unsStartBlock
}

async function setLastSafeCompleteBlockNumber(blockNumber: number) {
  let state = await DiscoverNewKeyEventsState.findOne(
    {},
    { lastSafeCompleteBlock : 1 }
  )
  if (!state) {
    logger.info(
      `No existing state found, creating new state with block number ` +
        `[${blockNumber}].`
    )
    state = new DiscoverNewKeyEventsState({
      lastSafeCompleteBlock: blockNumber
    })
    state.lastSafeCompleteBlock = blockNumber
    await state.save()
  }
  await DiscoverNewKeyEventsState.updateMany(
    {},
    { lastSafeCompleteBlock: blockNumber },
    { upsert: true }
  )
  logger.info(`Set last safe complete block number to [${blockNumber}].`)
}

discoverNewKeyEvents()
  .then(() => {
    logger.info('New key events discovery completed successfully.')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Error discovering new key events:', error)
    process.exit(1)
  })
