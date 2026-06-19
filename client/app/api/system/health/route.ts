import { NextResponse } from 'next/server'
import sql from '@/lib/db'
import { twakIsReachable, twakGetAddress, twakGetBalance } from '@/lib/twak'
import { computeReadiness } from '@/lib/readiness'

export const dynamic = 'force-dynamic'

const AGENT_ID = process.env.TORO_AGENT_ID ?? 'toro-agent-001'

export async function GET() {
  const [dbOk, twakReachable, twakAddress, balance] = await Promise.all([
    sql`SELECT 1`.then(() => true).catch(() => false),
    twakIsReachable(),
    twakGetAddress().catch(() => null),
    twakGetBalance().catch(() => null),
  ])

  const currentBalanceBnb = balance ? parseFloat(balance.balance) : 0

  const readiness = computeReadiness({
    walletAddress:    twakAddress,
    twakConnected:    twakReachable,
    currentBalanceBnb,
  })

  const status = dbOk && twakReachable ? 'ok' : 'degraded'

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    db: {
      connected: dbOk,
    },
    twak: {
      reachable:        twakReachable,
      walletConfigured: twakAddress !== null,
      walletAddress:    twakAddress,
    },
    trading: {
      ready:        readiness.readyForTrading,
      walletFunded: readiness.walletFunded,
      status:       readiness.status,
    },
  }, { status: status === 'ok' ? 200 : 207 })
}
