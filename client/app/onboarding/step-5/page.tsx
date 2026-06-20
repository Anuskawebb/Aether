'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding, type CapitalRange } from '@/context/onboarding-context'
import { useAuth } from '@/context/auth-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { Check, DollarSign } from 'lucide-react'

const options: { id: CapitalRange; label: string; desc: string }[] = [
  { id: 'UNDER_100',   label: 'Under $100',      desc: 'Starting small, testing the waters' },
  { id: '100_TO_1000', label: '$100 – $1,000',   desc: 'Building a meaningful position' },
  { id: 'OVER_1000',   label: '$1,000+',          desc: 'Serious capital deployment' },
]

export default function Step5Page() {
  const router   = useRouter()
  const { state, updateCapitalRange } = useOnboarding()
  const { getToken, markOnboardingComplete, updateIdentity } = useAuth()
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  const canContinue = !!state.capitalRange

  const handleComplete = async () => {
    if (!canContinue || saving) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const res   = await fetch('/api/me/profile', {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:           state.username,
          displayName:        state.displayName,
          profileImageUrl:    state.profileImageUrl || undefined,
          experience:         state.experience,
          goals:              state.goals,
          riskTolerance:      state.riskTolerance,
          tradingPreference:  state.tradingPreference,
          capitalRange:       state.capitalRange,
          onboardingCompleted: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Failed to save profile. Please try again.')
        return
      }

      // Update local auth state so AuthGate stops redirecting
      markOnboardingComplete()
      updateIdentity({ username: state.username, displayName: state.displayName })

      router.replace('/execution-center')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <ProgressBar currentStep={5} />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Capital range</h2>
        <p className="text-sm text-muted-foreground">
          How much are you looking to deploy? This helps size agent recommendations.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {options.map((o) => {
          const isSelected = state.capitalRange === o.id
          return (
            <button
              key={o.id}
              onClick={() => updateCapitalRange(o.id)}
              className={`w-full text-left p-5 bg-card border rounded-xl transition-all ${
                isSelected
                  ? 'border-orange-accent ring-1 ring-orange-accent/30'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'bg-orange-accent/10 text-orange-accent' : 'bg-secondary text-muted-foreground'
                }`}>
                  <DollarSign size={15} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground mb-0.5">{o.label}</div>
                  <div className="text-xs text-muted-foreground">{o.desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isSelected ? 'border-orange-accent bg-orange-accent' : 'border-border'
                }`}>
                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-negative/10 border border-red-negative/30 rounded-lg text-xs text-red-negative">
          {error}
        </div>
      )}

      <StepNavigation
        currentStep={5}
        canGoBack={!saving}
        canGoForward={canContinue}
        onBack={() => router.push('/onboarding/step-4')}
        onForward={handleComplete}
        forwardButtonText="Complete Setup"
        forwardButtonDisabled={!canContinue || saving}
        loading={saving}
      />
    </div>
  )
}
