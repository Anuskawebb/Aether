import TopNavigation from '@/components/navigation/top-nav'
import { agentMarketplaceData } from '@/lib/mock-data-advanced'
import { Award, Users, TrendingUp, Copy, Star, BarChart3 } from 'lucide-react'

export default function AgentMarketplacePage() {
  const categories = ['All', 'Smart Money', 'Momentum', 'Conservative', 'Aggressive', 'AI Generated']

  return (
    <>
      <TopNavigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Agent Marketplace</h1>
            <p className="text-muted-foreground">Discover, follow, and clone top-performing trading agents</p>
          </div>

          {/* Category Filter */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                  cat === 'All'
                    ? 'bg-orange-accent text-background'
                    : 'bg-secondary text-foreground hover:bg-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Featured Agents Grid */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6">Featured Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentMarketplaceData.slice(0, 3).map((agent) => (
                <div key={agent.rank} className="bg-card border border-border rounded-lg p-6 hover:border-orange-accent transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Award size={18} className="text-orange-accent" />
                        <span className="text-xs font-semibold text-muted-foreground">RANK #{agent.rank}</span>
                      </div>
                      <div className="text-xl font-bold text-foreground">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">{agent.strategy}</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{agent.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-border">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
                      <div className="font-bold text-foreground">${(agent.portfolioValue / 1000000).toFixed(1)}M</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Total Return</div>
                      <div className="font-bold text-green-positive">+{agent.return}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                      <div className="font-bold text-foreground">{agent.winRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Followers</div>
                      <div className="font-bold text-foreground">{(agent.followers / 1000).toFixed(0)}K</div>
                    </div>
                  </div>

                  {/* Risk Profile Badge */}
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Risk:</span>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      agent.riskProfile === 'Conservative' ? 'bg-green-positive/10 text-green-positive' :
                      agent.riskProfile === 'Balanced' ? 'bg-orange-accent/10 text-orange-accent' :
                      'bg-red-negative/10 text-red-negative'
                    }`}>
                      {agent.riskProfile}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-orange-accent text-background rounded-lg hover:opacity-90 transition-opacity font-medium text-sm">
                      View
                    </button>
                    <button className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-border transition-colors font-medium text-sm flex items-center justify-center gap-1">
                      <Star size={16} />
                      Follow
                    </button>
                    <button className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-border transition-colors font-medium text-sm">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp size={20} />
                Agent Leaderboard
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium text-sm">Rank</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium text-sm">Agent</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium text-sm">Strategy</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-medium text-sm">Return</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-medium text-sm">Win Rate</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-medium text-sm">Followers</th>
                    <th className="text-left py-4 px-6 text-muted-foreground font-medium text-sm">Risk</th>
                    <th className="text-right py-4 px-6 text-muted-foreground font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {agentMarketplaceData.map((agent, idx) => (
                    <tr key={agent.rank} className={`border-b border-border hover:bg-secondary transition-colors ${
                      idx < 3 ? 'bg-orange-accent/5' : ''
                    }`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          {idx < 3 && <Award size={16} className="text-orange-accent" />}
                          <span className="font-bold text-foreground">#{agent.rank}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-foreground">{agent.name}</td>
                      <td className="py-4 px-6 text-muted-foreground">{agent.strategy}</td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-bold text-green-positive">+{agent.return}%</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-semibold text-foreground">{agent.winRate}%</span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-semibold text-foreground flex items-center justify-end gap-1">
                          <Users size={14} />
                          {(agent.followers / 1000).toFixed(0)}K
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${
                          agent.riskProfile === 'Conservative' ? 'bg-green-positive/10 text-green-positive' :
                          agent.riskProfile === 'Balanced' ? 'bg-orange-accent/10 text-orange-accent' :
                          'bg-red-negative/10 text-red-negative'
                        }`}>
                          {agent.riskProfile}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="px-3 py-1 bg-secondary hover:bg-border rounded transition-colors text-xs font-medium">
                          Clone
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Agents', value: '247', icon: Users },
              { label: 'Avg Return (Top 10)', value: '+268%', icon: BarChart3 },
              { label: 'Total Followers', value: '98.5K', icon: Users },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={20} className="text-orange-accent" />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}
