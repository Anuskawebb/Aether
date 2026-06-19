'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

const strategyNames: Record<string, string> = {
  trend_following: 'Trend Following',
  mean_reversion: 'Mean Reversion',
  arbitrage: 'Arbitrage',
  volatility: 'Volatility Trading',
  smart_money: 'Smart Money Tracking',
}

export default function Step6Page() {
  const router = useRouter()
  const { state, reset } = useOnboarding()
  const [activating, setActivating] = useState(false)
  const [activated, setActivated] = useState(false)

  const handleActivate = async () => {
    setActivating(true)
    // Simulate activation delay
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setActivating(false)
    setActivated(true)
  }

  const handleDashboard = () => {
    reset()
    router.push('/')
  }

  if (activated) {
    return (
      <div>
        <ProgressBar currentStep={6} totalSteps={6} />

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-950 mb-2">Agent Activated!</h2>
          <p className="text-gray-600 text-sm max-w-md mb-8">
            Your Toro trading agent is now live and ready to execute trades based on your configured strategies.
          </p>

          <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-xs text-green-900 mb-4">
              <span className="font-medium">✓ Your agent is trading with:</span>
            </p>
            <div className="space-y-2 text-left">
              <p className="text-xs text-green-900">
                • Funding: <span className="font-medium">${state.fundingAmount?.toLocaleString()}</span> USDC
              </p>
              <p className="text-xs text-green-900">
                • Mode: <span className="font-medium capitalize">{state.tradingMode}</span>
              </p>
              <p className="text-xs text-green-900">
                • Risk Level: <span className="font-medium capitalize">{state.riskLevel}</span>
              </p>
              <p className="text-xs text-green-900">
                • Strategies: <span className="font-medium">{state.selectedStrategies.length} active</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleDashboard}
            className="px-8 py-2.5 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ProgressBar currentStep={6} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Review & Activate</h2>
        <p className="text-sm text-gray-600">
          Review your configuration before activating your trading agent.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {/* Wallet Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-950">Personal Wallet</p>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              {state.walletType}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-mono">
            {state.walletAddress?.slice(0, 6)}...{state.walletAddress?.slice(-4)}
          </p>
        </div>

        {/* Agent Wallet Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-3">Agent Wallet</p>
          <p className="text-xs text-gray-600 font-mono">
            {state.agentWalletAddress?.slice(0, 6)}...{state.agentWalletAddress?.slice(-4)}
          </p>
        </div>

        {/* Funding Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-1">Initial Funding</p>
          <p className="text-lg font-semibold text-orange-600">${state.fundingAmount?.toLocaleString()} USDC</p>
        </div>

        {/* Trading Mode Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-1">Trading Mode</p>
          <p className="text-sm text-gray-700 capitalize">{state.tradingMode}</p>
        </div>

        {/* Risk Level Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-1">Risk Level</p>
          <p className="text-sm text-gray-700 capitalize">{state.riskLevel}</p>
        </div>

        {/* Strategies Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-3">Active Strategies</p>
          <div className="space-y-2">
            {state.selectedStrategies.map((strategyId) => (
              <div key={strategyId} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <p className="text-sm text-gray-700">{strategyNames[strategyId]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-950 mb-3">Risk Management</p>
          <div className="space-y-1.5 text-xs text-gray-700">
            <p>Max Position Size: {state.advancedSettings.maxPositionSize}%</p>
            <p>Stop Loss: {state.advancedSettings.stopLossPercentage}%</p>
            <p>Take Profit: {state.advancedSettings.takeProfitPercentage}%</p>
            <p>Rebalance: {state.advancedSettings.rebalanceFrequency}</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-xs text-blue-900">
          <span className="font-medium">⚠️ Important:</span> By activating, you authorize Toro to execute trades on your behalf using the configured strategies. You can pause or modify settings anytime.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            window.history.back()
          }}
          className="flex-1 px-6 py-2.5 border border-gray-300 rounded text-sm font-medium text-gray-950 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleActivate}
          disabled={activating}
          className={`flex-1 px-8 py-2.5 rounded text-sm font-medium transition-colors ${
            activating
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {activating ? 'Activating...' : 'Activate Agent'}
        </button>
      </div>
    </div>
  )
}
