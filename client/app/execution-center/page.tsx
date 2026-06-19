import TopNavigation from '@/components/navigation/top-nav'
import { fetchExecutionCenter } from '@/lib/api'
import { Check, Clock, AlertCircle, X, Activity } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExecutionCenterPage() {
  const { stats, queue } = await fetchExecutionCenter()

  return (
    <>
      <TopNavigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Execution Center</h1>
            <p className="text-muted-foreground">Real-time trading execution and order management</p>
          </div>

          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Orders Processed', value: String(stats.ordersProcessed) },
              { label: 'Filled Orders', value: String(stats.ordersFilled) },
              { label: 'Failed Orders', value: String(stats.ordersFailed) },
              { label: 'Success Rate', value: `${stats.successRate}%` },
              { label: 'Avg Time', value: '2.3s' },
              { label: 'Open Positions', value: String(stats.openPositions) },
            ].map((metric) => (
              <div key={metric.label} className="bg-card border border-border rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
                <div className="text-lg font-bold text-foreground">{metric.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            {/* Execution Queue */}
            <div className="lg:col-span-3">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Execution Queue</h2>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 border-b border-border">
                  {['Pending', 'Processing', 'Filled', 'Failed'].map((tab) => (
                    <button key={tab} className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      tab === 'Processing'
                        ? 'border-orange-accent text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Orders Table */}
                <div className="space-y-2">
                  {queue.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No orders found</div>
                  ) : (
                    queue.map((order) => (
                      <div key={order.id} className="border border-border rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="font-bold text-foreground w-16">{order.token}</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              order.action === 'BUY' ? 'bg-green-positive/10 text-green-positive' : 'bg-red-negative/10 text-red-negative'
                            }`}>
                              {order.action}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${order.amountUsd?.toFixed(2) ?? '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="w-24">
                            <div className="flex items-center justify-center">
                              {order.status === 'FILLED' && <Check size={18} className="text-green-positive" />}
                              {order.status === 'PROCESSING' && <Activity size={18} className="text-orange-accent animate-pulse" />}
                              {order.status === 'PENDING' && <Clock size={18} className="text-muted-foreground" />}
                              {order.status === 'FAILED' && <X size={18} className="text-red-negative" />}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground w-28 text-right">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-bold text-foreground mb-4">System Health</h3>
                <div className="space-y-3">
                  {[
                    { service: 'Execution Engine', status: 'healthy' },
                    { service: 'Risk Engine', status: 'healthy' },
                    { service: 'Portfolio Engine', status: 'healthy' },
                    { service: 'TWAK Adapter', status: 'healthy' },
                    { service: 'CMC Agent Hub', status: 'healthy' },
                    { service: 'BNB Agent SDK', status: 'degraded' },
                  ].map((sys) => (
                    <div key={sys.service} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{sys.service}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        sys.status === 'healthy' ? 'bg-green-positive' : 'bg-orange-accent'
                      }`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Alerts */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Risk Alerts
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { alert: `Drawdown: -${stats.drawdownPct.toFixed(1)}%`, severity: stats.drawdownPct > 5 ? 'warning' : 'info' },
                    { alert: `Exposure: ${stats.openRiskPct.toFixed(1)}%`, severity: 'info' },
                    { alert: `Open positions: ${stats.openPositions}`, severity: 'info' },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-2 rounded border ${
                      item.severity === 'warning'
                        ? 'bg-orange-accent/10 border-orange-accent/30'
                        : 'bg-secondary border-border'
                    }`}>
                      <div className="text-xs">{item.alert}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Execution Timeline */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h2 className="text-lg font-bold text-foreground mb-6">Execution Timeline</h2>
            <div className="space-y-4 relative pl-8">
              {queue.slice(0, 5).map((order, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="absolute left-0 w-6 h-6 rounded-full bg-secondary border-2 border-orange-accent flex items-center justify-center text-xs font-bold text-orange-accent">
                    {order.action === 'BUY' ? '↑' : '↓'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">
                      {order.action} {order.token} — ${order.amountUsd?.toFixed(2) ?? '—'}
                    </div>
                    <div className="text-sm text-muted-foreground">{order.status}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Logs */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Execution Logs</h2>
            <div className="bg-secondary rounded-lg p-4 font-mono text-xs text-muted-foreground space-y-1 max-h-64 overflow-y-auto">
              {queue.slice(0, 8).map((order, idx) => (
                <div key={idx}>
                  <span className={order.status === 'FILLED' || order.status === 'PROCESSING' ? 'text-green-positive' : 'text-orange-accent'}>
                    [{new Date(order.createdAt).toLocaleTimeString()}]
                  </span>
                  {' '}{order.action} {order.token} — ${order.amountUsd?.toFixed(2) ?? '—'} [{order.status}]
                </div>
              ))}
              {queue.length === 0 && <div>No execution logs available</div>}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
