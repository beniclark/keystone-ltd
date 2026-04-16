import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatNumber } from '../../data/options/helpers.js'

export default function StockInfoBanner({ stock }) {
  const isPositive = stock.change >= 0
  const Arrow = isPositive ? TrendingUp : TrendingDown
  const changeColor = isPositive ? 'text-[#047857]' : 'text-red-600'

  const rangeMin = stock.week52Low
  const rangeMax = stock.week52High
  const rangePct =
    rangeMax > rangeMin
      ? ((stock.price - rangeMin) / (rangeMax - rangeMin)) * 100
      : 50

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-navy-800 tracking-tight">
              {stock.ticker}
            </h1>
            <span className="text-sm text-slate-500">{stock.name}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-4xl font-semibold text-navy-800 tabular-nums">
              {formatCurrency(stock.price)}
            </span>
            <span className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}>
              <Arrow size={14} />
              {isPositive ? '+' : ''}
              {formatCurrency(stock.change)} ({stock.changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs mb-1">52-Week Range</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 tabular-nums">
              {formatCurrency(rangeMin)}
            </span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-navy-800 border-2 border-white shadow"
                style={{ left: `${Math.min(Math.max(rangePct, 0), 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 tabular-nums">
              {formatCurrency(rangeMax)}
            </span>
          </div>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-1">Volume</p>
          <p className="font-medium text-navy-800 tabular-nums">
            {formatNumber(stock.volume)}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-1">Market Cap</p>
          <p className="font-medium text-navy-800 tabular-nums">${stock.marketCap}T</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs mb-1">Div Yield</p>
          <p className="font-medium text-navy-800 tabular-nums">
            {stock.divYield != null ? `${stock.divYield.toFixed(2)}%` : '—'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
