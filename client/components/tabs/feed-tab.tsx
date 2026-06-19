const feedItems = [
  {
    id: 1,
    type: 'smart-money',
    title: 'Smart Money Accumulation',
    description: 'Wallet #12 accumulated 2.5K CAKE',
    time: '2m ago',
  },
  {
    id: 2,
    type: 'whale',
    title: 'Whale Movement',
    description: 'Whale exited 15K SOL position',
    time: '5m ago',
  },
  {
    id: 3,
    type: 'signal',
    title: 'Signal Score Increased',
    description: 'BONK signal score: 84 → 92',
    time: '12m ago',
  },
  {
    id: 4,
    type: 'agent',
    title: 'Agent Action',
    description: 'Agent approved BUY on ETH',
    time: '18m ago',
  },
  {
    id: 5,
    type: 'risk',
    title: 'Risk Event',
    description: 'High volatility detected in DOGE',
    time: '24m ago',
  },
]

const badgeConfig = {
  'smart-money': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Smart Money' },
  'whale': { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Whale' },
  'signal': { bg: 'bg-green-50', text: 'text-green-700', label: 'Signal' },
  'agent': { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Agent' },
  'risk': { bg: 'bg-red-50', text: 'text-red-700', label: 'Risk' },
}

export default function FeedTab() {
  return (
    <div className="divide-y divide-gray-200">
      {feedItems.map((item) => {
        const badge = badgeConfig[item.type as keyof typeof badgeConfig]
        return (
          <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 mt-0.5 ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-950 mb-1">{item.title}</h4>
                <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
