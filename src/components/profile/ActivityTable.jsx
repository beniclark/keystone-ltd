const currency = (n) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: 'always',
  })

export default function ActivityTable({ activity }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-navy-800">
            Recent activity
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
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
            <tr className="text-xs uppercase tracking-wider text-slate-500 bg-slate-50">
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
                className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors"
              >
                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{row.date}</td>
                <td className="px-6 py-4 text-navy-800 font-medium whitespace-nowrap">
                  {row.account}
                </td>
                <td className="px-6 py-4 text-slate-600">{row.description}</td>
                <td
                  className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                    row.amount >= 0 ? 'text-[#047857]' : 'text-navy-800'
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
