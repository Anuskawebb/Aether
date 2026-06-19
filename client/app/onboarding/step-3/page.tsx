'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { useState } from 'react'

const fundingAmounts = [100, 500, 1000, 5000, 10000]

export default function Step3Page() {
  const router = useRouter()
  const { state, updateFunding, updateStep } = useOnboarding()
  const [customAmount, setCustomAmount] = useState('')

  const selectedAmount = state.fundingAmount

  const handleSelectAmount = (amount: number) => {
    updateFunding(amount)
    setCustomAmount('')
  }

  const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomAmount(value)
    if (value && !isNaN(Number(value))) {
      updateFunding(Number(value))
    }
  }

  const handleContinue = () => {
    if (selectedAmount) {
      updateStep(4)
      router.push('/onboarding/step-4')
    }
  }

  const handleBack = () => {
    updateStep(2)
    router.push('/onboarding/step-2')
  }

  return (
    <div>
      <ProgressBar currentStep={3} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Fund Your Agent Wallet</h2>
        <p className="text-sm text-gray-600">
          Transfer USDC from your personal wallet to your agent wallet to start trading. You can add more funds anytime.
        </p>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-gray-600 mb-3">Select a funding amount (USDC)</p>
        <div className="grid grid-cols-2 gap-3">
          {fundingAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleSelectAmount(amount)}
              className={`p-3 border rounded-lg text-center transition-all ${
                selectedAmount === amount
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="font-semibold text-gray-950">${amount.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs font-medium text-gray-600 mb-2">Or enter a custom amount</p>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">$</span>
          <input
            type="number"
            value={customAmount}
            onChange={handleCustomAmount}
            placeholder="Enter amount in USDC"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-500"
            min="10"
            max="1000000"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-xs text-blue-900">
          <span className="font-medium">💡 Tip:</span> Start with a smaller amount to test your strategy, then scale up as you gain confidence.
        </p>
      </div>

      {selectedAmount && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8">
          <p className="text-sm font-medium text-orange-900">
            You&apos;re funding with <span className="text-lg">${selectedAmount.toLocaleString()}</span> USDC
          </p>
        </div>
      )}

      <StepNavigation
        currentStep={3}
        canGoBack={true}
        canGoForward={!!selectedAmount}
        onBack={handleBack}
        onForward={handleContinue}
        forwardButtonDisabled={!selectedAmount}
      />
    </div>
  )
}
