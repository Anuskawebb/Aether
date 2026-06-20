'use client'

import { useState, useEffect } from 'react'
import TopNavigation from '@/components/navigation/top-nav'
import { fetchPortfolio, fetchPositions, PortfolioData, PortfolioActivity, PositionItem } from '@/lib/api'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [activity, setActivity] = useState<PortfolioActivity[]>([])
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPortfolio(),
      fetchPositions({ status: 'OPEN' }),
    ]).then(([portfolioRes, positionsRes]) => {
      setPortfolio(portfolioRes.portfolio)
      setActivity(portfolioRes.activity)
      setPositions(positionsRes.positions)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <TopNavigation />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      </div>
    )
  }

  const totalValue = portfolio?.totalValue ?? 0
  const pnlToday = portfolio ? -(portfolio.rollingLossPct24h ?? 0) : 0
  const drawdown = portfolio?.drawdownPct ?? 0
  const stablecoinPct = portfolio && totalValue > 0
    ? Math.round((portfolio.stablecoinUsd / totalValue) * 1000) / 10
    : 0
  const tokenExposurePct = portfolio && totalValue > 0
    ? Math.round((portfolio.tokenExposureUsd / totalValue) * 1000) / 10
    : 0

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-950 mb-2">Portfolio</h1>
            <p className="text-gray-500">Your complete portfolio overview and performance analytics</p>
          </div>

          {/* Portfolio Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
            <div className="grid grid-cols-5 gap-8">
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Portfolio Value</div>
                <div className="text-3xl font-bold text-gray-950">${totalValue.toLocaleString()}</div>
                <div className="text-sm text-gray-500 mt-2">USD</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Today's PnL</div>
                <div className={`text-3xl font-bold ${pnlToday >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {pnlToday >= 0 ? '+' : ''}{pnlToday.toFixed(1)}%
                </div>
                <div className={`text-sm mt-2 ${pnlToday >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {pnlToday >= 0 ? '↑' : '↓'} ${Math.abs(pnlToday * totalValue / 100).toFixed(0)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Unrealized PnL</div>
                <div className={`text-3xl font-bold ${(portfolio?.unrealizedPnlUsd ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {(portfolio?.unrealizedPnlUsd ?? 0) >= 0 ? '+' : ''}${(portfolio?.unrealizedPnlUsd ?? 0).toFixed(0)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Open Positions</div>
                <div className="text-3xl font-bold text-gray-950">{portfolio?.openPositions ?? 0}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Max Drawdown</div>
                <div className="text-3xl font-bold text-red-700">-{drawdown.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Asset Allocation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-950 mb-6">Asset Allocation</h3>
              <div className="space-y-4">
                {[
                  { name: 'Token Exposure', value: tokenExposurePct, color: 'bg-blue-500' },
                  { name: 'Stablecoins', value: stablecoinPct, color: 'bg-green-500' },
                ].map((asset) => (
                  <div key={asset.name}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-950">{asset.name}</span>
                      <span className="text-sm font-semibold text-gray-950">{asset.value}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${asset.color} h-2 rounded-full`} style={{ width: `${Math.min(100, asset.value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Allocation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-950 mb-6">Risk Allocation</h3>
              <div className="space-y-4">
                {[
                  { name: 'Low Risk', value: 60, color: 'bg-green-500' },
                  { name: 'Medium Risk', value: 25, color: 'bg-yellow-500' },
                  { name: 'High Risk', value: 15, color: 'bg-red-500' },
                ].map((risk) => (
                  <div key={risk.name}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-950">{risk.name}</span>
                      <span className="text-sm font-semibold text-gray-950">{risk.value}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${risk.color} h-2 rounded-full`} style={{ width: `${risk.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Exposure Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-6">Exposure</h3>
            <div className="grid grid-cols-5 gap-6">
              {[
                { label: 'Stablecoin Exposure', value: `${stablecoinPct}%` },
                { label: 'Token Exposure', value: `${tokenExposurePct}%` },
                { label: 'Buying Power', value: portfolio ? `$${Math.round(portfolio.buyingPowerUsd).toLocaleString()}` : '$0' },
                { label: 'Open Risk', value: portfolio ? `${portfolio.openRiskPct.toFixed(1)}%` : '0%' },
                { label: 'Cash Reserve', value: portfolio ? `${portfolio.cashReservePct.toFixed(1)}%` : '0%' },
              ].map((item) => (
                <div key={item.label} className="border-r border-gray-200 last:border-r-0 pr-6 last:pr-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">{item.label}</div>
                  <div className="text-2xl font-bold text-gray-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-950">Holdings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-950">Token</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-950">Entry Price</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-950">Value</th>
                    <th className="text-right px-6 py-3 font-semibold text-gray-950">PnL</th>
                    <th className="text-center px-6 py-3 font-semibold text-gray-950">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No open positions</td>
                    </tr>
                  ) : (
                    positions.map((pos) => (
                      <tr key={pos.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-950">{pos.token}</td>
                        <td className="px-6 py-4 text-center text-gray-950">${pos.entryPriceUsd.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-950 font-medium">
                          ${pos.positionSizeUsd.toLocaleString()}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${pos.unrealizedPnlUsd >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {pos.unrealizedPnlUsd >= 0 ? '+' : ''}${pos.unrealizedPnlUsd.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-950">{pos.positionSizePct.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portfolio Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-950 mb-6">Recent Activity</h3>
            {activity.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No recent activity</div>
            ) : (
              <div className="space-y-3">
                {activity.map((act, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded text-xs font-semibold ${
                        act.action === 'BUY'
                          ? 'bg-green-50 text-green-700'
                          : act.action === 'SELL'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-700'
                      }`}>
                        {act.action}
                      </span>
                      <div>
                        <div className="font-medium text-gray-950">{act.token}</div>
                        <div className="text-sm text-gray-500">${act.amountUsd?.toFixed(2) ?? '—'}</div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
