import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'
import SectionHeading from '../components/SectionHeading.jsx'
import { stocks } from '../data/options/stocks.js'
import { formatCurrency } from '../data/options/helpers.js'

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function OptionsLanding() {
  return (
    <div className="bg-slate-50/60 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionHeading
            eyebrow="Trading"
            title="Options Chain"
            description="Explore real-time options chains for popular stocks. View calls, puts, strike prices, and Greeks to inform your trading strategy."
          />
        </motion.div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stocks.map((stock, i) => {
            const isPositive = stock.change >= 0
            const Arrow = isPositive ? TrendingUp : TrendingDown
            const changeColor = isPositive ? 'text-[#047857]' : 'text-red-600'

            return (
              <motion.div
                key={stock.ticker}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Link
                  to={`/options/${stock.ticker}`}
                  className="block bg-white rounded-2xl border border-slate-200 p-6 hover:border-navy-300 hover:shadow-[0_20px_50px_-20px_rgba(10,37,64,0.25)] transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-navy-800 tracking-tight">
                        {stock.ticker}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">{stock.name}</p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-300 group-hover:text-navy-400 group-hover:translate-x-0.5 transition-all mt-1"
                    />
                  </div>

                  <div className="mt-4">
                    <span className="font-display text-2xl font-semibold text-navy-800 tabular-nums">
                      {formatCurrency(stock.price)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <Arrow size={14} className={changeColor} />
                    <span className={`text-sm font-medium tabular-nums ${changeColor}`}>
                      {isPositive ? '+' : ''}
                      {formatCurrency(stock.change)} ({stock.changePct.toFixed(2)}%)
                    </span>
                  </div>

                  <p className="mt-4 text-xs font-medium text-[#10b981] group-hover:underline">
                    View Chain →
                  </p>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
