'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { Zap, User, Radio } from 'lucide-react'

const tradingModes = [
  {
    id: 'autonomous',
    name: 'Autonomous',
    description: 'Agent makes all trading decisions independently',
    features: [
      '24/7 automated trading',
      'Executes based on signals',
      'Full risk management',
      'Minimal oversight required',
    ],
    icon: Zap,
  },
  {
    id: 'assisted',
    name: 'Assisted',
    description: 'Agent recommends trades, you approve them',
    features: [
      'Agent sends notifications',
      'You review each trade',
      'You approve/reject trades',
      'Real-time notifications',
    ],
    icon: User,
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'You execute trades with agent insights',
    features: [
      'View agent signals',
      'You control execution',
      'Full market analysis access',
      'Educational experience',
    ],
    icon: Radio,
  },
]

export default function Step4Page() {
  const router = useRouter()
  const { state, updateTradingMode, updateStep } = useOnboarding()

  const handleSelectMode = (mode: 'autonomous' | 'assisted' | 'manual') => {
    updateTradingMode(mode)
  }

  const handleContinue = () => {
    if (state.tradingMode) {
      updateStep(5)
      router.push('/onboarding/step-5')
    }
  }

  const handleBack = () => {
    updateStep(3)
    router.push('/onboarding/step-3')
  }

  return (
    <div>
      <ProgressBar currentStep={4} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Select Trading Mode</h2>
        <p className="text-sm text-gray-600">
          Choose how much control you want over your agent&apos;s trades.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {tradingModes.map((mode) => {
          const Icon = mode.icon
          const isSelected = state.tradingMode === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => handleSelectMode(mode.id as any)}
              className={`w-full p-4 border rounded-lg text-left transition-all ${
                isSelected
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-950">{mode.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{mode.description}</p>
                  <div className="mt-3 space-y-1">
                    {mode.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-gray-400" />
                        <span className="text-xs text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <StepNavigation
        currentStep={4}
        canGoBack={true}
        canGoForward={!!state.tradingMode}
        onBack={handleBack}
        onForward={handleContinue}
        forwardButtonDisabled={!state.tradingMode}
      />
    </div>
  )
}
