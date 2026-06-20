'use client'

import { useState, useEffect } from 'react'
import TopNavigation from '@/components/navigation/top-nav'
import SignalTable from '@/components/shared/signal-table'
import { fetchSignals, SignalItem } from '@/lib/api'
import { Search, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function MarketsPage() {
  const [allSignals, setAllSignals] = useState<SignalItem[]>([])
  const [filteredSignals, setFilteredSignals] = useState<SignalItem[]>([])
  const [selectedToken, setSelectedToken] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSignals({ limit: 50 }).then(({ signals }) => {
      setAllSignals(signals)
      setFilteredSignals(signals)
      if (signals.length > 0) setSelectedToken(signals[0].token)
      setLoading(false)
    })
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase()
    setSearchTerm(term)
    const filtered = allSignals.filter(
      (s) =>
        s.token.toLowerCase().includes(term) ||
        s.signal.toLowerCase().includes(term)
    )
    setFilteredSignals(filtered)
    if (filtered.length > 0) {
      setSelectedToken(filtered[0].token)
    }
  }

  const selected = filteredSignals.find((s) => s.token === selectedToken)

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <TopNavigation />
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-950 mb-2">Signal Screener</h1>
            <p className="text-gray-500">Track all tokens and trading signals in real-time</p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="col-span-3 relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              />
            </div>

            {['Risk Tier', 'Signal', 'Min Score'].map((label) => (
              <button
                key={label}
                className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-600">{label}</span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-3 gap-6">
            {/* Table */}
            <div className="col-span-2">
              {filteredSignals.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No signals found</div>
              ) : (
                <SignalTable
                  signals={filteredSignals}
                  onRowClick={(token) => setSelectedToken(token)}
                />
              )}
            </div>

            {/* Right Panel - Selected Token Preview */}
            {selected && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
                <h3 className="text-lg font-semibold text-gray-950 mb-4">{selected.token} Analysis</h3>

                {/* Mini Chart Area */}
                <div className="bg-gray-50 rounded-lg h-32 mb-4 flex items-center justify-center text-gray-500">
                  Mini Chart
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Signal Score</div>
                    <div className="text-2xl font-bold text-gray-950">{selected.score}</div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recommendation</div>
                    <div className={`text-sm font-semibold ${selected.signal.includes('Buy') ? 'text-green-700' : 'text-red-700'}`}>
                      {selected.signal}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Recent Activity</div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">• {selected.smartWallets} smart wallets accumulating</p>
                      <p className="text-gray-600">• Signal at {selected.score} strength</p>
                      <p className="text-gray-600">• Confidence: {selected.confidence}%</p>
                    </div>
                  </div>

                  <Link
                    href={`/token/${selected.token}`}
                    className="w-full mt-4 px-4 py-2 bg-gray-950 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-center text-sm block"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
