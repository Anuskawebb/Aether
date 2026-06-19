import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [stateRows, positionRows, activityRows] = await Promise.all([
      sql`
        SELECT
          agent_wallet, portfolio_usd, stablecoin_usd, token_exposure_usd,
          buying_power_usd, starting_capital_usd, peak_portfolio_usd,
          drawdown_pct, rolling_loss_pct_24h, cash_reserve_pct,
          total_exposure_pct, open_risk_pct, open_positions,
          valuation_confidence, last_valuation_at, updated_at
        FROM portfolio_state
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT position_size_usd, unrealized_pnl_pct
        FROM agent_positions
        WHERE status = 'OPEN'
      `,
      sql`
        SELECT token_symbol, action, amount_usd, entry_price_usd, created_at
        FROM execution_orders
        WHERE status IN ('FILLED', 'PROCESSING', 'FAILED')
        ORDER BY created_at DESC
        LIMIT 10
      `,
    ])

    const state = stateRows[0] ?? null
    const unrealizedPnlUsd = positionRows.reduce((sum, p) => {
      return sum + (p.position_size_usd as number) * (p.unrealized_pnl_pct as number) / 100
    }, 0)

    return NextResponse.json({
      portfolio: state
        ? {
            totalValue: state.portfolio_usd,
            stablecoinUsd: state.stablecoin_usd,
            tokenExposureUsd: state.token_exposure_usd,
            buyingPowerUsd: state.buying_power_usd,
            startingCapitalUsd: state.starting_capital_usd,
            peakPortfolioUsd: state.peak_portfolio_usd,
            drawdownPct: state.drawdown_pct,
            rollingLossPct24h: state.rolling_loss_pct_24h,
            cashReservePct: state.cash_reserve_pct,
            totalExposurePct: state.total_exposure_pct,
            openRiskPct: state.open_risk_pct,
            openPositions: state.open_positions,
            valuationConfidence: state.valuation_confidence,
            unrealizedPnlUsd: Math.round(unrealizedPnlUsd * 100) / 100,
            agentWallet: state.agent_wallet,
            updatedAt: state.updated_at ? (state.updated_at as Date).toISOString() : null,
          }
        : null,
      activity: activityRows.map((r) => ({
        action: r.action,
        token: r.token_symbol,
        amountUsd: r.amount_usd,
        entryPriceUsd: r.entry_price_usd,
        createdAt: r.created_at ? (r.created_at as Date).toISOString() : null,
      })),
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/portfolio]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
