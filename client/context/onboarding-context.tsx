'use client'

import React, { createContext, useContext, useState } from 'react'

export type Experience        = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type Goals             = 'CAPITAL_PRESERVATION' | 'BALANCED_GROWTH' | 'AGGRESSIVE_GROWTH' | 'SPECULATIVE'
export type RiskTolerance     = 'LOW' | 'MEDIUM' | 'HIGH'
export type TradingPreference = 'MANUAL' | 'ASSISTED' | 'AUTONOMOUS'
export type CapitalRange      = 'UNDER_100' | '100_TO_1000' | 'OVER_1000'

export interface OnboardingState {
  currentStep:       number
  username:          string
  displayName:       string
  profileImageUrl:   string
  experience:        Experience        | null
  goals:             Goals             | null
  riskTolerance:     RiskTolerance     | null
  tradingPreference: TradingPreference | null
  capitalRange:      CapitalRange      | null
}

interface OnboardingContextType {
  state:                 OnboardingState
  updateStep:            (step: number)          => void
  updateUsername:        (v: string)             => void
  updateDisplayName:     (v: string)             => void
  updateProfileImage:    (v: string)             => void
  updateExperience:      (v: Experience)         => void
  updateGoals:           (v: Goals)              => void
  updateRiskTolerance:   (v: RiskTolerance)      => void
  updateTradingPreference: (v: TradingPreference) => void
  updateCapitalRange:    (v: CapitalRange)        => void
  reset:                 () => void
}

const initialState: OnboardingState = {
  currentStep:       1,
  username:          '',
  displayName:       '',
  profileImageUrl:   '',
  experience:        null,
  goals:             null,
  riskTolerance:     null,
  tradingPreference: null,
  capitalRange:      null,
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState)

  const set = <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) =>
    setState((p) => ({ ...p, [key]: value }))

  return (
    <OnboardingContext.Provider value={{
      state,
      updateStep:              (v) => set('currentStep',       v),
      updateUsername:          (v) => set('username',          v),
      updateDisplayName:       (v) => set('displayName',       v),
      updateProfileImage:      (v) => set('profileImageUrl',   v),
      updateExperience:        (v) => set('experience',        v),
      updateGoals:             (v) => set('goals',             v),
      updateRiskTolerance:     (v) => set('riskTolerance',     v),
      updateTradingPreference: (v) => set('tradingPreference', v),
      updateCapitalRange:      (v) => set('capitalRange',      v),
      reset:                   ()  => setState(initialState),
    }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be inside OnboardingProvider')
  return ctx
}
