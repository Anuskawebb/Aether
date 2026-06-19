'use client'

import { useState, useEffect } from 'react'
import { fetchActivity, ActivityEvent } from '@/lib/api'

const badgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  'smart-money': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Smart Money' },
  'whale': { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Whale' },
  'signal': { bg: 'bg-green-50', text: 'text-green-700', label: 'Signal' },
  'agent': { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Agent' },
  'risk': { bg: 'bg-red-50', text: 'text-red-700', label: 'Risk' },
}

function getBadge(type: string) {
  return badgeConfig[type] ?? { bg: 'bg-gray-50', text: 'text-gray-700', label: type }
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function LiveIntelligence() {
  const [items, setItems] = useState<ActivityEvent[]>([])

  useEffect(() => {
    fetchActivity({ limit: 6 }).then(({ events }) => {
      setItems(events)
    })
  }, [])

  return (
    <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-950">Live Intelligence Feed</h3>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {items.length === 0 ? (
          <div className="px-4 py-4 text-center text-gray-400 text-xs">Loading...</div>
        ) : (
          items.map((item) => {
            const badge = getBadge(item.type)
            return (
              <div key={item.id} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-950 mb-1 truncate">{item.title}</p>
                    <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
