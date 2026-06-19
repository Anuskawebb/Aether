'use client'

import { TrendingUp, AlertCircle } from 'lucide-react'

interface SignalScoreCardProps {
  score: number
  risk: 'Low' | 'Medium' | 'High'
  signal: string
  confidence: number
}

export default function SignalScoreCard({
  score,
  risk,
  signal,
  confidence,
}: SignalScoreCardProps) {
  const getRiskColor = (r: string) => {
    switch (r) {
      case 'Low':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getSignalColor = (s: string) => {
    if (s.includes('Buy')) return 'text-green-700'
    if (s.includes('Sell')) return 'text-red-700'
    return 'text-gray-700'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Score</div>
          <div className="text-3xl font-bold text-gray-950">{score}</div>
          <div className="text-xs text-gray-500 mt-1">Composite</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Risk</div>
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(
              risk
            )}`}
          >
            {risk}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Signal</div>
          <div className={`text-sm font-semibold ${getSignalColor(signal)}`}>{signal}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Confidence</div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-gray-950">{confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
