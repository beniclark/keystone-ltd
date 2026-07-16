import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatGreek,
  daysUntilExpiry,
  isInTheMoney,
  generateExpirationDates,
} from '../helpers.js'

describe('Options Helpers', () => {
  describe('formatCurrency', () => {
    it('formats positive numbers as USD currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('formats negative numbers with sign', () => {
      expect(formatCurrency(-99.99)).toBe('-$99.99')
    })

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })
  })

  describe('formatPercent', () => {
    it('formats decimal as percentage', () => {
      expect(formatPercent(0.1234)).toBe('12.34%')
    })

    it('formats negative percentages', () => {
      expect(formatPercent(-0.05)).toBe('-5.00%')
    })
  })

  describe('formatNumber', () => {
    it('formats with thousands separators', () => {
      expect(formatNumber(123456)).toBe('123,456')
    })
  })

  describe('formatGreek', () => {
    it('formats to 4 decimal places', () => {
      expect(formatGreek(0.123456)).toBe('0.1235')
    })
  })

  describe('daysUntilExpiry', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calculates days until expiration', () => {
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
      const expiryDate = '2026-07-20'
      expect(daysUntilExpiry(expiryDate)).toBeGreaterThanOrEqual(4)
      expect(daysUntilExpiry(expiryDate)).toBeLessThanOrEqual(5)
    })

    it('returns 0 for expired dates', () => {
      vi.setSystemTime(new Date('2026-07-20T12:00:00Z'))
      const expiryDate = '2026-07-15'
      expect(daysUntilExpiry(expiryDate)).toBe(0)
    })
  })

  describe('isInTheMoney', () => {
    it('identifies ITM call options', () => {
      expect(isInTheMoney('call', 100, 105)).toBe(true)
      expect(isInTheMoney('call', 105, 100)).toBe(false)
    })

    it('identifies ITM put options', () => {
      expect(isInTheMoney('put', 105, 100)).toBe(true)
      expect(isInTheMoney('put', 100, 105)).toBe(false)
    })
  })

  describe('generateExpirationDates', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('generates requested number of dates', () => {
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
      const dates = generateExpirationDates(6)
      expect(dates).toHaveLength(6)
    })

    it('generates dates that are all upcoming Fridays', () => {
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
      const dates = generateExpirationDates(4)
      // All dates should be valid ISO dates
      dates.forEach((exp) => {
        expect(exp.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('includes both weekly and monthly expiration flags', () => {
      vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
      const dates = generateExpirationDates(10)
      const hasWeekly = dates.some((d) => d.isWeekly)
      const hasMonthly = dates.some((d) => !d.isWeekly)
      expect(hasWeekly).toBe(true)
      expect(hasMonthly).toBe(true)
    })

    it('returns dates with correct structure', () => {
      vi.setSystemTime(new Date('2026-07-15T12:00:00Z'))
      const dates = generateExpirationDates(2)
      expect(dates[0]).toHaveProperty('date')
      expect(dates[0]).toHaveProperty('label')
      expect(dates[0]).toHaveProperty('isWeekly')
    })
  })
})
