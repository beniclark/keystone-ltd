const currency = (n) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'always',
  })

export default function ActivityTable({ activity }) {
  return (
    <div className="rounded-3xl bg-[var(--color-surface-card)] border border-[var(--color-border-primary)] overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
            Recent activity
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Last 14 days across all accounts
          </p>
        </div>
        <a
          href="#"
          className="text-sm font-medium text-[#047857] hover:underline whitespace-nowrap"
        >
          View all
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)]">
              <th className="px-6 py-3 font-semibold">Date</th>
              <th className="px-6 py-3 font-semibold">Account</th>
              <th className="px-6 py-3 font-semibold">Description</th>
              <th className="px-6 py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-secondary)]/60 transition-colors"
              >
                <td className="px-6 py-4 text-[var(--color-text-secondary)] whitespace-nowrap">{row.date}</td>
                <td className="px-6 py-4 text-[var(--color-text-primary)] font-medium whitespace-nowrap">
                  {row.account}
                </td>
                <td className="px-6 py-4 text-[var(--color-text-secondary)]">{row.description}</td>
                <td
                  className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                    row.amount >= 0 ? 'text-[#047857]' : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {currency(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
