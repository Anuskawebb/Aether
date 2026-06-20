'use client'

import { useRouter } from 'next/navigation'
import { useAgentCreation } from '@/context/agent-creation-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { Bot } from 'lucide-react'

const EXAMPLES = ['Smart Money Hunter', 'Momentum Trader', 'Meme Sniper', 'BSC Alpha']

export default function AgentNamePage() {
  const router = useRouter()
  const { state, updateName } = useAgentCreation()
  const name = state.name.trim()

  const handleContinue = () => {
    if (name) router.push('/agents/new/strategy')
  }

  return (
    <div>
      <ProgressBar currentStep={1} totalSteps={4} />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Name your agent</h2>
        <p className="text-sm text-muted-foreground">
          Give your trading agent a unique name. You can create more agents later.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Agent Name
        </label>
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Bot size={15} />
          </div>
          <input
            type="text"
            value={state.name}
            onChange={(e) => updateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name && handleContinue()}
            placeholder="e.g. Smart Money Hunter"
            maxLength={50}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-orange-accent focus:ring-1 focus:ring-orange-accent/30 transition-all text-sm"
            autoFocus
          />
        </div>
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">{state.name.length}/50</span>
        </div>
      </div>

      {/* Name suggestions */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-2">Need inspiration?</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => updateName(ex)}
              className="text-xs px-3 py-1.5 bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {name && (
        <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl mb-8">
          <div className="w-10 h-10 rounded-lg bg-orange-accent/10 flex items-center justify-center">
            <Bot size={18} className="text-orange-accent" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{name}</div>
            <div className="text-xs text-muted-foreground">Autonomous Trading Agent · BSC</div>
          </div>
          <div className="ml-auto px-2 py-0.5 rounded bg-secondary text-xs text-muted-foreground">
            Draft
          </div>
        </div>
      )}

      <StepNavigation
        currentStep={1}
        canGoBack
        canGoForward={!!name}
        onBack={() => router.push('/execution-center')}
        backButtonText="Cancel"
        onForward={handleContinue}
        forwardButtonDisabled={!name}
      />
    </div>
  )
}
