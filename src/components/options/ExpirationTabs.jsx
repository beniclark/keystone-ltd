import { useRef } from 'react'

export default function ExpirationTabs({ expirations, selected, onSelect }) {
  const scrollRef = useRef(null)

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {expirations.map((exp) => {
        const isSelected = exp.date === selected
        return (
          <button
            key={exp.date}
            type="button"
            onClick={() => onSelect(exp.date)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-navy-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-navy-50'
            }`}
          >
            <span>{exp.label}</span>
            <span
              className={`block text-[10px] mt-0.5 ${
                isSelected ? 'text-white/70' : 'text-slate-400'
              }`}
            >
              {exp.daysToExpiry}d
            </span>
          </button>
        )
      })}
    </div>
  )
}
