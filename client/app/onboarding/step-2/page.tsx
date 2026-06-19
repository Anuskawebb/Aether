'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function Step2Page() {
  const router = useRouter()
  const { state, updateAgentWallet, updateStep } = useOnboarding()
  const [copied, setCopied] = useState(false)

  // Generate mock agent wallet if not already set
  const agentWallet = state.agentWalletAddress || generateMockWallet()

  function generateMockWallet() {
    return `0x${Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`
  }

  const handleAcceptWallet = () => {
    updateAgentWallet(agentWallet)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(agentWallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleContinue = () => {
    if (state.agentWalletAddress) {
      updateStep(3)
      router.push('/onboarding/step-3')
    }
  }

  const handleBack = () => {
    updateStep(1)
    router.push('/onboarding/step-1')
  }

  return (
    <div>
      <ProgressBar currentStep={2} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Create Agent Wallet</h2>
        <p className="text-sm text-gray-600">
          Toro creates a dedicated sub-wallet for your trading agent. This wallet will execute all trades autonomously.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
        <p className="text-xs font-medium text-gray-600 mb-3">Your Agent Wallet Address</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-gray-950 break-all">{agentWallet}</code>
          <button
            onClick={handleCopy}
            className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
          >
            {copied ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold flex-shrink-0">
            ✓
          </div>
          <div>
            <p className="text-sm font-medium text-gray-950">Isolated Sub-Wallet</p>
            <p className="text-xs text-gray-600 mt-1">Your agent operates in a separate wallet for security</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold flex-shrink-0">
            ✓
          </div>
          <div>
            <p className="text-sm font-medium text-gray-950">Full Control</p>
            <p className="text-xs text-gray-600 mt-1">You can withdraw or modify permissions at any time</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold flex-shrink-0">
            ✓
          </div>
          <div>
            <p className="text-sm font-medium text-gray-950">Non-Custodial</p>
            <p className="text-xs text-gray-600 mt-1">Only you control the wallet. Toro never holds your funds</p>
          </div>
        </div>
      </div>

      <StepNavigation
        currentStep={2}
        canGoBack={true}
        canGoForward={!state.agentWalletAddress}
        onBack={handleBack}
        onForward={handleAcceptWallet}
        forwardButtonText="Create Wallet"
        backButtonText="Back"
      />
    </div>
  )
}
