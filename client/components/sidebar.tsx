'use client'

import { Bell, Search } from 'lucide-react'
import FeedTab from './tabs/feed-tab'
import SignalsTab from './tabs/signals-tab'
import WatchlistTab from './tabs/watchlist-tab'

interface SidebarProps {
  activeTab: 'feed' | 'signals' | 'watchlist'
  onTabChange: (tab: 'feed' | 'signals' | 'watchlist') => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-950 placeholder-gray-400"
            />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded transition-colors">
            <Bell size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 bg-gray-50 p-1 rounded">
          {(['feed', 'signals', 'watchlist'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-gray-950 border border-gray-200'
                  : 'text-gray-600 hover:text-gray-950'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'feed' && <FeedTab />}
        {activeTab === 'signals' && <SignalsTab />}
        {activeTab === 'watchlist' && <WatchlistTab />}
      </div>
    </div>
  )
}
