'use client'

import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/context/onboarding-context'
import ProgressBar from '@/components/onboarding/progress-bar'
import StepNavigation from '@/components/onboarding/step-navigation'
import WalletConnectCard from '@/components/onboarding/wallet-connect-card'

const walletOptions = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect using MetaMask browser extension',
    icon: '🦊',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Scan QR code with your mobile wallet',
    icon: '📱',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Connect your Coinbase wallet',
    icon: '₿',
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'Connect your Ledger hardware wallet',
    icon: '🔐',
  },
  {
    id: 'trezor',
    name: 'Trezor',
    description: 'Connect your Trezor hardware wallet',
    icon: '🛡️',
  },
]

export default function Step1Page() {
  const router = useRouter()
  const { state, updateWallet, updateStep } = useOnboarding()

  const handleSelectWallet = (walletId: string) => {
    // Mock wallet address generation
    const mockAddress = `0x${Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`
    updateWallet(walletId, mockAddress)
  }

  const handleContinue = () => {
    if (state.walletAddress) {
      updateStep(2)
      router.push('/onboarding/step-2')
    }
  }

  return (
    <div>
      <ProgressBar currentStep={1} totalSteps={6} />

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-950 mb-2">Connect Your Wallet</h2>
        <p className="text-sm text-gray-600">
          Select a wallet to connect your personal account. This will be used to fund your Toro agent.
        </p>
      </div>

      <div className="space-y-3 mb-8">
        {walletOptions.map((wallet) => (
          <WalletConnectCard
            key={wallet.id}
            name={wallet.name}
            description={wallet.description}
            icon={wallet.icon}
            isSelected={state.walletType === wallet.id}
            onClick={() => handleSelectWallet(wallet.id)}
          />
        ))}
      </div>

      {state.walletAddress && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-8">
          <p className="text-xs text-orange-900">
            <span className="font-medium">Connected Wallet:</span> {state.walletAddress.slice(0, 6)}...
            {state.walletAddress.slice(-4)}
          </p>
        </div>
      )}

      <StepNavigation
        currentStep={1}
        canGoBack={false}
        canGoForward={!!state.walletAddress}
        onBack={() => {}}
        onForward={handleContinue}
        forwardButtonDisabled={!state.walletAddress}
      />
    </div>
  )
}
