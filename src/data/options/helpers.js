/**
 * Utility functions for options calculations, formatting, and date generation.
 */

export const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)

export const formatPercent = (n) => `${(n * 100).toFixed(2)}%`

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-US').format(n)

export const formatGreek = (n) => n.toFixed(4)

export const daysUntilExpiry = (expirationDate) => {
  const now = new Date()
  const expiry = new Date(expirationDate)
  const diffMs = expiry.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export const isInTheMoney = (type, strike, stockPrice) => {
  if (type === 'call') return strike < stockPrice
  if (type === 'put') return strike > stockPrice
  return false
}

/**
 * Generates `count` realistic upcoming option expiration dates (Fridays).
 * Returns objects with { date, label, isWeekly }.
 */
export const generateExpirationDates = (count = 6) => {
  const expirations = []
  const now = new Date()

  // Start from the next Friday
  const current = new Date(now)
  current.setDate(current.getDate() + ((5 - current.getDay() + 7) % 7 || 7))

  const monthlyThirdFridays = new Set()

  // Pre-compute third Fridays for the next 12 months
  for (let m = 0; m < 12; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m, 1)
    // Find first Friday
    const firstDay = d.getDay()
    const firstFriday = firstDay <= 5 ? (5 - firstDay + 1) : (5 + 7 - firstDay + 1)
    const thirdFriday = firstFriday + 14
    const tf = new Date(d.getFullYear(), d.getMonth(), thirdFriday)
    monthlyThirdFridays.add(tf.toISOString().split('T')[0])
  }

  while (expirations.length < count) {
    const iso = current.toISOString().split('T')[0]
    const isMonthly = monthlyThirdFridays.has(iso)

    const label = current.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    expirations.push({
      date: iso,
      label: `${label} (${isMonthly ? 'Monthly' : 'Weekly'})`,
      isWeekly: !isMonthly,
    })

    current.setDate(current.getDate() + 7)
  }

  return expirations
}
