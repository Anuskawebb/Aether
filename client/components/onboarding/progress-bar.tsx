'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-950">
          Step {currentStep} of {totalSteps}
        </h2>
        <span className="text-xs text-gray-600">{Math.round(progress)}% complete</span>
      </div>
      <div className="flex gap-2">
        {steps.map((step) => (
          <div
            key={step}
            className={`flex-1 h-1 rounded-full transition-colors ${
              step <= currentStep ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
