import { formatCurrency } from '../../data/options/helpers.js'

export default function PositionLegsTable({ legs }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-slate-500 uppercase tracking-wider">
          <th className="py-1 px-2 font-medium">Type</th>
          <th className="py-1 px-2 font-medium">Strike</th>
          <th className="py-1 px-2 font-medium">Side</th>
          <th className="py-1 px-2 font-medium text-right">Premium</th>
        </tr>
      </thead>
      <tbody>
        {legs.map((leg) => (
          <tr key={leg.contractId} className="border-b border-slate-100 last:border-0">
            <td className={`py-1 px-2 font-medium ${leg.type === 'call' ? 'text-navy-700' : leg.type === 'put' ? 'text-slate-600' : 'text-slate-500'}`}>
              {leg.type === 'stock' ? 'Stock' : leg.type === 'call' ? 'Call' : 'Put'}
            </td>
            <td className="py-1 px-2 text-slate-700">
              {leg.strike != null ? formatCurrency(leg.strike) : '—'}
            </td>
            <td className={`py-1 px-2 font-medium ${leg.side === 'long' ? 'text-[#047857]' : 'text-red-600'}`}>
              {leg.side === 'long' ? 'Long' : 'Short'}
            </td>
            <td className="py-1 px-2 text-right text-slate-700">
              {formatCurrency(leg.premium)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
