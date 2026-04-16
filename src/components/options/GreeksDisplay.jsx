import { formatGreek, formatPercent } from '../../data/options/helpers.js'

export default function GreeksDisplay({ delta, gamma, theta, vega, impliedVol }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500 tabular-nums">
      <span title="Delta">Δ {formatGreek(delta)}</span>
      <span title="Gamma">Γ {formatGreek(gamma)}</span>
      <span title="Theta">Θ {formatGreek(theta)}</span>
      <span title="Vega">V {formatGreek(vega)}</span>
      {impliedVol != null && (
        <span title="Implied Volatility">IV {formatPercent(impliedVol)}</span>
      )}
    </span>
  )
}
