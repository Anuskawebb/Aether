'use client'

import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { fetchSignals, SignalItem } from '@/lib/api'

function getRiskColor(risk: string) {
  switch (risk) {
    case 'Low':
      return 'text-green-600'
    case 'Medium':
      return 'text-orange-600'
    case 'High':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

function formatFlow(flow: number): string {
  if (flow === 0) return '$0'
  const abs = Math.abs(flow)
  const formatted = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(1)}M`
    : `$${(abs / 1_000).toFixed(1)}K`
  return flow >= 0 ? `+${formatted}` : `-${formatted}`
}

function tierToRisk(tier: string): 'Low' | 'Medium' | 'High' {
  if (tier === 'STRONG') return 'Low'
  if (tier === 'MODERATE') return 'Medium'
  return 'High'
}

export default function TopOpportunities() {
  const [opportunities, setOpportunities] = useState<SignalItem[]>([])

  useEffect(() => {
    fetchSignals({ limit: 4 }).then(({ signals }) => {
      setOpportunities(signals)
    })
  }, [])

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-950">Top Opportunities</h3>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2 text-left font-medium text-gray-600">Token</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Score</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">Risk</th>
              <th className="px-4 py-2 text-right font-medium text-gray-600">24H Flow</th>
              <th className="px-4 py-2 text-center font-medium text-gray-600 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-gray-400 text-xs">Loading...</td>
              </tr>
            ) : (
              opportunities.map((opp, idx) => {
                const risk = tierToRisk(opp.signalTier)
                const flow = formatFlow(opp.netAccumulationFlow ?? 0)
                const positive = (opp.netAccumulationFlow ?? 0) >= 0
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-2.5 font-semibold text-gray-950">{opp.token}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-950">{opp.score}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${getRiskColor(risk)}`}>{risk}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>
                      {flow}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <ChevronRight size={16} className="text-gray-400 mx-auto" />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
