'use client'

interface StrategySelectorProps {
  name: string
  description: string
  features: string[]
  isSelected: boolean
  onClick: () => void
}

export default function StrategySelector({
  name,
  description,
  features,
  isSelected,
  onClick,
}: StrategySelectorProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 border rounded-lg text-left transition-all ${
        isSelected
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-medium text-gray-950">{name}</h3>
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
      <p className="text-xs text-gray-600 mb-3">{description}</p>
      <div className="space-y-1.5">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-700">{feature}</span>
          </div>
        ))}
      </div>
    </button>
  )
}
