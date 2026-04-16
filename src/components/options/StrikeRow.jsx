import { formatCurrency, formatNumber, formatGreek, formatPercent, isInTheMoney } from '../../data/options/helpers.js'

function Cell({ children, className = '', align = 'right' }) {
  return (
    <td
      className={`px-2 py-1.5 text-xs tabular-nums ${
        align === 'right' ? 'text-right' : 'text-center'
      } ${className}`}
    >
      {children}
    </td>
  )
}

function ContractCells({ contract, changeColor }) {
  if (!contract) {
    return (
      <>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
        <Cell className="text-slate-300">—</Cell>
      </>
    )
  }

  const chg = contract.change ?? 0
  const chgColor = chg > 0 ? 'text-[#047857]' : chg < 0 ? 'text-red-600' : 'text-slate-500'
  const highVol = (contract.volume ?? 0) > 1000

  return (
    <>
      <Cell>{formatCurrency(contract.last)}</Cell>
      <Cell className={chgColor}>
        {chg > 0 ? '+' : ''}
        {formatCurrency(chg)}
      </Cell>
      <Cell>{formatCurrency(contract.bid)}</Cell>
      <Cell>{formatCurrency(contract.ask)}</Cell>
      <Cell className={highVol ? 'font-semibold text-navy-800' : ''}>
        {formatNumber(contract.volume)}
      </Cell>
      <Cell>{formatPercent(contract.impliedVol)}</Cell>
      <Cell>{formatGreek(contract.delta)}</Cell>
      <Cell>{formatGreek(contract.gamma)}</Cell>
    </>
  )
}

export default function StrikeRow({ strike, call, put, stockPrice, strategy }) {
  const callItm = strike < stockPrice
  const putItm = strike > stockPrice
  const isAtm =
    Math.abs(strike - stockPrice) ===
    Math.min(
      ...([strike - 1, strike, strike + 1].map((s) => Math.abs(s - stockPrice)))
    ) && Math.abs(strike - stockPrice) <= stockPrice * 0.01

  const showCalls = strategy !== 'puts'
  const showPuts = strategy !== 'calls'

  return (
    <tr className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
      {showCalls && (
        <td colSpan={8} className="p-0">
          <table className="w-full">
            <tbody>
              <tr className={callItm ? 'bg-navy-50/60' : ''}>
                <ContractCells contract={call} />
              </tr>
            </tbody>
          </table>
        </td>
      )}

      <Cell
        align="center"
        className={`font-semibold text-sm text-navy-800 border-x border-slate-200 ${
          isAtm ? 'bg-brand-gold/10' : 'bg-slate-50/50'
        }`}
      >
        {strike.toFixed(0)}
      </Cell>

      {showPuts && (
        <td colSpan={8} className="p-0">
          <table className="w-full">
            <tbody>
              <tr className={putItm ? 'bg-navy-50/60' : ''}>
                <ContractCells contract={put} />
              </tr>
            </tbody>
          </table>
        </td>
      )}
    </tr>
  )
}
