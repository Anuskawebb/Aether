'use client'

import { useState, useEffect } from 'react'
import TopNavigation from '@/components/navigation/top-nav'
import { mockResearchArticles } from '@/lib/mock-data'
import { fetchActivity, ActivityEvent } from '@/lib/api'
import { Brain, MessageSquare, FileText } from 'lucide-react'

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'discussions' | 'research'>('feed')
  const [feedPosts, setFeedPosts] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity({ limit: 10 }).then(({ events }) => {
      setFeedPosts(events)
      setLoading(false)
    })
  }, [])

  const tabs = [
    { id: 'feed', label: 'Feed', icon: MessageSquare },
    { id: 'discussions', label: 'Discussions', icon: Brain },
    { id: 'research', label: 'Research', icon: FileText },
  ]

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'smart-money':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'signal':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'agent':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'risk':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'whale':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'smart-money':
        return 'Smart Money'
      case 'signal':
        return 'Signal'
      case 'agent':
        return 'Agent'
      case 'risk':
        return 'Risk'
      case 'whale':
        return 'Whale'
      default:
        return type
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <TopNavigation />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-950 mb-2">Community</h1>
            <p className="text-gray-500">Research community for crypto intelligence and trading insights</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-gray-200 mb-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 px-2 border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-gray-950 text-gray-950'
                      : 'border-transparent text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Feed Tab */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-gray-500 py-12">Loading...</div>
              ) : feedPosts.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No events found</div>
              ) : (
                feedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getPostTypeColor(
                          post.type
                        )}`}
                      >
                        {getPostTypeLabel(post.type)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(post.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-950 mb-2">{post.title}</h3>
                    <p className="text-gray-600">{post.description}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {['CAKE', 'DOGE', 'FLOKI', 'BONK', 'PEPE', 'SHIB'].map((token) => (
                <div
                  key={token}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-950">{token} Discussion</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Join the conversation
                      </p>
                    </div>
                    <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium">
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Research Tab */}
          {activeTab === 'research' && (
            <div className="space-y-4">
              {/* Featured Research */}
              <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Featured Report
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-gray-950 mb-3">Weekly Smart Money Report</h2>
                <p className="text-gray-600 mb-6">
                  Comprehensive analysis of smart wallet movements across major token pairs. Includes accumulation
                  patterns, risk assessments, and opportunity scoring for the week.
                </p>
                <button className="px-6 py-2 bg-gray-950 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
                  Read Report
                </button>
              </div>

              {/* Research Articles */}
              <div>
                <h3 className="text-lg font-semibold text-gray-950 mb-4">Latest Research</h3>
                <div className="space-y-4">
                  {mockResearchArticles.map((article) => (
                    <div
                      key={article.id}
                      className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-950 mb-2">{article.title}</h3>
                      <p className="text-gray-600 mb-4">{article.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{article.source}</span>
                          <span>{article.timestamp}</span>
                        </div>
                        <button className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium">
                          Read More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
