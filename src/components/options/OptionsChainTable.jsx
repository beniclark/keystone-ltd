import { motion } from 'framer-motion'
import StrikeRow from './StrikeRow.jsx'

const CALL_HEADERS = ['Last', 'Chg', 'Bid', 'Ask', 'Vol', 'IV', 'Δ', 'Γ']
const PUT_HEADERS = ['Last', 'Chg', 'Bid', 'Ask', 'Vol', 'IV', 'Δ', 'Γ']

export default function OptionsChainTable({ chain, stockPrice, strategy }) {
  if (!chain) return null

  const showCalls = strategy !== 'puts'
  const showPuts = strategy !== 'calls'

  const callCols = showCalls ? 8 : 0
  const putCols = showPuts ? 8 : 0
  const totalCols = callCols + 1 + putCols

  return (
    <motion.div
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {showCalls && (
                <th
                  colSpan={8}
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-navy-800"
                >
                  Calls
                </th>
              )}
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-navy-800 border-x border-slate-200 bg-slate-100">
                Strike
              </th>
              {showPuts && (
                <th
                  colSpan={8}
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-navy-800"
                >
                  Puts
                </th>
              )}
            </tr>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              {showCalls &&
                CALL_HEADERS.map((h) => (
                  <th
                    key={`call-${h}`}
                    className="px-2 py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              <th className="px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400 border-x border-slate-200">
                ▼
              </th>
              {showPuts &&
                PUT_HEADERS.map((h) => (
                  <th
                    key={`put-${h}`}
                    className="px-2 py-1.5 text-right text-[10px] font-medium uppercase tracking-wider text-slate-400"
                  >
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {chain.strikes.map((strike) => (
              <StrikeRow
                key={strike}
                strike={strike}
                call={chain.calls?.[strike] ?? null}
                put={chain.puts?.[strike] ?? null}
                stockPrice={stockPrice}
                strategy={strategy}
              />
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
