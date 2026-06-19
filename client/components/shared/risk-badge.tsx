'use client'

interface RiskBadgeProps {
  risk: 'Low' | 'Medium' | 'High'
  size?: 'sm' | 'md' | 'lg'
}

export default function RiskBadge({ risk, size = 'md' }: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const colorClasses = {
    Low: 'bg-green-50 text-green-700 border-green-200',
    Medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    High: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span className={`inline-block rounded-full font-medium border ${sizeClasses[size]} ${colorClasses[risk]}`}>
      {risk}
    </span>
  )
}
