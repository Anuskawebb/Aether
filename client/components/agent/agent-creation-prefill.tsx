'use client'

import { useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { useAgentCreation } from '@/context/agent-creation-context'
import { usePrivy } from '@privy-io/react-auth'

/**
 * Pre-fills agent risk/mode from the user's profile preferences.
 * This gives the agent defaults that match what the user said during onboarding.
 */
export default function AgentCreationPrefill() {
  const { getToken }                        = useAuth()
  const { state, updateRiskLevel, updateTradingMode } = useAgentCreation()
  const { authenticated }                   = usePrivy()

  useEffect(() => {
    if (!authenticated || state.riskLevel || state.tradingMode) return

    void (async () => {
      try {
        const token = await getToken()
        const res   = await fetch('/api/me/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache:   'no-store',
        })
        if (!res.ok) return
        const data = await res.json() as {
          profile?: { riskTolerance?: string; tradingPreference?: string }
        }
        const p = data.profile
        if (!p) return

        if (p.riskTolerance) {
          // Map LOW→CONSERVATIVE, MEDIUM→BALANCED, HIGH→AGGRESSIVE
          const map: Record<string, 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'> = {
            LOW: 'CONSERVATIVE', MEDIUM: 'BALANCED', HIGH: 'AGGRESSIVE',
          }
          const rl = map[p.riskTolerance]
          if (rl) updateRiskLevel(rl)
        }
        if (p.tradingPreference) {
          const tp = p.tradingPreference as 'AUTONOMOUS' | 'ASSISTED' | 'MANUAL'
          if (tp === 'AUTONOMOUS' || tp === 'ASSISTED') updateTradingMode(tp)
          else updateTradingMode('AUTONOMOUS') // MANUAL maps to AUTONOMOUS for agents
        }
      } catch {
        // Non-critical
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  return null
}
