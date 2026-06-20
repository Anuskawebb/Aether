import TopNavigation from '@/components/navigation/top-nav'
import { tradeExplainabilityData } from '@/lib/mock-data-advanced'
import { ChevronRight, CheckCircle, AlertCircle, TrendingUp, Lock, BarChart3, Clock } from 'lucide-react'

export default function TradeDetailsPage() {
  const { trade, reasoning, executionTimeline, pnlTimeline, transactionDetails } = tradeExplainabilityData

  return (
    <>
      <TopNavigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Trade Header */}
          <div className="bg-card border border-border rounded-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Token</div>
                <div className="text-3xl font-bold text-foreground">{trade.token}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Action</div>
                <div className="text-3xl font-bold text-green-positive">{trade.action}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Position Size</div>
                <div className="text-3xl font-bold text-foreground">{trade.positionSize}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Confidence</div>
                <div className="text-3xl font-bold text-orange-accent">{(trade.confidence * 100).toFixed(0)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Status</div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-positive/10 text-green-positive font-semibold">
                  <CheckCircle size={16} />
                  {trade.status}
                </div>
              </div>
            </div>
          </div>

          {/* Reasoning Tree */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-foreground">Decision Reasoning</h2>

            {/* Smart Money Layer */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <TrendingUp size={20} className="text-orange-accent" />
                <h3 className="text-lg font-bold text-foreground">Smart Money Layer</h3>
              </div>

              <div className="space-y-6">
                {/* Wallet Accumulation */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-3">Wallet Accumulation</div>
                  <div className="bg-secondary rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Major Wallets</div>
                        <div className="text-2xl font-bold text-green-positive">{reasoning.smartMoneyLayer.walletAccumulation.major.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Emerging Wallets</div>
                        <div className="text-2xl font-bold text-orange-accent">{reasoning.smartMoneyLayer.walletAccumulation.emerging.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Avg Position</div>
                        <div className="text-2xl font-bold text-foreground">+$2.1K</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{reasoning.smartMoneyLayer.walletAccumulation.description}</div>
                </div>

                {/* Wallet Score Changes */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-3">Wallet Score Changes</div>
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Score Improved</div>
                        <div className="text-2xl font-bold text-green-positive">{reasoning.smartMoneyLayer.walletScoreChanges.improved}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Score Declined</div>
                        <div className="text-2xl font-bold text-red-negative">{reasoning.smartMoneyLayer.walletScoreChanges.declined}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Avg Improvement</div>
                        <div className="text-2xl font-bold text-orange-accent">+{reasoning.smartMoneyLayer.walletScoreChanges.avgImprovement}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Inflows */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-3">Net Inflows (24h)</div>
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-3xl font-bold text-green-positive">${(reasoning.smartMoneyLayer.netInflows.amount / 1000000).toFixed(2)}M</div>
                        <div className="text-xs text-muted-foreground">
                          Momentum: <span className="text-green-positive font-semibold capitalize">{reasoning.smartMoneyLayer.netInflows.momentum}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-accent">+{reasoning.smartMoneyLayer.netInflows.percentage}%</div>
                        <div className="text-xs text-muted-foreground">vs 24h ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Engine */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <Lock size={20} className="text-orange-accent" />
                <h3 className="text-lg font-bold text-foreground">Risk Engine Approval</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">Portfolio Exposure</span>
                    <span className="text-foreground">{reasoning.riskEngine.exposureAnalysis.current}% / {reasoning.riskEngine.exposureAnalysis.limit}%</span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-positive"
                      style={{ width: `${(reasoning.riskEngine.exposureAnalysis.current / reasoning.riskEngine.exposureAnalysis.limit) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-green-positive mt-2 font-semibold">Status: {reasoning.riskEngine.exposureAnalysis.status.toUpperCase()}</div>
                </div>

                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">Max Drawdown</span>
                    <span className="text-foreground">{reasoning.riskEngine.drawdownAnalysis.maxDrawdown}% / {reasoning.riskEngine.drawdownAnalysis.daily}% daily</span>
                  </div>
                  <div className="text-xs text-green-positive font-semibold">Status: {reasoning.riskEngine.drawdownAnalysis.status.toUpperCase()}</div>
                </div>

                <div className="bg-secondary rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-foreground">Position Size Constraint</span>
                    <span className="text-foreground">{reasoning.riskEngine.portfolioConstraints.currentPosition}% / {reasoning.riskEngine.portfolioConstraints.maxPositionSize}%</span>
                  </div>
                  <div className="text-xs text-green-positive font-semibold">Status: {reasoning.riskEngine.portfolioConstraints.constraint.toUpperCase()}</div>
                </div>
              </div>
            </div>

            {/* Market Context */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
                <BarChart3 size={20} className="text-orange-accent" />
                <h3 className="text-lg font-bold text-foreground">Market Context</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-4">
                  <div className="text-sm font-semibold text-foreground mb-3">Price Action</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Support</div>
                      <div className="text-xl font-bold text-green-positive">${reasoning.marketContext.priceAction.support}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Current</div>
                      <div className="text-xl font-bold text-foreground">${reasoning.marketContext.priceAction.currentPrice}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Resistance</div>
                      <div className="text-xl font-bold text-red-negative">${reasoning.marketContext.priceAction.resistance}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">{reasoning.marketContext.priceAction.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-2">Liquidity Status</div>
                    <div className="font-semibold text-foreground capitalize">{reasoning.marketContext.liquidity.depthAnalysis}</div>
                    <div className="text-xs text-muted-foreground mt-2">Volume 24h: ${(reasoning.marketContext.liquidity.volume24h / 1000000).toFixed(0)}M</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4">
                    <div className="text-xs text-muted-foreground mb-2">Sentiment</div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-positive/10 text-green-positive capitalize">
                        {reasoning.marketContext.sentiment.onchain}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-positive/10 text-green-positive capitalize">
                        Whale: Accumulating
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Execution Timeline */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Clock size={20} />
              Execution Timeline
            </h2>

            <div className="space-y-4">
              {executionTimeline.map((event, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-orange-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {event.step}
                    </div>
                    {idx < executionTimeline.length - 1 && (
                      <div className="w-0.5 h-12 bg-border my-2" />
                    )}
                  </div>
                  <div className="pt-1 pb-4 flex-1">
                    <div className="font-semibold text-foreground">{event.event}</div>
                    <div className="text-xs text-muted-foreground">{event.timestamp}</div>
                    <div className="text-sm text-muted-foreground mt-1">{event.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PnL Timeline */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">PnL Timeline</h2>
            <div className="h-32 bg-secondary rounded-lg p-4 flex items-end gap-2">
              {pnlTimeline.map((point, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-positive rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(point.pnl / 20, 4)}px` }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{point.time}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <div className="text-2xl font-bold text-green-positive">+$1,456 PnL</div>
              <div className="text-sm text-muted-foreground">Current unrealized P&L</div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-6">Transaction Details</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Hash</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Amount</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Price</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Total</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">Gas</th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionDetails.map((tx) => (
                    <tr key={tx.hash} className="border-b border-border hover:bg-secondary transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-orange-accent cursor-pointer hover:underline">
                        {tx.hash.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-positive/10 text-green-positive">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">{tx.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-foreground">${tx.price.toFixed(3)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">${tx.total.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{tx.gas} gwei</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-positive/10 text-green-positive capitalize">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
