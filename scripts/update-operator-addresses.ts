import 'dotenv/config'
import fs from 'fs/promises'
import _ from 'lodash'
import { logger } from './util/logger'
import { getOperatorRegistryState } from './util/operator-registry'

async function updateOperatorAddresses() {
  const operatorRegistryProcessId =
    process.env.OPERATOR_REGISTRY_PROCESS_ID || ''
  if (!operatorRegistryProcessId) {
    throw new Error('Missing OPERATOR_REGISTRY_PROCESS_ID!')
  }
  logger.info(
    `Using operator registry process ID: ${operatorRegistryProcessId}`
  )

  let dataDir = process.env.DATA_DIR
  if (!dataDir) {
    logger.warn(`DATA_DIR is not set!  Falling back to default!`)
    dataDir = `${process.cwd()}/data`
  }
  logger.info(`Using data directory: ${dataDir}`)

  logger.info('Fetching operator registry state...')
  const state = await getOperatorRegistryState(operatorRegistryProcessId)
  logger.info(`Operator registry state fetched successfully!`)

  const verifiedOperatorAddresses = _.uniq(
    Object.values(state.VerifiedFingerprintsToOperatorAddresses)
  )
  logger.info(
    `Found [${verifiedOperatorAddresses.length}] verified operator addresses.`
  )

  const blockedOperatorAddresses = Object.keys(state.BlockedOperatorAddresses)
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

  if (operatorAddresses.length === 0) {
    logger.warn('No operator addresses found after filtering!')
    return
  }

  const operatorAddressesFile = `${dataDir}/operator-addresses.json`
  logger.info(
    `Writing operator addresses to file: ${operatorAddressesFile}`
  )
  try {
    await fs.writeFile(
      operatorAddressesFile,
      JSON.stringify(operatorAddresses, null, 2),
      'utf-8'
    )
    logger.info('Operator addresses written successfully!')
  } catch (error) {
    logger.error(
      `Failed to write operator addresses to file: ${operatorAddressesFile}`,
      error
    )
    throw new Error(`Failed to write operator addresses!`)
  }
}

updateOperatorAddresses()
  .then(() => {
    logger.info('Operator addresses updated successfully!')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Error updating operator addresses:', error.stack || error)
    process.exit(1)
  })
