'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  fetchAgentWallet,
  fetchWalletBalance,
  fetchWalletPortfolio,
  fetchReadiness,
  type AgentWallet,
  type WalletBalance,
  type WalletPortfolio,
  type ReadinessData,
} from '@/lib/api'
import {
  Check, X, Copy, Wallet, TrendingUp, Activity,
  AlertTriangle, RefreshCw, Zap,
} from 'lucide-react'

const POLL_INTERVAL = 15_000

interface Props {
  agentId: string
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

function CheckItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <Check size={14} className="text-green-positive shrink-0" />
        : <X size={14} className="text-red-negative shrink-0" />
      }
      <span className={`text-sm ${ok ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  )
}

export default function WalletReadiness({ agentId }: Props) {
  const [account,   setAccount]   = useState<AgentWallet | null>(null)
  const [balance,   setBalance]   = useState<WalletBalance | null>(null)
  const [portfolio, setPortfolio] = useState<WalletPortfolio | null>(null)
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    const [a, b, p, r] = await Promise.all([
      fetchAgentWallet(agentId),
      fetchWalletBalance(agentId),
      fetchWalletPortfolio(agentId),
      fetchReadiness(agentId),
    ])
    setAccount(a.account)
    setBalance(b)
    setPortfolio(p)
    setReadiness(r)
    setLastRefresh(new Date())
    setLoading(false)
  }, [agentId])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [refresh])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/3 mb-4" />
            <div className="h-8 bg-secondary rounded w-2/3 mb-2" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const progressPct = readiness
    ? Math.min(100, (readiness.currentBalanceBnb / readiness.minimumRequiredBnb) * 100)
    : 0

  const isReady = readiness?.readyForTrading ?? false

  return (
    <div className="mb-8 space-y-6">

      {/* Status Banner */}
      <div className={`flex items-center justify-between px-5 py-3 rounded-lg border ${
        isReady
          ? 'bg-green-positive/10 border-green-positive/30'
          : 'bg-orange-accent/10 border-orange-accent/30'
      }`}>
        <div className="flex items-center gap-2">
          {isReady
            ? <Zap size={16} className="text-green-positive" />
            : <AlertTriangle size={16} className="text-orange-accent" />
          }
          <span className={`text-sm font-semibold ${isReady ? 'text-green-positive' : 'text-orange-accent'}`}>
            {isReady ? 'Ready For Trading' : readiness?.status === 'PENDING' ? 'Awaiting Wallet Setup' : 'Awaiting Funds'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw size={12} />
          {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Updating…'}
        </div>
      </div>

      {/* Three Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Wallet Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-orange-accent" />
            <h3 className="font-bold text-foreground text-sm">Agent Wallet</h3>
            {account && (
              <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                account.status === 'ACTIVE'
                  ? 'bg-green-positive/10 text-green-positive'
                  : 'bg-orange-accent/10 text-orange-accent'
              }`}>
                {account.status}
              </span>
            )}
          </div>

          {account ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Type</div>
                <div className="text-xs font-mono text-foreground">{account.accountType}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Address</div>
                <div className="flex items-center gap-2 bg-secondary rounded-md px-2.5 py-2">
                  <span className="text-xs font-mono text-foreground flex-1">
                    {truncateAddress(account.walletAddress)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(account.walletAddress)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy full address"
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono break-all">
                  {account.walletAddress}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No wallet found. Ensure TWAK sidecar is running and the wallet was created.
            </div>
          )}
        </div>

        {/* Balance + Funding Progress Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-orange-accent" />
            <h3 className="font-bold text-foreground text-sm">Balance</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {readiness ? readiness.currentBalanceBnb.toFixed(5) : '0.00000'} BNB
              </div>
              {balance?.usdValue && (
                <div className="text-sm text-muted-foreground">
                  ≈ ${parseFloat(balance.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
                </div>
              )}
            </div>

            {/* Funding Progress */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Funding Progress</span>
                <span>{progressPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${isReady ? 'bg-green-positive' : 'bg-orange-accent'}`}
                  style={{ width: `${Math.min(100, progressPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">
                  {readiness?.currentBalanceBnb.toFixed(5) ?? '0'} BNB
                </span>
                <span className="text-muted-foreground">
                  min {readiness?.minimumRequiredBnb.toFixed(3) ?? '0.005'} BNB
                </span>
              </div>
            </div>

            {/* Funding instructions if not funded */}
            {!isReady && account && (
              <div className="mt-2 p-3 bg-orange-accent/5 border border-orange-accent/20 rounded-md">
                <div className="text-xs font-medium text-orange-accent mb-2">
                  Fund this wallet to activate trading
                </div>
                <div className="flex items-center gap-2 bg-background/60 rounded px-2 py-1.5">
                  <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                    {account.walletAddress}
                  </span>
                  <button
                    onClick={() => copyToClipboard(account.walletAddress)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="Copy address"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  Send BNB on BSC (BEP-20) to this address.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Readiness Checklist + Portfolio Card */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          {/* Checklist */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} className="text-orange-accent" />
              <h3 className="font-bold text-foreground text-sm">Readiness</h3>
            </div>
            <div className="space-y-2.5">
              <CheckItem label="TWAK Connected"   ok={readiness?.twakConnected  ?? false} />
              <CheckItem label="Wallet Created"   ok={readiness?.walletCreated  ?? false} />
              <CheckItem label="Wallet Funded"    ok={readiness?.walletFunded   ?? false} />
              <CheckItem label="Ready For Trading" ok={readiness?.readyForTrading ?? false} />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Portfolio summary */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
            <div className="text-lg font-bold text-foreground">
              ${parseFloat(portfolio?.totalValueUsd ?? '0').toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            {portfolio && portfolio.assets.length > 0 ? (
              <div className="mt-2 space-y-1">
                {portfolio.assets.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{a.symbol ?? a.chain ?? '—'}</span>
                    <span className="text-foreground font-mono">
                      {parseFloat(a.balance ?? a.amount ?? '0').toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">No token holdings</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
