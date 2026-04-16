import { motion } from 'framer-motion'
import PnlIndicator from './PnlIndicator.jsx'
import { strategyMeta } from '../../data/options/strategies.js'

export default function OptionsPositionsSummary({ positions }) {
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0)
  const totalCost = positions.reduce((s, p) => s + Math.abs(p.costBasis), 0)
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  const openCount = positions.filter((p) => p.status === 'open').length
  const profitCount = positions.filter((p) => p.pnl >= 0).length
  const lossCount = positions.filter((p) => p.pnl < 0).length

  // Strategy distribution
  const strategyCounts = {}
  for (const p of positions) {
    const label = strategyMeta[p.strategyType]?.label ?? p.strategyLabel
    strategyCounts[label] = (strategyCounts[label] || 0) + 1
  }
  const strategyList = Object.entries(strategyCounts)
    .map(([label, count]) => `${count} ${label}${count > 1 ? 's' : ''}`)
    .join(', ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-800 p-6 text-white"
    >
      {/* Glow accent */}
      <div className="absolute -top-16 -right-16 w-[320px] h-[320px] rounded-full bg-[#10b981]/20 blur-[120px] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Left: P&L and counts */}
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-emerald-300 mb-1">
            Total P&L
          </div>
          <PnlIndicator value={totalPnl} percent={totalPnlPct} size="lg" />
          <div className="mt-3 text-sm text-navy-100/80">
            {openCount} open position{openCount !== 1 ? 's' : ''}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-emerald-200">{profitCount} profitable</span>
            </span>
            <span className="text-navy-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-red-200">{lossCount} losing</span>
            </span>
          </div>
        </div>

        {/* Right: Strategy distribution */}
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-navy-300 mb-1">Strategies</div>
          <div className="text-sm text-navy-100/80 leading-relaxed">{strategyList}</div>
        </div>
      </div>
    </motion.div>
  )
}
