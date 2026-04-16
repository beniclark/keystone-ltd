import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { getStock } from '../data/options/stocks.js'
import { getChain, getExpirations } from '../data/options/chains.js'
import OptionsChainHeader from '../components/options/OptionsChainHeader.jsx'
import ExpirationTabs from '../components/options/ExpirationTabs.jsx'
import OptionsChainTable from '../components/options/OptionsChainTable.jsx'

export default function OptionsChainPage() {
  const { ticker } = useParams()
  const upperTicker = ticker?.toUpperCase()

  const stock = getStock(upperTicker)
  const chain = getChain(upperTicker)
  const expirations = getExpirations(upperTicker)

  const [selectedExpiration, setSelectedExpiration] = useState(
    () => expirations?.[0]?.date ?? null
  )
  const [strategy, setStrategy] = useState('both')
  const [strikesFilter, setStrikesFilter] = useState('all')

  const currentChain = useMemo(() => {
    if (!chain) return null
    const exp = chain.expirations?.find((e) => e.date === selectedExpiration)
    return exp ?? chain.expirations?.[0] ?? null
  }, [chain, selectedExpiration])

  const filteredChain = useMemo(() => {
    if (!currentChain) return null
    if (strikesFilter === 'all') return currentChain

    const price = stock?.price ?? 0
    let filtered

    if (strikesFilter === 'near') {
      const range = price * 0.1
      filtered = currentChain.strikes.filter(
        (s) => s >= price - range && s <= price + range
      )
    } else if (strikesFilter === 'itm') {
      filtered = currentChain.strikes.filter(
        (s) => s < price || s > price
      ).filter((s) => {
        const callItm = s < price
        const putItm = s > price
        return (strategy === 'calls' && callItm) ||
               (strategy === 'puts' && putItm) ||
               (strategy === 'both' && (callItm || putItm))
      })
    }

    return {
      ...currentChain,
      strikes: filtered ?? currentChain.strikes,
    }
  }, [currentChain, strikesFilter, stock, strategy])

  if (!stock) {
    return (
      <div className="bg-slate-50/60 min-h-[calc(100vh-4rem)]">
        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <Link
            to="/options"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800 transition-colors mb-6"
          >
            <ArrowLeft size={16} />
            Back to Options
          </Link>
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 p-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-display text-2xl font-semibold text-navy-800 mb-2">
              Stock not found
            </h2>
            <p className="text-slate-500">
              No options data available for "{upperTicker}".{' '}
              <Link to="/options" className="text-[#10b981] hover:underline">
                Browse available stocks →
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50/60 min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-6">
        <Link
          to="/options"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Options
        </Link>

        <OptionsChainHeader
          stock={stock}
          strategy={strategy}
          onStrategyChange={setStrategy}
          strikesFilter={strikesFilter}
          onStrikesFilterChange={setStrikesFilter}
        />

        {expirations && expirations.length > 0 && (
          <ExpirationTabs
            expirations={expirations}
            selected={selectedExpiration}
            onSelect={setSelectedExpiration}
          />
        )}

        <OptionsChainTable
          chain={filteredChain}
          stockPrice={stock.price}
          strategy={strategy}
        />

        <p className="text-[10px] text-slate-400 leading-relaxed">
          Options data is simulated for demonstration purposes only. This is not
          real market data and should not be used for trading decisions. All
          options involve risk and are not suitable for all investors.
        </p>
      </div>
    </div>
  )
}
