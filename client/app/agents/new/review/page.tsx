'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAgentCreation } from '@/context/agent-creation-context'
import { useAuth } from '@/context/auth-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { Bot, Shield, Zap, User } from 'lucide-react'

const riskLabels: Record<string, string> = {
  CONSERVATIVE: 'Conservative',
  BALANCED:     'Balanced',
  AGGRESSIVE:   'Aggressive',
}

const modeLabels: Record<string, string> = {
  AUTONOMOUS: 'Autonomous',
  ASSISTED:   'Assisted',
}

const modeIcons: Record<string, React.ElementType> = {
  AUTONOMOUS: Zap,
  ASSISTED:   User,
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function AgentReviewPage() {
  const router = useRouter()
  const { state, setCreatedAgentId } = useAgentCreation()
  const { getToken }                 = useAuth()
  const [creating, setCreating]      = useState(false)
  const [error, setError]            = useState<string | null>(null)

  const ModeIcon = modeIcons[state.tradingMode ?? 'AUTONOMOUS'] ?? Zap

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const token = await getToken()
      const res   = await fetch('/api/agents', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        state.name,
          riskLevel:   state.riskLevel,
          tradingMode: state.tradingMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Failed to create agent. Please try again.')
        return
      }

      const data = await res.json() as { agentId: string }
      setCreatedAgentId(data.agentId)
      router.push(`/agents/${data.agentId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <ProgressBar currentStep={4} totalSteps={4} />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Review &amp; create</h2>
        <p className="text-sm text-muted-foreground">
          Confirm your agent configuration before launching.
        </p>
      </div>

      {/* Agent preview card */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-accent/10 flex items-center justify-center">
            <Bot size={22} className="text-orange-accent" />
          </div>
          <div>
            <div className="text-base font-bold text-foreground">{state.name}</div>
            <div className="text-xs text-muted-foreground">Autonomous Trading Agent · BSC</div>
          </div>
          <div className="ml-auto px-2.5 py-1 rounded-full bg-secondary text-xs text-muted-foreground font-medium">
            Draft
          </div>
        </div>

        <div className="divide-y divide-border -mx-5">
          <Row label="Strategy"     value={riskLabels[state.riskLevel ?? ''] ?? '—'} />
          <Row label="Trading Mode" value={modeLabels[state.tradingMode ?? ''] ?? '—'} />
          <Row label="Network"      value="BNB Smart Chain" />
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-secondary/50 border border-border rounded-xl p-4 mb-8 space-y-2.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          After creation
        </div>
        <div className="flex items-start gap-3">
          <Shield size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs text-muted-foreground">An isolated TWAK agent wallet will be provisioned on BSC</span>
        </div>
        <div className="flex items-start gap-3">
          <ModeIcon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs text-muted-foreground">Fund the wallet with BNB to activate autonomous trading</span>
        </div>
        <div className="flex items-start gap-3">
          <Zap size={13} className="text-muted-foreground mt-0.5 shrink-0" />
          <span className="text-xs text-muted-foreground">Once funded your agent will begin executing trades</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-negative/10 border border-red-negative/30 rounded-lg text-xs text-red-negative">
          {error}
        </div>
      )}

      <StepNavigation
        currentStep={4}
        canGoBack={!creating}
        canGoForward
        onBack={() => router.push('/agents/new/mode')}
        onForward={handleCreate}
        forwardButtonText="Create Agent"
        loading={creating}
      />
    </div>
  )
}
