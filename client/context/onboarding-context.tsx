'use client'

import React, { createContext, useContext, useState } from 'react'

export interface OnboardingState {
  currentStep: number
  walletType: 'metamask' | 'walletconnect' | 'coinbase' | 'ledger' | 'trezor' | null
  walletAddress: string | null
  agentWalletAddress: string | null
  fundingAmount: number | null
  tradingMode: 'autonomous' | 'assisted' | 'manual' | null
  selectedStrategies: string[]
  riskLevel: 'conservative' | 'balanced' | 'aggressive' | null
  advancedSettings: {
    maxPositionSize: number
    stopLossPercentage: number
    takeProfitPercentage: number
    rebalanceFrequency: string
    notificationsEnabled: boolean
  }
}

interface OnboardingContextType {
  state: OnboardingState
  updateStep: (step: number) => void
  updateWallet: (walletType: string, address: string) => void
  updateAgentWallet: (address: string) => void
  updateFunding: (amount: number) => void
  updateTradingMode: (mode: 'autonomous' | 'assisted' | 'manual') => void
  updateStrategies: (strategies: string[]) => void
  updateRiskLevel: (level: 'conservative' | 'balanced' | 'aggressive') => void
  updateAdvancedSettings: (settings: Partial<OnboardingState['advancedSettings']>) => void
  reset: () => void
}

const initialState: OnboardingState = {
  currentStep: 1,
  walletType: null,
  walletAddress: null,
  agentWalletAddress: null,
  fundingAmount: null,
  tradingMode: null,
  selectedStrategies: [],
  riskLevel: null,
  advancedSettings: {
    maxPositionSize: 10,
    stopLossPercentage: 5,
    takeProfitPercentage: 15,
    rebalanceFrequency: 'daily',
    notificationsEnabled: true,
  },
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState)

  const updateStep = (step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }))
  }

  const updateWallet = (walletType: string, address: string) => {
    setState((prev) => ({
      ...prev,
      walletType: walletType as any,
      walletAddress: address,
    }))
  }

  const updateAgentWallet = (address: string) => {
    setState((prev) => ({
      ...prev,
      agentWalletAddress: address,
    }))
  }

  const updateFunding = (amount: number) => {
    setState((prev) => ({
      ...prev,
      fundingAmount: amount,
    }))
  }

  const updateTradingMode = (mode: 'autonomous' | 'assisted' | 'manual') => {
    setState((prev) => ({
      ...prev,
      tradingMode: mode,
    }))
  }

  const updateStrategies = (strategies: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedStrategies: strategies,
    }))
  }

  const updateRiskLevel = (level: 'conservative' | 'balanced' | 'aggressive') => {
    setState((prev) => ({
      ...prev,
      riskLevel: level,
    }))
  }

  const updateAdvancedSettings = (settings: Partial<OnboardingState['advancedSettings']>) => {
    setState((prev) => ({
      ...prev,
      advancedSettings: {
        ...prev.advancedSettings,
        ...settings,
      },
    }))
  }

  const reset = () => {
    setState(initialState)
  }

  const value: OnboardingContextType = {
    state,
    updateStep,
    updateWallet,
    updateAgentWallet,
    updateFunding,
    updateTradingMode,
    updateStrategies,
    updateRiskLevel,
    updateAdvancedSettings,
    reset,
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
