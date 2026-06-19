'use client'

interface StepNavigationProps {
  currentStep: number
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onForward: () => void
  forwardButtonText?: string
  backButtonText?: string
  forwardButtonDisabled?: boolean
}

export default function StepNavigation({
  currentStep,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  forwardButtonText = 'Continue',
  backButtonText = 'Back',
  forwardButtonDisabled = false,
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={`px-6 py-2.5 border rounded text-sm font-medium transition-colors ${
          canGoBack
            ? 'border-gray-300 text-gray-950 hover:bg-gray-50'
            : 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
        }`}
      >
        {backButtonText}
      </button>

      <button
        onClick={onForward}
        disabled={!canGoForward || forwardButtonDisabled}
        className={`px-8 py-2.5 rounded text-sm font-medium transition-colors ${
          canGoForward && !forwardButtonDisabled
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {forwardButtonText}
      </button>
    </div>
  )
}
