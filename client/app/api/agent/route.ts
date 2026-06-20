import { NextResponse } from 'next/server'
import sql from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      statsRows,
      portfolioRows,
      recentRecsRows,
      pendingRecsRows,
    ] = await Promise.all([
      sql`
        SELECT
          (SELECT COUNT(*) FROM smart_money_signals WHERE meets_minimum_holders = true)::int AS monitoring_tokens,
          (SELECT COUNT(*) FROM wallet_scores)::int AS tracked_wallets,
          (SELECT COUNT(*) FROM smart_money_signals)::int AS signals_generated,
          (SELECT COUNT(*) FROM trade_recommendations WHERE status = 'PENDING')::int AS recommendations_active
      `,
      sql`
        SELECT agent_wallet, portfolio_usd, drawdown_pct, open_positions
        FROM portfolio_state
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT id, token_symbol, action, reasons, blockers, confidence,
               position_size_pct, risk_tier, status, decided_at
        FROM trade_recommendations
        ORDER BY decided_at DESC
        LIMIT 10
      `,
      sql`
        SELECT id, token_symbol, action, reasons, confidence, position_size_pct,
               stop_loss_pct, take_profit_pct, risk_tier, signal_tier, status, decided_at
        FROM trade_recommendations
        WHERE status = 'PENDING'
        ORDER BY confidence DESC
        LIMIT 10
      `,
    ])

    const stats = statsRows[0] ?? {}
    const portfolio = portfolioRows[0] ?? null

    const decisions = recentRecsRows.map((r) => {
      const reasons = Array.isArray(r.reasons) ? r.reasons : []
      const decidedAt = r.decided_at as Date | null
      return {
        action: r.action,
        token: r.token_symbol,
        reasons,
        reason: reasons[0] ?? '',
        confidence: r.confidence != null ? Math.round((r.confidence as number) * 100) : 0,
        allocation: r.position_size_pct != null ? `${Math.round(r.position_size_pct as number)}%` : '0%',
        status: r.status,
        decidedAt: decidedAt ? decidedAt.toISOString() : null,
      }
    })

    const recommendations = pendingRecsRows.map((r) => {
      const riskTier = (r.risk_tier as string | null) ?? 'MEDIUM'
      const status = (r.status as string | null) ?? 'PENDING'
      return {
        token: r.token_symbol,
        action: r.action,
        risk: riskTier.charAt(0) + riskTier.slice(1).toLowerCase(),
        allocation: r.position_size_pct != null ? `${Math.round(r.position_size_pct as number)}%` : '0%',
        stopLoss: r.stop_loss_pct != null ? `${Math.round(r.stop_loss_pct as number)}%` : '0%',
        takeProfit: r.take_profit_pct != null ? `${Math.round(r.take_profit_pct as number)}%` : '0%',
        confidence: r.confidence != null ? Math.round((r.confidence as number) * 100) : 0,
        status: status.charAt(0) + status.slice(1).toLowerCase(),
      }
    })

    return NextResponse.json({
      status: {
        monitoringTokens: (stats.monitoring_tokens as number) ?? 0,
        trackedWallets: (stats.tracked_wallets as number) ?? 0,
        signalsGenerated: (stats.signals_generated as number) ?? 0,
        recommendationsActive: (stats.recommendations_active as number) ?? 0,
        agentWallet: portfolio?.agent_wallet ?? null,
        portfolioUsd: portfolio?.portfolio_usd ?? null,
        openPositions: portfolio?.open_positions ?? 0,
        drawdownPct: portfolio?.drawdown_pct ?? 0,
        agentStatus: 'Active',
      },
      decisions,
      recommendations,
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.error('[api/agent]', err)
    return NextResponse.json({ error: 'Internal server error', code: 'DB_ERROR' }, { status: 500 })
  }
}
