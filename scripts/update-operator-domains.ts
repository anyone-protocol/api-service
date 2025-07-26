import 'dotenv/config'
import axios from 'axios'
import { ethers } from 'ethers'
import fs from 'fs/promises'
import { logger } from './util/logger'
import { readOperatorAddressesFromFile } from './util/operator-registry'

type MatchingDomain = {
  tokenId: string
  name: string
}

type DomainWithOwner = MatchingDomain & {
  owner: string
}

const abi = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event NewKey(uint256 indexed tokenId, string indexed keyIndex, string key)',
  'function ownerOf(uint256 tokenId) view returns (address)'
]

async function updateOperatorDomains() {
  const unsRegistryAddress = process.env.UNS_REGISTRY_ADDRESS || ''
  if (!unsRegistryAddress) {
    throw new Error('Missing UNS_REGISTRY_ADDRESS!')
  }
  logger.info(`Using UNS registry address [${unsRegistryAddress}]`)

  const unsMetadataUrl = process.env.UNS_METADATA_URL || ''
  if (!unsMetadataUrl) {
    throw new Error('Missing UNS_METADATA_URL!')
  }
  logger.info(`Using UNS metadata URL [${unsMetadataUrl}]`)

  const unsTld = process.env.UNS_TLD || ''
  if (!unsTld) {
    throw new Error('Missing UNS_TLD!')
  }
  logger.info(`Using UNS TLD [${unsTld}]`)

  const unsStartBlock = Number.parseInt(process.env.UNS_START_BLOCK || '')
  if (!unsStartBlock || isNaN(unsStartBlock)) {
    throw new Error('Missing or invalid UNS_START_BLOCK!')
  }
  logger.info(`Using UNS start block [${unsStartBlock}]`)

  const jsonRpcUrl = process.env.EVM_JSON_RPC || ''
  if (!jsonRpcUrl) {
    throw new Error('Missing EVM_JSON_RPC!')
  }
  logger.info(`Using JSON-RPC URL [${jsonRpcUrl}]`)

  let dataDir = process.env.DATA_DIR
  if (!dataDir) {
    logger.warn(`DATA_DIR is not set!  Falling back to default!`)
    dataDir = `${process.cwd()}/data`
  }
  logger.info(`Using data directory [${dataDir}]`)

  const provider = new ethers.JsonRpcProvider(jsonRpcUrl)
  const contract = new ethers.Contract(unsRegistryAddress, abi, provider)

  const newKeyFilter = contract.filters.NewKey()
  logger.info(
    `Querying NewKey events from block [${unsStartBlock}]`
  )
  const newKeyEvents = await contract.queryFilter(newKeyFilter, unsStartBlock)
  logger.info(
    `Found [${newKeyEvents.length}] NewKey events ` +
      `starting from block ${unsStartBlock}.`
  )
  const newKeyEventsSettingMetadata = newKeyEvents
    .filter(event => event instanceof ethers.EventLog)
    .filter(event => event.args.key === 'ipfs.html.value')
  logger.info(
    `Found [${newKeyEventsSettingMetadata.length}] NewKey events ` +
      `with key [ipfs.html.value].`
  )

  const matchingDomains: MatchingDomain[] = []
  for (const event of newKeyEventsSettingMetadata) {
    const sleepTime = 2000
    logger.info(
      `Sleeping for ${sleepTime}ms before processing next NewKey event`
    )
    await new Promise((resolve) => setTimeout(resolve, sleepTime))

    if (!(event instanceof ethers.EventLog)) {
      continue
    }
    const { tokenId, keyIndex, key } = event.args || {}
    if (tokenId) {
      logger.info(
        `NewKey event: Token ID [${tokenId.toString()}], ` +
          `Key Index [${JSON.stringify(keyIndex)}], Key [${key}]`
      )
      const result = await axios.get(`${unsMetadataUrl}/${tokenId.toString()}`)
      if (result.status === 200) {
        const metadata = result.data
        if (metadata && metadata.name) {
          const name = metadata.name
          if (name.endsWith(`.${unsTld}`)) {
            logger.info(
              `Found [${unsTld}] domain [${name}] ` +
                `with token ID [${tokenId.toString()}]`
            )
            matchingDomains.push({ tokenId: tokenId.toString(), name })
          } else {
            logger.warn(
              `Skipping domain [${name}] with token ID [${tokenId.toString()}]`
            )
          }
        } else {
          logger.warn(
            `No domain found in metadata for token ID [${tokenId.toString()}]`
          )
        }
      } else {
        logger.error(
          `Failed to fetch metadata for token ID [${tokenId.toString()}]: ` +
            `HTTP status ${result.status}`
        )
      }
    } else {
      logger.warn('NewKey event with missing args:', event)
    }
  }
  logger.info(
    `Found [${matchingDomains.length}] matching domains with TLD [${unsTld}].`
  )

  logger.info(`Checking ownership of matching domains`)
  const domainsWithOwners: DomainWithOwner[] = []
  for (const domain of matchingDomains) {
    const sleepTime = 2000
    logger.info(`Sleeping for ${sleepTime}ms before processing next domain`)
    await new Promise((resolve) => setTimeout(resolve, sleepTime))

    const { tokenId, name } = domain
    logger.info(
      `Checking ownership for domain [${name}] with token ID [${tokenId}]...`
    )
    
    const owner = await contract.ownerOf(BigInt(tokenId))
    logger.info(
      `Owner of domain [${name}] with token ID [${tokenId}]: [${owner}]`
    )

    domainsWithOwners.push({ tokenId, name, owner })
  }
  logger.info(
    `Found [${domainsWithOwners.length}] domains with owners.`
  )

  logger.info(
    `Saving domains with owners to file [${dataDir}/operator-domains.json]...`
  )
  await fs.writeFile(
    `${dataDir}/operator-domains.json`,
    JSON.stringify(domainsWithOwners, null, 2)
  )
  logger.info(
    `Saved domains with owners to file [${dataDir}/operator-domains.json].`
  )
}

updateOperatorDomains()
  .then(() => {
    logger.info('Operator addresses updated successfully!')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Error updating operator addresses:', error)
    process.exit(1)
  })
