import { Contract, ethers, JsonRpcProvider } from 'ethers'
import { unsRegistryAbi } from './schema/uns-registry.abi'
import { logger } from './util/logger'
import axios from 'axios'
import { UNSMetadata } from './schema/uns-metadata.interface'
import { UNSDomain } from './schema/uns-domain.schema'

export class UnstoppableDomainsService {
  private readonly jsonRpcUrl: string
  private readonly unsRegistryAddress: string
  private readonly unsMetadataUrl: string
  public readonly unsTld: string

  private provider: JsonRpcProvider
  private unsRegistryContract: Contract

  constructor() {
    logger.info('Initializing UnstoppableDomainsService...')

    this.jsonRpcUrl = process.env.JSON_RPC_URL || ''
    if (!this.jsonRpcUrl) {
      throw new Error('Missing JSON_RPC_URL!')
    }
    logger.info(`Using JSON-RPC URL [${this.jsonRpcUrl}]`)

    this.unsRegistryAddress = process.env.UNS_REGISTRY_ADDRESS || ''
    if (!this.unsRegistryAddress) {
      throw new Error('Missing UNS_REGISTRY_ADDRESS!')
    }
    logger.info(`Using UNS registry address [${this.unsRegistryAddress}]`)

    this.unsMetadataUrl = process.env.UNS_METADATA_URL || ''
    if (!this.unsMetadataUrl) {
      throw new Error('Missing UNS_METADATA_URL!')
    }
    logger.info(`Using UNS metadata URL [${this.unsMetadataUrl}]`)

    this.unsTld = process.env.UNS_TLD || ''
    if (!this.unsTld) {
      throw new Error('Missing UNS_TLD!')
    }
    logger.info(`Using UNS TLD [${this.unsTld}]`)

    this.provider = new JsonRpcProvider(this.jsonRpcUrl)
    this.unsRegistryContract = new Contract(
      this.unsRegistryAddress,
      unsRegistryAbi,
      this.provider
    )

    logger.info('UnstoppableDomainsService initialized.')
  }

  async queryNewKeyEvents(
    from: ethers.BlockTag,
    to?: ethers.BlockTag
  ): Promise<ethers.EventLog[]> {
    const filter = this.unsRegistryContract.filters.NewKey()
    logger.info(`Querying NewKey events from block [${from}]`)
    const newKeyEvents = (
      await this.unsRegistryContract.queryFilter(
        filter,
        from,
        to
      )
    )
      .filter(event => event instanceof ethers.EventLog)
      .filter(
        event => event instanceof ethers.EventLog &&
          event.args.key === 'ipfs.html.value'
      )
    logger.info(
      `Found [${newKeyEvents.length}] NewKey events ` +
        `starting from block ${from} with key [ipfs.html.value].`
    )

    return newKeyEvents as ethers.EventLog[]
  }

  async getUnsMetadata(tokenId: string): Promise<UNSMetadata | null> {
    logger.info(`Fetching metadata for token ID [${tokenId}]`)
    const response = await axios.get(`${this.unsMetadataUrl}/${tokenId}`)
    const metadata: Partial<UNSMetadata> = response.data
    if (typeof metadata.name === 'string') {
      logger.info(`Got metadata for token ID [${tokenId}]: ${metadata.name}`)

      return {
        tokenId,
        name: metadata.name
      }
    }

    logger.error(
      `Failed to fetch metadata for token ID [${tokenId}]: ` +
        `HTTP ${response.status} ${response.statusText}`
    )

    return null
  }

  async getOwnerOfToken(
    tokenId: string
  ): Promise<{ tokenId: string, owner: string } | null> {
    const owner = await this.unsRegistryContract.ownerOf(BigInt(tokenId))
    if (!owner) {
      return null
    }
    return { tokenId, owner }
  }

  async getAnyoneDomains() {
    logger.info('Fetching anyone domains with owners...')
    const anyoneDomains = await UNSDomain.find({
      tld: 'anyone',
      owner: { $exists: true }
    })
    if (anyoneDomains.length === 0) {
      logger.info('No anyone domains found.')
      return []
    }
    logger.info(`Found ${anyoneDomains.length} anyone domains.`)

    return anyoneDomains.map(domain => ({
      tokenId: domain.tokenId,
      name: domain.name,
      owner: domain.owner,
      tld: domain.tld
    }))
  }
}
