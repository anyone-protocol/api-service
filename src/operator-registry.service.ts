import _ from 'lodash'
import { logger } from './util/logger'
import { sendAosDryRun } from './util/send-aos-message'

export interface OperatorRegistryState {
  ClaimableFingerprintsToOperatorAddresses: { [fingerprint: string]: string }
  VerifiedFingerprintsToOperatorAddresses: { [fingerprint: string]: string }
  BlockedOperatorAddresses: { [fingerprint: string]: boolean }
  RegistrationCreditsFingerprintsToOperatorAddresses: {
    [fingerprint: string]: string
  }
  VerifiedHardwareFingerprints: { [fingerprint: string]: boolean }
}

export class OperatorRegistryService {
  private readonly operatorRegistryProcessId: string
  private operatorRegistryCacheTtlSeconds: number = 0
  private operatorRegistryCacheTimestamp: number = 0
  private operatorRegistryCachedState: OperatorRegistryState | null = null

  constructor() {
    logger.info('Initializing OperatorRegistryService...')
    this.operatorRegistryProcessId =
      process.env.OPERATOR_REGISTRY_PROCESS_ID || ''
    if (!this.operatorRegistryProcessId) {
      throw new Error('Missing OPERATOR_REGISTRY_PROCESS_ID!')
    }
    logger.info(
      `Using operator registry process ID [${this.operatorRegistryProcessId}]`
    )

    this.operatorRegistryCacheTtlSeconds =
      parseInt(process.env.OPERATOR_REGISTRY_CACHE_TTL_SECONDS || '0')
    if (
      isNaN(this.operatorRegistryCacheTtlSeconds) ||
        this.operatorRegistryCacheTtlSeconds < 0
    ) {
      this.operatorRegistryCacheTtlSeconds = 0
      logger.warn(
        `Invalid OPERATOR_REGISTRY_CACHE_TTL_SECONDS ` + 
          `[${process.env.OPERATOR_REGISTRY_CACHE_TTL_SECONDS}]. ` +
          `Using default value of 0.`
      )
    }
    logger.info(
      `Using operator registry cache TTL of ` +
        `[${this.operatorRegistryCacheTtlSeconds}] seconds`
    )
    logger.info('OperatorRegistryService initialized.')
  }

  static async getOperatorRegistryState(
    operatorRegistryProcessId: string
  ): Promise<OperatorRegistryState> {
    const { result } = await sendAosDryRun({
      processId: operatorRegistryProcessId,
      tags: [{ name: 'Action', value: 'View-State' }],
    })
    const state = JSON.parse(result.Messages[0].Data)

    for (const prop in state) {
      // NB: Lua returns empty tables as JSON arrays, so we normalize them to
      //     empty objects as when they are populated they will also be objects
      if (Array.isArray(state[prop]) && state[prop].length < 1) {
        state[prop] = {}
      }
    }

    return state
  }

  async getOperators() {
    const now = Date.now()
    const cacheAge = (now - this.operatorRegistryCacheTimestamp) / 1000
    if (
      !this.operatorRegistryCachedState ||
      cacheAge >= this.operatorRegistryCacheTtlSeconds
    ) {
      logger.info(
        'Fetching operator registry state because the cache is empty or expired'
      )
      this.operatorRegistryCachedState = await OperatorRegistryService
        .getOperatorRegistryState(this.operatorRegistryProcessId)
      this.operatorRegistryCacheTimestamp = now
      logger.info(`Operator registry state fetched successfully!`)
    } else {
      logger.info(
        `Using cached operator registry state (age: ${cacheAge.toFixed(2)}s)`
      )
    }

    const verifiedOperatorAddresses = _.uniq(
      Object.values(
        this.operatorRegistryCachedState.VerifiedFingerprintsToOperatorAddresses
      )
    )
    logger.info(
      `Found [${verifiedOperatorAddresses.length}] verified operator addresses.`
    )

    const blockedOperatorAddresses = Object.keys(
      this.operatorRegistryCachedState.BlockedOperatorAddresses
    )
    logger.info(
      `Found [${blockedOperatorAddresses.length}] blocked operator addresses.`
    )
  
    const operatorAddresses = _.difference(
      verifiedOperatorAddresses,
      blockedOperatorAddresses
    )
    logger.info(
      `Found [${operatorAddresses.length}] operator addresses after ` +
        `filtering out blocked operator addresses`
    )

    return operatorAddresses
  }
}
