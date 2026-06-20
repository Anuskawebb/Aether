/**
 * Readiness service — determines whether the agent wallet is ready to trade.
 * Used by the readiness API route and the health endpoint.
 */

export const MIN_REQUIRED_BNB = parseFloat(process.env.MIN_REQUIRED_BNB ?? '0.005')

export type ReadinessStatus = 'PENDING' | 'AWAITING_FUNDS' | 'READY'

export interface ReadinessResult {
  walletCreated:     boolean
  walletFunded:      boolean
  twakConnected:     boolean
  readyForTrading:   boolean
  currentBalanceBnb: number
  minimumRequiredBnb: number
  status:            ReadinessStatus
}

export function computeReadiness(opts: {
  walletAddress:    string | null
  twakConnected:    boolean
  currentBalanceBnb: number
}): ReadinessResult {
  const { walletAddress, twakConnected, currentBalanceBnb } = opts

  const walletCreated  = walletAddress !== null
  const walletFunded   = currentBalanceBnb >= MIN_REQUIRED_BNB
  const readyForTrading = walletCreated && walletFunded && twakConnected

  let status: ReadinessStatus
  if (!walletCreated) {
    status = 'PENDING'
  } else if (!walletFunded) {
    status = 'AWAITING_FUNDS'
  } else {
    status = 'READY'
  }

  return {
    walletCreated,
    walletFunded,
    twakConnected,
    readyForTrading,
    currentBalanceBnb,
    minimumRequiredBnb: MIN_REQUIRED_BNB,
    status,
  }
}
