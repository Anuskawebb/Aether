'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { usePrivy } from '@privy-io/react-auth'
import TopNavigation from '@/components/navigation/top-nav'
import {
  Bot, Wallet, Plus, Loader2, Check, Copy, ArrowLeft, Zap,
  AlertTriangle, DollarSign, ArrowRight, Search, X, User,
  Coins, TrendingUp,
} from 'lucide-react'

interface Agent {
  id: string; name: string; status: string
  riskLevel: string; tradingMode: string
  walletAddress: string | null; accountStatus: string | null
}
interface Balance {
  bnb: number; usdValue: string | null; funded: boolean; minimum: number
}
interface TokenItem  { address: string; symbol: string; name: string }
interface TraderItem { wallet: string; label: string | null; rank?: string; classification?: string }

function copyText(t: string) { navigator.clipboard.writeText(t).catch(() => {}) }
function short(a: string)    { return `${a.slice(0, 10)}…${a.slice(-6)}` }
function shortWallet(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}` }

const POLL_INTERVAL = 12_000

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = use(params)
  const router          = useRouter()
  const { getToken }    = useAuth()
  const { authenticated } = usePrivy()

  const [agent,        setAgent]        = useState<Agent | null>(null)
  const [balance,      setBalance]      = useState<Balance | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionErr, setProvisionErr] = useState<string | null>(null)
  const [activating,   setActivating]   = useState(false)
  const [activateErr,  setActivateErr]  = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Config state
  const [selectedTokens,  setSelectedTokens]  = useState<TokenItem[]>([])
  const [selectedTraders, setSelectedTraders] = useState<TraderItem[]>([])
  const [availTokens,     setAvailTokens]     = useState<TokenItem[]>([])
  const [availTraders,    setAvailTraders]     = useState<TraderItem[]>([])
  const [tokenSearch,     setTokenSearch]     = useState('')
  const [traderSearch,    setTraderSearch]    = useState('')
  const [configSaving,    setConfigSaving]    = useState(false)
  const [configSaved,     setConfigSaved]     = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getHeaders = async (): Promise<HeadersInit> => {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchBalance = async (headers: HeadersInit) => {
    const res = await fetch(`/api/agents/${agentId}/wallet/balance`, { headers, cache: 'no-store' })
    if (!res.ok) return
    const b = await res.json() as { bnb?: number; usdValue?: string; funded?: boolean; minimumRequiredBnb?: number }
    setBalance({ bnb: b.bnb ?? 0, usdValue: b.usdValue ?? null, funded: b.funded ?? false, minimum: b.minimumRequiredBnb ?? 0.005 })
  }

  const fetchAgent = async () => {
    const headers = await getHeaders()
    const res = await fetch('/api/agents', { headers, cache: 'no-store' })
    if (!res.ok) { setError('Agent not found'); setLoading(false); return }
    const data  = await res.json() as { agents: Agent[] }
    const found = data.agents.find((a) => a.id === agentId)
    if (!found) { setError('Agent not found'); setLoading(false); return }
    setAgent(found)
    if (found.walletAddress) await fetchBalance(headers)
    setLoading(false)
  }

  const fetchConfig = async () => {
    const headers = await getHeaders()
    const [configRes, tokensRes, tradersRes] = await Promise.all([
      fetch(`/api/agents/${agentId}/config`, { headers, cache: 'no-store' }),
      fetch('/api/signals?limit=30',         { headers, cache: 'no-store' }),
      fetch('/api/traders?limit=20',         { headers, cache: 'no-store' }),
    ])

    if (configRes.ok) {
      const d = await configRes.json() as { tokens: TokenItem[]; traders: TraderItem[] }
      setSelectedTokens(d.tokens)
      setSelectedTraders(d.traders)
    }
    if (tokensRes.ok) {
      const d = await tokensRes.json() as { signals?: { tokenAddress: string; token: string }[] }
      const raw = d.signals ?? []
      setAvailTokens(raw.map((t) => ({ address: t.tokenAddress, symbol: t.token, name: t.token })))
    }
    if (tradersRes.ok) {
      const d = await tradersRes.json() as { traders?: { wallet: string; rankScore?: string; classification?: string }[] }
      setAvailTraders((d.traders ?? []).map((t) => ({ wallet: t.wallet, label: null, rank: t.rankScore, classification: t.classification })))
    }
  }

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const headers = await getHeaders()
      await fetchBalance(headers)
    }, POLL_INTERVAL)
  }
  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => {
    if (authenticated) { void fetchAgent(); void fetchConfig() }
    return () => stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, agentId])

  useEffect(() => {
    if (!agent?.walletAddress) return
    if (agent.status === 'ACTIVE') { stopPolling(); return }
    if (!balance?.funded) startPolling(); else stopPolling()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.walletAddress, agent?.status, balance?.funded])

  const handleSetupWallet = async () => {
    setProvisioning(true); setProvisionErr(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/agents/${agentId}/wallet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: agent?.name, riskLevel: agent?.riskLevel?.toLowerCase(), tradingMode: agent?.tradingMode?.toLowerCase() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setProvisionErr(d.error ?? 'Failed to create wallet')
      } else { await fetchAgent() }
    } catch {
      setProvisionErr('TWAK sidecar is not reachable. Start it at http://127.0.0.1:3002 then try again.')
    } finally { setProvisioning(false) }
  }

  const handleSaveConfig = async () => {
    setConfigSaving(true)
    try {
      const token = await getToken()
      await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: selectedTokens, traders: selectedTraders }),
      })
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
    } finally { setConfigSaving(false) }
  }

  const handleActivate = async () => {
    setActivating(true); setActivateErr(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/agents/${agentId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setActivateErr(d.error ?? 'Activation failed')
      } else {
        setAgent((a) => a ? { ...a, status: 'ACTIVE' } : a)
        stopPolling()
        setTimeout(() => router.push('/execution-center'), 1200)
      }
    } catch { setActivateErr('Network error — please try again') }
    finally { setActivating(false) }
  }

  const handleCopy = (addr: string) => { copyText(addr); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const toggleToken = (t: TokenItem) => {
    setSelectedTokens((prev) =>
      prev.some((x) => x.address === t.address) ? prev.filter((x) => x.address !== t.address) : [...prev, t]
    )
  }
  const toggleTrader = (t: TraderItem) => {
    setSelectedTraders((prev) =>
      prev.some((x) => x.wallet === t.wallet) ? prev.filter((x) => x.wallet !== t.wallet) : [...prev, t]
    )
  }

  if (loading) return (
    <><TopNavigation /><div className="flex items-center justify-center min-h-screen"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div></>
  )
  if (error || !agent) return (
    <><TopNavigation /><main className="max-w-2xl mx-auto px-6 py-16 text-center"><p className="text-muted-foreground mb-4">{error ?? 'Agent not found'}</p><button onClick={() => router.push('/execution-center')} className="text-sm text-orange-accent underline">Back</button></main></>
  )

  const hasWallet  = !!agent.walletAddress
  const isFunded   = balance?.funded ?? false
  const isActive   = agent.status === 'ACTIVE'
  const hasConfig  = selectedTokens.length > 0 || selectedTraders.length > 0
  const progressPct = Math.min(100, ((balance?.bnb ?? 0) / (balance?.minimum ?? 0.005)) * 100)
  const riskLabel  = { CONSERVATIVE: 'Conservative', BALANCED: 'Balanced', AGGRESSIVE: 'Aggressive' }
  const modeLabel  = { AUTONOMOUS: 'Autonomous', ASSISTED: 'Assisted' }

  const filteredTokens  = availTokens.filter((t) =>
    t.symbol.toLowerCase().includes(tokenSearch.toLowerCase()) || t.address.toLowerCase().includes(tokenSearch.toLowerCase())
  )
  const filteredTraders = availTraders.filter((t) =>
    t.wallet.toLowerCase().includes(traderSearch.toLowerCase()) || (t.classification ?? '').toLowerCase().includes(traderSearch.toLowerCase())
  )

  return (
    <>
      <TopNavigation />
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-10">

          <button onClick={() => router.push('/execution-center')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={14} /> Execution Center
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-orange-accent/10 flex items-center justify-center shrink-0">
              <Bot size={26} className="text-orange-accent" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-green-positive/10 text-green-positive' :
                  agent.status === 'PENDING_FUNDING' ? 'bg-orange-accent/10 text-orange-accent' :
                  'bg-secondary text-muted-foreground'
                }`}>{agent.status.replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{riskLabel[agent.riskLevel as keyof typeof riskLabel] ?? agent.riskLevel}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{modeLabel[agent.tradingMode as keyof typeof modeLabel] ?? agent.tradingMode}</span>
              </div>
            </div>
          </div>

          {/* ── Step 1: Wallet ──────────────────────────────── */}
          <StepHeader n={1} done={hasWallet} active label="Create Execution Account" />
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            {hasWallet ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-positive font-medium">
                  <Check size={14} strokeWidth={2.5} /> Wallet provisioned via TWAK
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2.5">
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{short(agent.walletAddress!)}</span>
                  <button onClick={() => handleCopy(agent.walletAddress!)} className="text-muted-foreground hover:text-foreground shrink-0">
                    {copied ? <Check size={12} className="text-green-positive" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground break-all">{agent.walletAddress}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Wallet size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">No execution account yet</p>
                    <p className="text-xs text-muted-foreground">A TWAK-managed BSC wallet will be assigned to this agent.</p>
                  </div>
                </div>
                {provisionErr && <div className="p-3 bg-red-negative/10 border border-red-negative/20 rounded-lg text-xs text-red-negative">{provisionErr}</div>}
                <button onClick={handleSetupWallet} disabled={provisioning}
                  style={!provisioning ? { backgroundColor: 'var(--orange-accent)' } : undefined}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity ${provisioning ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'hover:opacity-90'}`}
                >
                  {provisioning ? <><Loader2 size={14} className="animate-spin" /> Creating Wallet…</> : <><Plus size={14} /> Create Execution Account</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Step 2: Fund ────────────────────────────────── */}
          <StepHeader n={2} done={isFunded && hasWallet} active={hasWallet} label="Fund Agent Wallet"
            suffix={hasWallet && !isFunded ? <span className="text-[10px] text-muted-foreground/50">Checking every 12s…</span> : undefined}
          />
          {hasWallet ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 mb-6">
              {isFunded
                ? <div className="flex items-center gap-2 text-sm text-green-positive font-medium"><Check size={14} strokeWidth={2.5} /> Wallet funded — ready for trading</div>
                : <div className="flex items-start gap-3"><AlertTriangle size={16} className="text-orange-accent mt-0.5 shrink-0" /><div><p className="text-sm font-medium text-foreground mb-1">Send BNB to activate this agent</p><p className="text-xs text-muted-foreground">Minimum {balance?.minimum ?? 0.005} BNB required. BNB Smart Chain (BEP-20) only.</p></div></div>
              }
              <div>
                <div className="text-2xl font-bold text-foreground tracking-tight">{(balance?.bnb ?? 0).toFixed(5)} <span className="text-sm font-normal text-muted-foreground">BNB</span></div>
                {balance?.usdValue && <div className="text-xs text-muted-foreground mt-0.5">≈ ${parseFloat(balance.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD</div>}
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5"><span>Funding Progress</span><span>{progressPct.toFixed(0)}%</span></div>
                <div className="w-full bg-secondary rounded-full h-1.5"><div className={`h-1.5 rounded-full transition-all duration-700 ${isFunded ? 'bg-green-positive' : 'bg-orange-accent'}`} style={{ width: `${progressPct}%` }} /></div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>{(balance?.bnb ?? 0).toFixed(5)} BNB current</span><span>min {balance?.minimum ?? 0.005} BNB</span></div>
              </div>
              {!isFunded && (
                <div className="p-3 bg-orange-accent/5 border border-orange-accent/15 rounded-lg">
                  <div className="text-[10px] font-semibold text-orange-accent uppercase tracking-widest mb-2"><DollarSign size={10} className="inline mr-1" />Send BNB to</div>
                  <div className="flex items-center gap-2 bg-background rounded px-2.5 py-2">
                    <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{agent.walletAddress}</span>
                    <button onClick={() => handleCopy(agent.walletAddress!)} className="text-muted-foreground hover:text-foreground shrink-0">
                      {copied ? <Check size={11} className="text-green-positive" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 opacity-40 mb-6">
              <p className="text-sm text-muted-foreground">Complete Step 1 first</p>
            </div>
          )}

          {/* ── Step 3: Configure ───────────────────────────── */}
          <StepHeader n={3} done={hasConfig && isFunded} active={isFunded && hasWallet} label="Configure Strategy" />
          {isFunded && hasWallet ? (
            <div className="bg-card border border-border rounded-xl p-5 space-y-6 mb-6">
              {/* Tokens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Coins size={14} className="text-orange-accent" />
                    <span className="text-sm font-semibold text-foreground">Tokens to Trade</span>
                    {selectedTokens.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-accent/10 text-orange-accent font-semibold">{selectedTokens.length}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">max 20 · from smart money signals</span>
                </div>

                {/* Selected tokens */}
                {selectedTokens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedTokens.map((t) => (
                      <button key={t.address} onClick={() => toggleToken(t)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-accent/10 border border-orange-accent/20 text-xs text-orange-accent hover:bg-red-negative/10 hover:border-red-negative/20 hover:text-red-negative transition-colors">
                        {t.symbol} <X size={10} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Token search + list */}
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={tokenSearch} onChange={(e) => setTokenSearch(e.target.value)} placeholder="Search tokens…"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-secondary rounded-lg border border-border focus:outline-none focus:border-orange-accent placeholder:text-muted-foreground/50" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {filteredTokens.map((t) => {
                    const sel = selectedTokens.some((x) => x.address === t.address)
                    return (
                      <button key={t.address} onClick={() => toggleToken(t)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${sel ? 'bg-orange-accent/10 border border-orange-accent/30 text-orange-accent' : 'bg-secondary hover:bg-secondary/80 text-foreground border border-transparent'}`}>
                        {sel ? <Check size={11} className="shrink-0" /> : <div className="w-2.5 h-2.5 rounded-full border border-border shrink-0" />}
                        <span className="truncate">{t.symbol}</span>
                      </button>
                    )
                  })}
                  {filteredTokens.length === 0 && <p className="col-span-2 text-xs text-muted-foreground py-2 text-center">No signals found</p>}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Traders */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-orange-accent" />
                    <span className="text-sm font-semibold text-foreground">Traders to Copy</span>
                    {selectedTraders.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-accent/10 text-orange-accent font-semibold">{selectedTraders.length}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground">max 10 · ranked by score</span>
                </div>

                {/* Selected traders */}
                {selectedTraders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedTraders.map((t) => (
                      <button key={t.wallet} onClick={() => toggleTrader(t)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-accent/10 border border-orange-accent/20 text-xs text-orange-accent hover:bg-red-negative/10 hover:border-red-negative/20 hover:text-red-negative transition-colors font-mono">
                        {shortWallet(t.wallet)} <X size={10} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative mb-2">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={traderSearch} onChange={(e) => setTraderSearch(e.target.value)} placeholder="Search by address or type…"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-secondary rounded-lg border border-border focus:outline-none focus:border-orange-accent placeholder:text-muted-foreground/50" />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {filteredTraders.map((t) => {
                    const sel = selectedTraders.some((x) => x.wallet === t.wallet)
                    return (
                      <button key={t.wallet} onClick={() => toggleTrader(t)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-colors ${sel ? 'bg-orange-accent/10 border border-orange-accent/30' : 'bg-secondary hover:bg-secondary/80 border border-transparent'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${sel ? 'bg-orange-accent/20' : 'bg-border'}`}>
                          {sel ? <Check size={11} className="text-orange-accent" /> : <User size={10} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-mono text-foreground">{shortWallet(t.wallet)}</div>
                          <div className="text-muted-foreground capitalize">{t.classification ?? 'unknown'}</div>
                        </div>
                        {t.rank && <div className="text-[10px] font-semibold text-orange-accent shrink-0">#{parseFloat(t.rank).toFixed(0)}</div>}
                      </button>
                    )
                  })}
                  {filteredTraders.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">No traders found</p>}
                </div>
              </div>

              {/* Save button */}
              <button onClick={handleSaveConfig} disabled={configSaving || (!selectedTokens.length && !selectedTraders.length)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  configSaved ? 'bg-green-positive/10 border border-green-positive/20 text-green-positive' :
                  (!selectedTokens.length && !selectedTraders.length) ? 'bg-secondary text-muted-foreground/40 cursor-not-allowed' :
                  'bg-secondary hover:bg-secondary/70 text-foreground border border-border'
                }`}
              >
                {configSaving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> :
                 configSaved  ? <><Check size={14} /> Configuration Saved</> :
                               'Save Configuration'}
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 opacity-40 mb-6">
              <p className="text-sm text-muted-foreground">Fund your wallet first to configure strategy</p>
            </div>
          )}

          {/* ── Step 4: Activate ────────────────────────────── */}
          <StepHeader n={4} done={isActive} active={isFunded && hasWallet && hasConfig} label="Activate Agent" />
          <div className={`bg-card border rounded-xl p-5 mb-10 ${
            isActive ? 'border-green-positive/30' :
            isFunded && hasWallet && hasConfig ? 'border-orange-accent/30' :
            'border-border opacity-40'
          }`}>
            {isActive ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-positive/10 flex items-center justify-center shrink-0">
                  <Check size={16} className="text-green-positive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-positive">Agent is ACTIVE</p>
                  <p className="text-xs text-muted-foreground">Redirecting to Execution Center…</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {!isFunded ? 'Fund your wallet first' :
                     !hasConfig ? 'Select at least one token or trader' :
                     'Ready to go live on BSC'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {agent.name} will copy selected traders and trade selected tokens autonomously.
                  </p>
                  {activateErr && <p className="text-xs text-red-negative mt-2">{activateErr}</p>}
                </div>
                <button onClick={handleActivate} disabled={!isFunded || !hasConfig || activating}
                  style={isFunded && hasConfig && !activating ? { backgroundColor: 'var(--orange-accent)' } : undefined}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-opacity ${
                    isFunded && hasConfig && !activating ? 'text-white hover:opacity-90' : 'bg-secondary text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  {activating ? <><Loader2 size={12} className="animate-spin" /> Activating…</> : <><Zap size={12} /> Activate</>}
                </button>
              </div>
            )}
          </div>

          <button onClick={() => router.push('/execution-center')}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors">
            Go to Execution Center <ArrowRight size={14} />
          </button>

        </div>
      </main>
    </>
  )
}

function StepHeader({ n, done, active, label, suffix }: {
  n: number; done: boolean; active: boolean; label: string; suffix?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done   ? 'bg-green-positive text-white' :
        active ? 'bg-orange-accent/20 border border-orange-accent text-orange-accent' :
                 'bg-secondary border border-border text-muted-foreground/40'
      }`}>
        {done ? <Check size={13} strokeWidth={3} /> : n}
      </div>
      <h2 className={`text-base font-semibold flex-1 ${active || done ? 'text-foreground' : 'text-muted-foreground/40'}`}>{label}</h2>
      {suffix}
    </div>
  )
}
