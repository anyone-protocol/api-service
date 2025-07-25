import fs from 'fs/promises'
import { sendAosDryRun } from './send-aos-message'
import { logger } from './logger'

export interface OperatorRegistryState {
  ClaimableFingerprintsToOperatorAddresses: { [fingerprint: string]: string }
  VerifiedFingerprintsToOperatorAddresses: { [fingerprint: string]: string }
  BlockedOperatorAddresses: { [fingerprint: string]: boolean }
  RegistrationCreditsFingerprintsToOperatorAddresses: {
    [fingerprint: string]: string
  }
  VerifiedHardwareFingerprints: { [fingerprint: string]: boolean }
}

export async function getOperatorRegistryState(
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

export async function readOperatorAddressesFromFile(
  dataDir: string
): Promise<string[]> {
  const operatorAddressesFile = `${dataDir}/operator-addresses.json`
  try {
    const fileContent = await fs.readFile(operatorAddressesFile, 'utf-8')
    return JSON.parse(fileContent) as string[]
  } catch (error) {
    logger.error(
      `Failed to read operator addresses from file: ${operatorAddressesFile}`,
      error
    )
    throw new Error(`Failed to read operator addresses from file!`)
  }
}
