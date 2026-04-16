import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react'
import StrategyBadge from './StrategyBadge.jsx'
import PnlIndicator from './PnlIndicator.jsx'
import PositionLegsTable from './PositionLegsTable.jsx'
import { getStock } from '../../data/options/stocks.js'
import { formatCurrency, daysUntilExpiry } from '../../data/options/helpers.js'

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function OptionsPositionCard({ position }) {
  const [showLegs, setShowLegs] = useState(false)
  const stock = getStock(position.ticker)
  const profitable = position.pnl >= 0
  const dte = daysUntilExpiry(position.expiration)

  const gradientClass = profitable
    ? 'from-[#10b981]/10 to-transparent'
    : 'from-red-500/10 to-transparent'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
      className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:border-navy-300 hover:shadow-[0_20px_50px_-20px_rgba(10,37,64,0.25)] transition-all"
    >
      {/* Gradient accent */}
      <div className={`absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b ${gradientClass} pointer-events-none opacity-80`} />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display text-xl font-semibold text-navy-800">{position.ticker}</span>
          {stock && <span className="text-sm text-slate-500">{stock.name}</span>}
          <StrategyBadge strategyType={position.strategyType} />
        </div>
        <Link
          to={`/options/${position.ticker}`}
          className="inline-flex items-center gap-1 p-2 rounded-full bg-slate-100 text-slate-500 group-hover:bg-navy-800 group-hover:text-white transition-colors"
          aria-label={`View ${position.ticker} chain`}
        >
          <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* Key metrics */}
      <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500">Qty</span>
          <span className="ml-1.5 font-medium text-navy-800">{position.quantity}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500">Exp</span>
          <span className="ml-1.5 font-medium text-navy-800">{formatDate(position.expiration)}</span>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500">DTE</span>
          <span className="ml-1.5 font-medium text-navy-800">{dte}d</span>
        </div>
      </div>

      {/* P&L */}
      <div className="relative mt-4">
        <PnlIndicator value={position.pnl} percent={position.pnlPct} size="sm" />
      </div>

      {/* Risk */}
      <div className="relative mt-3 text-xs text-slate-500">
        Max Profit: <span className="font-medium text-[#047857]">{position.maxProfit === Infinity ? '∞' : formatCurrency(position.maxProfit)}</span>
        {' / '}
        Max Loss: <span className="font-medium text-red-600">{formatCurrency(position.maxLoss)}</span>
      </div>

      {/* Legs toggle */}
      <div className="relative mt-4">
        <button
          onClick={() => setShowLegs((s) => !s)}
          className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-navy-800 transition-colors cursor-pointer"
        >
          {showLegs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showLegs ? 'Hide legs' : 'Show legs'}
        </button>
        {showLegs && (
          <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2">
            <PositionLegsTable legs={position.legs} />
          </div>
        )}
      </div>

      {/* Opened date */}
      <div className="relative mt-4 text-xs text-slate-400">
        Opened: {formatDate(position.openDate)}
      </div>
    </motion.div>
  )
}
