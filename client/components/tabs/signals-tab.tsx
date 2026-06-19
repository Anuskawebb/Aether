'use client'

import { useState, useEffect } from 'react'
import { fetchSignals, SignalItem } from '@/lib/api'

function getRiskColor(tier: string) {
  switch (tier) {
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

export default function SignalsTab() {
  const [signalItems, setSignalItems] = useState<SignalItem[]>([])

  useEffect(() => {
    fetchSignals({ limit: 8 }).then(({ signals }) => {
      setSignalItems(signals)
    })
  }, [])

  if (signalItems.length === 0) {
    return (
      <div className="divide-y divide-gray-200">
        <div className="p-4 text-center text-gray-400 text-xs">Loading...</div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200">
      {signalItems.map((item, idx) => (
        <div key={idx} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-950">{item.token}</h4>
              <p className="text-xs text-gray-500">{item.token}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-950">{item.score}</p>
              <p className="text-xs text-gray-500">Score</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className={`text-xs font-medium ${getRiskColor(item.risk)}`}>
              {item.risk} Risk
            </span>
            <span className="text-xs font-medium text-gray-600">
              {item.change24h >= 0 ? '+' : ''}{item.change24h} pts
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
