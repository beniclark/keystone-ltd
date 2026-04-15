import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function AllocationDonut({ data }) {
  return (
    <div className="rounded-3xl bg-[var(--color-surface-card)] p-8 border border-[var(--color-border-primary)] shadow-sm h-full">
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Allocation</div>
      <h3 className="font-display text-2xl font-semibold text-[var(--color-text-primary)] mt-1">
        Portfolio mix
      </h3>

      <div className="mt-4 grid grid-cols-5 gap-4 items-center">
        <div className="col-span-2 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                }}
                formatter={(v, n) => [`${v}%`, n]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="col-span-3 space-y-2.5">
          {data.map((d) => (
            <li key={d.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="text-[var(--color-text-secondary)] font-medium">{d.name}</span>
              </div>
              <span className="font-semibold text-[var(--color-text-primary)]">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
