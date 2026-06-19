import { OnboardingProvider } from '@/context/onboarding-context'

export const metadata = {
  title: 'Toro Onboarding',
  description: 'Set up your Toro autonomous trading agent',
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <div className="mb-8">
            <div className="w-10 h-10 bg-gray-950 rounded flex items-center justify-center">
              <span className="text-white text-sm font-bold">Ⓣ</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-950 mt-6">Welcome to Toro</h1>
            <p className="text-gray-600 text-sm mt-2">Set up your autonomous trading agent in 6 steps</p>
          </div>
          {children}
        </div>
      </div>
    </OnboardingProvider>
  )
}
