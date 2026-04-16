/**
 * Options strategy type definitions and metadata.
 * Provides enums and display configuration for each supported strategy.
 */

export const StrategyType = Object.freeze({
  COVERED_CALL: 'covered_call',
  CASH_SECURED_PUT: 'cash_secured_put',
  IRON_CONDOR: 'iron_condor',
  IRON_BUTTERFLY: 'iron_butterfly',
  VERTICAL_SPREAD: 'vertical_spread',
  STRADDLE: 'straddle',
  STRANGLE: 'strangle',
  LONG_CALL: 'long_call',
  LONG_PUT: 'long_put',
})

export const strategyMeta = {
  [StrategyType.COVERED_CALL]: {
    label: 'Covered Call',
    description: 'Own shares and sell calls against them to generate income.',
    sentiment: 'bullish',
    legs: 2,
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  [StrategyType.CASH_SECURED_PUT]: {
    label: 'Cash-Secured Put',
    description: 'Sell puts backed by cash to collect premium or acquire shares at a discount.',
    sentiment: 'bullish',
    legs: 1,
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  [StrategyType.IRON_CONDOR]: {
    label: 'Iron Condor',
    description: 'Sell an OTM put spread and call spread to profit from low volatility.',
    sentiment: 'neutral',
    legs: 4,
    badgeColor: 'bg-navy-100 text-navy-800',
  },
  [StrategyType.IRON_BUTTERFLY]: {
    label: 'Iron Butterfly',
    description: 'Sell ATM straddle and buy OTM wings to profit from minimal price movement.',
    sentiment: 'neutral',
    legs: 4,
    badgeColor: 'bg-navy-100 text-navy-800',
  },
  [StrategyType.VERTICAL_SPREAD]: {
    label: 'Vertical Spread',
    description: 'Buy and sell options at different strikes to define risk and reward.',
    sentiment: 'bullish',
    legs: 2,
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  [StrategyType.STRADDLE]: {
    label: 'Straddle',
    description: 'Buy a call and put at the same strike to profit from large price swings.',
    sentiment: 'neutral',
    legs: 2,
    badgeColor: 'bg-navy-100 text-navy-800',
  },
  [StrategyType.STRANGLE]: {
    label: 'Strangle',
    description: 'Buy an OTM call and put to profit from significant price movement in either direction.',
    sentiment: 'neutral',
    legs: 2,
    badgeColor: 'bg-navy-100 text-navy-800',
  },
  [StrategyType.LONG_CALL]: {
    label: 'Long Call',
    description: 'Buy a call option to profit from upward price movement with limited downside.',
    sentiment: 'bullish',
    legs: 1,
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  [StrategyType.LONG_PUT]: {
    label: 'Long Put',
    description: 'Buy a put option to profit from downward price movement or hedge a position.',
    sentiment: 'bearish',
    legs: 1,
    badgeColor: 'bg-red-100 text-red-800',
  },
}
