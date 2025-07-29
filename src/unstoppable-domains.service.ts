import { Contract, ethers, JsonRpcProvider } from 'ethers'
import { unsRegistryAbi } from './schema/uns-registry.abi'
import { logger } from './util/logger'

export class UnstoppableDomainsService {
  private readonly jsonRpcUrl: string
  private readonly unsRegistryAddress: string

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

    this.provider = new JsonRpcProvider(this.jsonRpcUrl)
    this.unsRegistryContract = new Contract(
      this.unsRegistryAddress,
      unsRegistryAbi,
      this.provider
    )

    logger.info('UnstoppableDomainsService initialized.')
  }

  async queryNewKeyEvents(from: ethers.BlockTag) {
    const filter = this.unsRegistryContract.filters.NewKey()
    logger.info(`Querying NewKey events from block [${from}]`)
    const newKeyEvents = (
      await this.unsRegistryContract.queryFilter(
        filter,
        from
      )
    )
      .filter(event => event instanceof ethers.EventLog)
      .filter(event => event.args?.key === 'ipfs.html.value')
    logger.info(
      `Found [${newKeyEvents.length}] NewKey events ` +
        `starting from block ${from} with key [ipfs.html.value].`
    )

    return newKeyEvents
  }
}
