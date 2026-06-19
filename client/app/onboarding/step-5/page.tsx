'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import StrategySelector from '@/components/onboarding/strategy-selector'
import { useState } from 'react'

const strategies = [
  {
    id: 'trend_following',
    name: 'Trend Following',
    description: 'Catches major price movements using momentum indicators',
    features: ['High conviction trades', 'Trending markets', 'Lower drawdown'],
  },
  {
    id: 'mean_reversion',
    name: 'Mean Reversion',
    description: 'Buys oversold assets that return to average price',
    features: ['Countertrend trades', 'Range-bound markets', 'Regular income'],
  },
  {
    id: 'arbitrage',
    name: 'Arbitrage',
    description: 'Exploits price differences across exchanges',
    features: ['Market-neutral', 'Low risk', 'Consistent returns'],
  },
  {
    id: 'volatility',
    name: 'Volatility',
    description: 'Profits from price swings regardless of direction',
    features: ['Any market condition', 'Dynamic sizing', 'Hedged positions'],
  },
  {
    id: 'smart_money',
    name: 'Smart Money Tracking',
    description: 'Follows whale wallets and institutional buyers',
    features: ['Market insights', 'Early signals', 'Risk management'],
  },
]

export default function Step5Page() {
  const router = useRouter()
  const { state, updateStrategies, updateRiskLevel, updateAdvancedSettings, updateStep } = useOnboarding()
  const [expandedAdvanced, setExpandedAdvanced] = useState(false)

  const handleToggleStrategy = (strategyId: string) => {
    const strategies = state.selectedStrategies.includes(strategyId)
      ? state.selectedStrategies.filter((s) => s !== strategyId)
      : [...state.selectedStrategies, strategyId]
    updateStrategies(strategies)
  }

  const handleRiskLevel = (level: 'conservative' | 'balanced' | 'aggressive') => {
    updateRiskLevel(level)
  }

  const handleAdvancedChange = (field: string, value: any) => {
    updateAdvancedSettings({ [field]: value } as any)
  }

  const handleContinue = () => {
    if (state.selectedStrategies.length > 0 && state.riskLevel) {
      updateStep(6)
      router.push('/onboarding/step-6')
    }
  }

  const handleBack = () => {
    updateStep(4)
    router.push('/onboarding/step-4')
  }

  return (
    <div>
      <ProgressBar currentStep={5} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Configure Your Strategy</h2>
        <p className="text-sm text-gray-600">
          Select trading strategies and set risk preferences for your agent.
        </p>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-gray-600 mb-3">Select Strategies (pick at least 1)</p>
        <div className="grid grid-cols-1 gap-3">
          {strategies.map((strategy) => (
            <StrategySelector
              key={strategy.id}
              name={strategy.name}
              description={strategy.description}
              features={strategy.features}
              isSelected={state.selectedStrategies.includes(strategy.id)}
              onClick={() => handleToggleStrategy(strategy.id)}
            />
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-gray-600 mb-3">Risk Level</p>
        <div className="grid grid-cols-3 gap-3">
          {['conservative', 'balanced', 'aggressive'].map((level) => (
            <button
              key={level}
              onClick={() => handleRiskLevel(level as any)}
              className={`p-3 border rounded-lg text-center transition-all capitalize ${
                state.riskLevel === level
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-950">{level}</p>
              <p className="text-xs text-gray-600 mt-1">
                {level === 'conservative' && 'Low volatility'}
                {level === 'balanced' && 'Moderate risk'}
                {level === 'aggressive' && 'High returns'}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <button
          onClick={() => setExpandedAdvanced(!expandedAdvanced)}
          className="w-full p-3 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-950">Advanced Settings</span>
          <span className={`text-gray-600 transition-transform ${expandedAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {expandedAdvanced && (
          <div className="mt-3 p-4 border border-gray-200 rounded-lg space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Max Position Size: {state.advancedSettings.maxPositionSize}%
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={state.advancedSettings.maxPositionSize}
                onChange={(e) => handleAdvancedChange('maxPositionSize', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Stop Loss: {state.advancedSettings.stopLossPercentage}%
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={state.advancedSettings.stopLossPercentage}
                onChange={(e) => handleAdvancedChange('stopLossPercentage', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Take Profit: {state.advancedSettings.takeProfitPercentage}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={state.advancedSettings.takeProfitPercentage}
                onChange={(e) => handleAdvancedChange('takeProfitPercentage', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      <StepNavigation
        currentStep={5}
        canGoBack={true}
        canGoForward={state.selectedStrategies.length > 0 && !!state.riskLevel}
        onBack={handleBack}
        onForward={handleContinue}
        forwardButtonDisabled={state.selectedStrategies.length === 0 || !state.riskLevel}
      />
    </div>
  )
}
