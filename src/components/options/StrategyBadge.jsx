import { strategyMeta } from '../../data/options/strategies.js'

const sentimentColors = {
  bullish: 'bg-[#10b981]/10 text-[#047857]',
  bearish: 'bg-red-50 text-red-700',
  neutral: 'bg-navy-50 text-navy-700',
}

export default function StrategyBadge({ strategyType }) {
  const meta = strategyMeta[strategyType]
  if (!meta) {
    return (
      <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600">
        Unknown
      </span>
    )
  }

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${sentimentColors[meta.sentiment] ?? 'bg-slate-100 text-slate-600'}`}
    >
      {meta.label}
    </span>
  )
}
