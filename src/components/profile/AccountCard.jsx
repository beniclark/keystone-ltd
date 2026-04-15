import { ArrowUpRight, TrendingUp } from 'lucide-react'

const currency = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export default function AccountCard({ account, accent = 'emerald' }) {
  const accentClasses = {
    emerald: 'from-[#10b981]/10 to-transparent text-[#047857]',
    navy: 'from-navy-100/60 to-transparent text-navy-700',
    gold: 'from-[#f5b700]/15 to-transparent text-[#b97d00]',
  }
  return (
    <div className="group relative p-6 rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-surface-card)] hover:border-navy-300 hover:shadow-[0_20px_50px_-20px_rgba(10,37,64,0.25)] transition-all">
      <div
        className={`absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b ${accentClasses[accent].split(' text-')[0]} pointer-events-none opacity-80`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            {account.type}
          </div>
          <div className="font-semibold text-[var(--color-text-primary)] mt-1 leading-snug">
            {account.name}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">{account.number}</div>
        </div>
        <a
          href="#"
          className="p-2 rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] group-hover:bg-navy-800 group-hover:text-white transition-colors"
          aria-label="View details"
        >
          <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="relative mt-7">
        <div className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
          {currency(account.balance)}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-[#047857] font-medium">
          <TrendingUp size={14} />
          +{account.ytdReturn}% YTD
        </div>
      </div>

      {account.employerMatch && (
        <div className="relative mt-5 pt-5 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-2">
            <span>Employer match contributed</span>
            <span className="font-semibold text-[var(--color-text-primary)]">
              {account.employerMatch.contributedPct}% / {account.employerMatch.pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#10b981] to-[#34d399] rounded-full"
              style={{
                width: `${
                  (account.employerMatch.contributedPct / account.employerMatch.pct) * 100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
