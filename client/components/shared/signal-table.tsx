'use client'

import RiskBadge from './risk-badge'
import TrendBadge from './trend-badge'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface SignalRow {
  token: string
  score: number
  risk: 'Low' | 'Medium' | 'High'
  signal: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell'
  confidence: number
  change24h: number
  smartWallets: number
  trend: 'Increasing' | 'Stable' | 'Decreasing'
}

interface SignalTableProps {
  signals: SignalRow[]
  onRowClick?: (token: string) => void
}

export default function SignalTable({ signals, onRowClick }: SignalTableProps) {
  const getSignalColor = (signal: string) => {
    if (signal.includes('Buy')) return 'text-green-700'
    if (signal.includes('Sell')) return 'text-red-700'
    return 'text-gray-700'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 font-semibold text-gray-950">Token</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Score</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Risk</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Signal</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Confidence</th>
              <th className="text-right px-6 py-3 font-semibold text-gray-950">24H Change</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Smart Wallets</th>
              <th className="text-center px-6 py-3 font-semibold text-gray-950">Trend</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr
                key={signal.token}
                onClick={() => onRowClick?.(signal.token)}
                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-950">{signal.token}</td>
                <td className="px-6 py-4 text-center text-gray-950 font-semibold">{signal.score}</td>
                <td className="px-6 py-4 text-center">
                  <RiskBadge risk={signal.risk} size="sm" />
                </td>
                <td className={`px-6 py-4 text-center font-medium ${getSignalColor(signal.signal)}`}>
                  {signal.signal}
                </td>
                <td className="px-6 py-4 text-center text-gray-950">{signal.confidence}%</td>
                <td className="px-6 py-4 text-right">
                  <div className={`flex items-center justify-end gap-1 ${signal.change24h >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {signal.change24h >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownLeft size={16} />
                    )}
                    <span className="font-medium">{Math.abs(signal.change24h).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-gray-950">{signal.smartWallets}</td>
                <td className="px-6 py-4 text-center">
                  <TrendBadge trend={signal.trend} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
