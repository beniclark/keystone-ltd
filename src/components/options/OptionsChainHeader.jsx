import StockInfoBanner from './StockInfoBanner.jsx'
import ChainFilterBar from './ChainFilterBar.jsx'

export default function OptionsChainHeader({
  stock,
  strategy,
  onStrategyChange,
  strikesFilter,
  onStrikesFilterChange,
}) {
  return (
    <div className="space-y-4">
      <StockInfoBanner stock={stock} />
      <ChainFilterBar
        strategy={strategy}
        onStrategyChange={onStrategyChange}
        strikesFilter={strikesFilter}
        onStrikesFilterChange={onStrikesFilterChange}
      />
    </div>
  )
}
