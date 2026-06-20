'use client'

import React, { createContext, useContext, useState } from 'react'

export type AgentRiskLevel   = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
export type AgentTradingMode = 'AUTONOMOUS' | 'ASSISTED'

export interface AgentCreationState {
  name:           string
  riskLevel:      AgentRiskLevel   | null
  tradingMode:    AgentTradingMode | null
  createdAgentId: string | null
}

interface AgentCreationContextType {
  state:             AgentCreationState
  updateName:        (v: string)           => void
  updateRiskLevel:   (v: AgentRiskLevel)   => void
  updateTradingMode: (v: AgentTradingMode) => void
  setCreatedAgentId: (id: string)          => void
  reset:             () => void
}

const initialState: AgentCreationState = {
  name: '', riskLevel: null, tradingMode: null, createdAgentId: null,
}

const AgentCreationContext = createContext<AgentCreationContextType | undefined>(undefined)

export function AgentCreationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AgentCreationState>(initialState)

  const set = <K extends keyof AgentCreationState>(key: K, value: AgentCreationState[K]) =>
    setState((p) => ({ ...p, [key]: value }))

  return (
    <AgentCreationContext.Provider value={{
      state,
      updateName:        (v) => set('name',           v),
      updateRiskLevel:   (v) => set('riskLevel',      v),
      updateTradingMode: (v) => set('tradingMode',    v),
      setCreatedAgentId: (v) => set('createdAgentId', v),
      reset:             ()  => setState(initialState),
    }}>
      {children}
    </AgentCreationContext.Provider>
  )
}

export function useAgentCreation() {
  const ctx = useContext(AgentCreationContext)
  if (!ctx) throw new Error('useAgentCreation must be inside AgentCreationProvider')
  return ctx
}
