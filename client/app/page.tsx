'use client'

import { useState } from 'react'
import TopNavigation from '@/components/navigation/top-nav'
import Sidebar from '@/components/sidebar'
import TradingChart from '@/components/chart/trading-chart'
import TopOpportunities from '@/components/bottom-cards/top-opportunities'
import LiveIntelligence from '@/components/bottom-cards/live-intelligence'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'feed' | 'signals' | 'watchlist'>('feed')

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main chart area */}
          <div className="flex-1 border-b border-gray-200">
            <TradingChart />
          </div>
          
          {/* Bottom cards */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-white border-t border-gray-200 overflow-hidden">
            <TopOpportunities />
            <LiveIntelligence />
          </div>
        </div>
      </div>
    </div>
  )
}
