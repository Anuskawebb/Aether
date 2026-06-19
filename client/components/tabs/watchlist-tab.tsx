const watchlistItems = [
  {
    id: 1,
    token: 'Bitcoin',
    symbol: 'BTC',
    price: '$103,185',
    change: '+2.4%',
    positive: true,
  },
  {
    id: 2,
    token: 'Ethereum',
    symbol: 'ETH',
    price: '$2,032',
    change: '+1.2%',
    positive: true,
  },
  {
    id: 3,
    token: 'Solana',
    symbol: 'SOL',
    price: '$198.40',
    change: '-0.8%',
    positive: false,
  },
  {
    id: 4,
    token: 'Cardano',
    symbol: 'ADA',
    price: '$1.25',
    change: '+3.2%',
    positive: true,
  },
  {
    id: 5,
    token: 'Polygon',
    symbol: 'MATIC',
    price: '$0.85',
    change: '-1.5%',
    positive: false,
  },
]

export default function WatchlistTab() {
  return (
    <div className="divide-y divide-gray-200">
      {watchlistItems.map((item) => (
        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-950">{item.token}</h4>
              <p className="text-xs text-gray-500">{item.symbol}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-950">{item.price}</p>
              <p className={`text-xs font-medium ${item.positive ? 'text-green-600' : 'text-red-600'}`}>
                {item.positive ? '+' : ''}{item.change}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
