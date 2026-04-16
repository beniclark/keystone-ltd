/**
 * Options chain mock data for all 8 tickers.
 * Uses generator helpers to produce realistic strike arrays, pricing, and Greeks.
 */

import { stocks } from './stocks.js'

// ── Generator helpers ──────────────────────────────────────────────────

function generateStrikes(centerPrice, count = 13) {
  const increment = centerPrice > 300 ? 5 : 2.5
  const half = Math.floor(count / 2)
  const center = Math.round(centerPrice / increment) * increment
  return Array.from({ length: count }, (_, i) => center + (i - half) * increment)
}

function contractId(ticker, date, type, strike) {
  const d = date.replace(/-/g, '').slice(2)
  const flag = type === 'call' ? 'C' : 'P'
  const s = String(Math.round(strike * 1000)).padStart(8, '0')
  return `${ticker}${d}${flag}${s}`
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

/** Approximate normal CDF using a rational approximation. */
function normCdf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const sign = x < 0 ? -1 : 1
  const t = 1 / (1 + p * Math.abs(x))
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2)
  return 0.5 * (1 + sign * y)
}

/**
 * Generate a single contract's data with approximate Greeks.
 * Uses a simplified model — not true Black-Scholes but realistic enough for mock data.
 */
function generateContract(ticker, date, type, strike, stockPrice, dte) {
  const T = Math.max(dte / 365, 0.003)
  const r = 0.045
  const moneyness = (stockPrice - strike) / stockPrice
  const isCall = type === 'call'
  const itm = isCall ? strike < stockPrice : strike > stockPrice
  const atm = Math.abs(moneyness) < 0.02

  // IV: higher near ATM, lower deep ITM/OTM, higher for shorter DTE
  const baseIV = 0.28 + Math.random() * 0.06
  const skew = Math.abs(moneyness) * 0.15
  const termAdj = dte < 10 ? 0.08 : dte < 30 ? 0.03 : -0.02
  const iv = clamp(baseIV - skew + termAdj + (Math.random() - 0.5) * 0.04, 0.15, 0.65)

  // Simplified delta
  const d1 = (Math.log(stockPrice / strike) + (r + iv * iv / 2) * T) / (iv * Math.sqrt(T))
  let delta = isCall ? normCdf(d1) : normCdf(d1) - 1
  delta = clamp(delta, isCall ? 0.01 : -0.99, isCall ? 0.99 : -0.01)

  // Gamma — peaks at ATM
  const gamma = clamp(
    Math.exp(-d1 * d1 / 2) / (stockPrice * iv * Math.sqrt(2 * Math.PI * T)),
    0.001,
    0.08,
  )

  // Theta — always negative, larger near ATM and short DTE
  const baseTheta = -(stockPrice * iv * Math.exp(-d1 * d1 / 2)) / (2 * Math.sqrt(2 * Math.PI * T)) / 365
  const theta = clamp(baseTheta, -1.5, -0.01)

  // Vega
  const vega = clamp(
    stockPrice * Math.sqrt(T) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / 100,
    0.01,
    0.45,
  )

  // Price: intrinsic + time value
  const intrinsic = Math.max(0, isCall ? stockPrice - strike : strike - stockPrice)
  const timeValue = Math.max(0.02, iv * stockPrice * Math.sqrt(T) * (atm ? 0.4 : itm ? 0.15 : 0.25) + (Math.random() - 0.3) * 0.5)
  const last = Math.round((intrinsic + timeValue) * 100) / 100
  const spread = clamp(last * (0.005 + Math.random() * 0.015), 0.02, 0.30)
  const bid = Math.round((last - spread / 2) * 100) / 100
  const ask = Math.round((last + spread / 2) * 100) / 100
  const change = Math.round((Math.random() - 0.4) * last * 0.12 * 100) / 100

  // Volume: higher for ATM
  const atmFactor = atm ? 3 : Math.abs(moneyness) < 0.05 ? 1.8 : 1
  const volume = Math.round((200 + Math.random() * 3000) * atmFactor)
  const openInterest = Math.round(volume * (3 + Math.random() * 8))

  return {
    contractId: contractId(ticker, date, type, strike),
    last: Math.max(0.01, last),
    change,
    bid: Math.max(0.01, bid),
    ask: Math.max(0.02, ask),
    volume,
    openInterest,
    impliedVol: Math.round(iv * 100) / 100,
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 10000) / 10000,
    vega: Math.round(vega * 10000) / 10000,
    inTheMoney: itm,
  }
}

function generateExpiration(ticker, stockPrice, date, label, dte) {
  const strikes = generateStrikes(stockPrice)
  const calls = {}
  const puts = {}
  for (const strike of strikes) {
    calls[strike] = generateContract(ticker, date, 'call', strike, stockPrice, dte)
    puts[strike] = generateContract(ticker, date, 'put', strike, stockPrice, dte)
  }
  return { date, label, daysToExpiry: dte, strikes, calls, puts }
}

// ── Expiration date sets (fixed for deterministic data) ────────────────

const expirationSets = {
  AAPL: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 2 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 30 },
    { date: '2026-07-17', label: 'Jul 17, 2026 (Monthly)', dte: 93 },
  ],
  MSFT: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 2 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 30 },
    { date: '2026-07-17', label: 'Jul 17, 2026 (Monthly)', dte: 93 },
  ],
  GOOGL: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 3 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 31 },
    { date: '2026-08-21', label: 'Aug 21, 2026 (Monthly)', dte: 129 },
  ],
  AMZN: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 2 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 30 },
    { date: '2026-07-17', label: 'Jul 17, 2026 (Monthly)', dte: 93 },
  ],
  NVDA: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 2 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 30 },
    { date: '2026-08-21', label: 'Aug 21, 2026 (Monthly)', dte: 129 },
  ],
  META: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 3 },
    { date: '2026-06-19', label: 'Jun 19, 2026 (Monthly)', dte: 66 },
    { date: '2026-09-18', label: 'Sep 18, 2026 (Monthly)', dte: 157 },
  ],
  TSLA: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 2 },
    { date: '2026-05-15', label: 'May 15, 2026 (Monthly)', dte: 30 },
    { date: '2026-07-17', label: 'Jul 17, 2026 (Monthly)', dte: 93 },
  ],
  AVGO: [
    { date: '2026-04-17', label: 'Apr 17, 2026 (Weekly)', dte: 3 },
    { date: '2026-06-19', label: 'Jun 19, 2026 (Monthly)', dte: 66 },
    { date: '2026-09-18', label: 'Sep 18, 2026 (Monthly)', dte: 157 },
  ],
}

// ── Build all chains ───────────────────────────────────────────────────

const buildChains = () => {
  const chains = {}
  for (const stock of stocks) {
    const expSets = expirationSets[stock.ticker]
    chains[stock.ticker] = {
      expirations: expSets.map((exp) =>
        generateExpiration(stock.ticker, stock.price, exp.date, exp.label, exp.dte),
      ),
    }
  }
  return chains
}

export const optionsChains = buildChains()

// ── Accessor helpers ───────────────────────────────────────────────────

export const getChain = (ticker) => optionsChains[ticker] ?? null

export const getExpirations = (ticker) =>
  optionsChains[ticker]?.expirations.map(({ date, label, daysToExpiry }) => ({
    date,
    label,
    daysToExpiry,
  })) ?? []
