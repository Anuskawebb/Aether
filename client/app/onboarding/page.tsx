'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  const steps = [
    { number: 1, title: 'Connect Wallet', description: 'Link your personal crypto wallet' },
    { number: 2, title: 'Create Agent Wallet', description: 'Toro creates a dedicated sub-wallet' },
    { number: 3, title: 'Fund Wallet', description: 'Transfer USDC to your agent' },
    { number: 4, title: 'Select Trading Mode', description: 'Choose autonomous, assisted, or manual' },
    { number: 5, title: 'Configure Strategy', description: 'Pick trading strategies and risk level' },
    { number: 6, title: 'Activate Agent', description: 'Review and activate your trading agent' },
  ]

  const handleStart = () => {
    router.push('/onboarding/step-1')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="w-12 h-12 bg-gray-950 rounded flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-lg font-bold">Ⓣ</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-950 mb-3">Welcome to Toro</h1>
        <p className="text-lg text-gray-600 mb-2">Your autonomous crypto trading agent</p>
        <p className="text-sm text-gray-600 max-w-md mx-auto">
          Set up your trading agent in 6 easy steps. Complete automation with full control over risk.
        </p>
      </div>

      {/* Steps Overview */}
      <div className="max-w-2xl mx-auto px-6 py-12 flex-1">
        <div className="space-y-4 mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>
                {index !== steps.length - 1 && (
                  <div className="w-0.5 h-8 bg-orange-200 my-2" />
                )}
              </div>
              <div className="pt-1.5">
                <h3 className="font-semibold text-gray-950">{step.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Key Features */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-950 mb-4">What You Get</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-orange-600">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-950">Non-Custodial</p>
                <p className="text-xs text-gray-600">You always control your funds</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-orange-600">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-950">24/7 Trading</p>
                <p className="text-xs text-gray-600">Your agent never sleeps</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-orange-600">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-950">Risk Management</p>
                <p className="text-xs text-gray-600">Built-in stop-loss and position sizing</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full px-8 py-3 bg-gray-950 text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group"
        >
          Get Started
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
