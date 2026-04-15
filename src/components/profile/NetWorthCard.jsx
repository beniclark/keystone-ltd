import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { TrendingUp, ArrowUpRight } from 'lucide-react'

const currency = (n) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

export default function NetWorthCard({ user }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy-900 text-white p-8 md:p-10 shadow-[0_30px_80px_-30px_rgba(10,37,64,0.5)]">
      <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:28px_28px]" />
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#10b981]/20 blur-[140px]" />

      <div className="relative grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-[0.14em] text-navy-100/60">
            Total net worth
          </div>
          <div className="font-display text-5xl md:text-6xl font-semibold mt-2 leading-none">
            {currency(user.netWorth)}
          </div>
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-sm font-medium">
            <TrendingUp size={14} />
            +{user.netWorthDelta}% this month
            <ArrowUpRight size={14} />
          </div>
          <div className="mt-6 text-sm text-navy-100/60">
            Updated April 15, 2026 · {user.advisor.name}
          </div>
        </div>

        <div className="h-36 md:h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={user.netWorthSeries}
              margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="nwLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin - 50000', 'dataMax + 20000']} />
              <Tooltip
                contentStyle={{
                  background: '#0a2540',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 12,
                }}
                formatter={(v) => [currency(v), 'Net worth']}
                cursor={{ stroke: 'rgba(255,255,255,0.2)' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#nwLine)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, fill: '#34d399', stroke: '#0a2540', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
