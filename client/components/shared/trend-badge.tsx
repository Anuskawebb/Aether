'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendBadgeProps {
  trend: 'Increasing' | 'Stable' | 'Decreasing'
}

export default function TrendBadge({ trend }: TrendBadgeProps) {
  const config = {
    Increasing: {
      icon: TrendingUp,
      color: 'text-green-700',
      label: 'Increasing',
    },
    Stable: {
      icon: Minus,
      color: 'text-gray-700',
      label: 'Stable',
    },
    Decreasing: {
      icon: TrendingDown,
      color: 'text-red-700',
      label: 'Decreasing',
    },
  }

  const Icon = config[trend].icon

  return (
    <div className="flex items-center justify-center gap-1">
      <Icon size={16} className={config[trend].color} />
      <span className={`text-sm font-medium ${config[trend].color}`}>{config[trend].label}</span>
    </div>
  )
}
