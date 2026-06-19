'use client'

import TopNavigation from '@/components/navigation/top-nav'

export default function NFTsPage() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-950 mb-2">NFTs</h1>
            <p className="text-gray-500">Explore NFT collections and on-chain data</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🖼️</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-950 mb-2">NFT Intelligence Coming Soon</h2>
            <p className="text-gray-600 mb-6">We&apos;re building comprehensive NFT analytics and tracking features.</p>
            <button className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
              Notify Me
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
