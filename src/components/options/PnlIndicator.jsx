import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../data/options/helpers.js'

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl font-display font-semibold',
}

const iconSizes = { sm: 14, md: 16, lg: 20 }

export default function PnlIndicator({ value, percent, size = 'md' }) {
  const positive = value >= 0
  const color = positive ? 'text-[#047857]' : 'text-red-600'
  const Icon = positive ? TrendingUp : TrendingDown
  const sign = positive ? '+' : ''

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${color} font-medium`}>
      {sign}{formatCurrency(value)}
      <span className="opacity-75">({sign}{percent.toFixed(1)}%)</span>
      <Icon size={iconSizes[size]} />
    </span>
  )
}
