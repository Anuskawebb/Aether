'use client'

import { useState, useEffect } from 'react'
import TopNavigation from '@/components/navigation/top-nav'
import { fetchPositions, PositionItem } from '@/lib/api'
import Link from 'next/link'

export default function AssetsPage() {
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPositions({ status: 'OPEN' }).then(({ positions: pos }) => {
      setPositions(pos)
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

  const totalValue = positions.reduce((sum, p) => sum + p.positionSizeUsd, 0)
  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnlUsd, 0)
  const bestPerformer = positions.length > 0
    ? positions.reduce((max, p) => p.unrealizedPnlUsd > max.unrealizedPnlUsd ? p : max).token
    : '—'

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-950 mb-2">My Assets</h1>
            <p className="text-gray-500">View and manage your cryptocurrency holdings</p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Value</div>
              <div className="text-3xl font-bold text-gray-950">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total PnL</div>
              <div className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Best Performer</div>
              <div className="text-lg font-bold text-gray-950">{bestPerformer}</div>
            </div>
          </div>

          {/* Assets Grid */}
          {positions.length === 0 ? (
            <div className="text-center text-gray-500 py-16">No open positions</div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {positions.map((pos) => (
                <Link
                  key={pos.id}
                  href={`/token/${pos.token}`}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-all cursor-pointer hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-gray-950">{pos.token[0]}</span>
                    </div>
                    <span className={`text-sm font-semibold ${pos.unrealizedPnlUsd >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {pos.unrealizedPnlUsd >= 0 ? '+' : ''}${pos.unrealizedPnlUsd.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-950 mb-4">{pos.token}</h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Value</span>
                      <span className="font-medium text-gray-950">${pos.positionSizeUsd.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Allocation</span>
                      <span className="font-medium text-gray-950">{pos.positionSizePct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm text-gray-600">Return</span>
                      <span className={`font-semibold ${pos.unrealizedPnlPct >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {pos.unrealizedPnlPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
