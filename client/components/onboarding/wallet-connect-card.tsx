'use client'

import { Wallet } from 'lucide-react'

interface WalletConnectCardProps {
  name: string
  description: string
  icon: string
  isSelected: boolean
  onClick: () => void
}

export default function WalletConnectCard({
  name,
  description,
  icon,
  isSelected,
  onClick,
}: WalletConnectCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border rounded-lg text-left transition-all ${
        isSelected
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
            isSelected ? 'bg-orange-100' : 'bg-gray-100'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-950">{name}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{description}</p>
        </div>
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
    </button>
  )
}
