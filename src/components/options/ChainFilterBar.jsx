const strategyOptions = [
  { value: 'both', label: 'Calls & Puts' },
  { value: 'calls', label: 'Calls Only' },
  { value: 'puts', label: 'Puts Only' },
]

const strikesOptions = [
  { value: 'all', label: 'All Strikes' },
  { value: 'near', label: 'Near the Money' },
  { value: 'itm', label: 'In the Money' },
]

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-white text-navy-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function ChainFilterBar({
  strategy,
  onStrategyChange,
  strikesFilter,
  onStrikesFilterChange,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex flex-wrap items-center gap-4">
      <SegmentedControl
        options={strategyOptions}
        value={strategy}
        onChange={onStrategyChange}
      />
      <div className="h-5 w-px bg-slate-200 hidden sm:block" />
      <SegmentedControl
        options={strikesOptions}
        value={strikesFilter}
        onChange={onStrikesFilterChange}
      />
    </div>
  )
}
