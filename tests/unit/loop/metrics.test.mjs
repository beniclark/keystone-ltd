/**
 * Unit tests for metrics.mjs
 * Phase 8: Observability
 */

import { describe, it, expect } from 'vitest'
import { aggregateMetrics, formatMetricsSummary } from '../../../scripts/loop/core/metrics.mjs'

describe('metrics.mjs', () => {
  describe('aggregateMetrics', () => {
    it('should return empty metrics for empty array', () => {
      const metrics = aggregateMetrics([])
      
      expect(metrics.discovered).toBe(0)
      expect(metrics.noOp).toBe(0)
      expect(metrics.proposed).toBe(0)
      expect(metrics.delegated).toBe(0)
      expect(metrics.verified).toBe(0)
      expect(metrics.blocked).toBe(0)
      expect(metrics.escalated).toBe(0)
      expect(metrics.duplicatePrevented).toBe(0)
      expect(metrics.totalAttempts).toBe(0)
      expect(metrics.itemsWithAttempts).toBe(0)
      expect(metrics.averageAttemptsPerItem).toBe(0)
      expect(metrics.maxAttemptsForItem).toBe(0)
      expect(metrics.medianTimeToFirstActionMs).toBeNull()
      expect(metrics.p95TimeToFirstActionMs).toBeNull()
    })

    it('should return empty metrics for non-array input', () => {
      expect(aggregateMetrics(null)).toEqual(aggregateMetrics([]))
      expect(aggregateMetrics(undefined)).toEqual(aggregateMetrics([]))
      expect(aggregateMetrics('not an array')).toEqual(aggregateMetrics([]))
    })

    it('should count outcomes correctly', () => {
      const runs = [
        { outcome: 'discovered' },
        { outcome: 'discovered' },
        { outcome: 'no-op' },
        { outcome: 'proposed' },
        { outcome: 'delegated' },
        { outcome: 'verified' },
        { outcome: 'blocked' },
        { outcome: 'escalated' },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.discovered).toBe(2)
      expect(metrics.noOp).toBe(1)
      expect(metrics.proposed).toBe(1)
      expect(metrics.delegated).toBe(1)
      expect(metrics.verified).toBe(1)
      expect(metrics.blocked).toBe(1)
      expect(metrics.escalated).toBe(1)
    })

    it('should count duplicate prevention', () => {
      const runs = [
        { outcome: 'no-op', duplicatePrevented: true },
        { outcome: 'no-op', duplicate: true },
        { outcome: 'no-op', duplicatePrevented: false },
        { outcome: 'proposed' },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.duplicatePrevented).toBe(2)
    })

    it('should track attempts per item', () => {
      const runs = [
        { outcome: 'proposed', itemKey: 'issue-123' },
        { outcome: 'delegated', itemKey: 'issue-123' },
        { outcome: 'verified', itemKey: 'issue-123' },
        { outcome: 'proposed', itemKey: 'issue-456' },
        { outcome: 'delegated', itemKey: 'issue-456' },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.totalAttempts).toBe(5)
      expect(metrics.itemsWithAttempts).toBe(2)
      expect(metrics.averageAttemptsPerItem).toBe(2.5)
      expect(metrics.maxAttemptsForItem).toBe(3)
    })

    it('should compute time-to-first-action statistics', () => {
      const runs = [
        { outcome: 'delegated', timeToFirstActionMs: 1000 },
        { outcome: 'delegated', timeToFirstActionMs: 2000 },
        { outcome: 'delegated', timeToFirstActionMs: 3000 },
        { outcome: 'delegated', timeToFirstActionMs: 4000 },
        { outcome: 'delegated', timeToFirstActionMs: 5000 },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.timeToFirstAction).toEqual([1000, 2000, 3000, 4000, 5000])
      expect(metrics.medianTimeToFirstActionMs).toBe(3000)
      expect(metrics.p95TimeToFirstActionMs).toBe(5000)
    })

    it('should handle missing time-to-first-action gracefully', () => {
      const runs = [
        { outcome: 'delegated' },
        { outcome: 'delegated', timeToFirstActionMs: null },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.medianTimeToFirstActionMs).toBeNull()
      expect(metrics.p95TimeToFirstActionMs).toBeNull()
    })

    it('should skip invalid run entries', () => {
      const runs = [
        { outcome: 'discovered' },
        null,
        undefined,
        'not an object',
        { outcome: 'proposed' },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.discovered).toBe(1)
      expect(metrics.proposed).toBe(1)
    })

    it('should handle complex mixed scenario', () => {
      const runs = [
        { outcome: 'discovered', itemKey: 'issue-1', timeToFirstActionMs: 500 },
        { outcome: 'proposed', itemKey: 'issue-1', duplicatePrevented: true },
        { outcome: 'delegated', itemKey: 'issue-1', timeToFirstActionMs: 1500 },
        { outcome: 'no-op', itemKey: 'issue-2', duplicate: true },
        { outcome: 'blocked', itemKey: 'issue-3', timeToFirstActionMs: 2500 },
        { outcome: 'escalated', itemKey: 'issue-4' },
      ]
      
      const metrics = aggregateMetrics(runs)
      
      expect(metrics.discovered).toBe(1)
      expect(metrics.proposed).toBe(1)
      expect(metrics.delegated).toBe(1)
      expect(metrics.noOp).toBe(1)
      expect(metrics.blocked).toBe(1)
      expect(metrics.escalated).toBe(1)
      expect(metrics.duplicatePrevented).toBe(2)
      expect(metrics.totalAttempts).toBe(6)
      expect(metrics.itemsWithAttempts).toBe(4)
      expect(metrics.averageAttemptsPerItem).toBeCloseTo(1.5, 1)
      expect(metrics.maxAttemptsForItem).toBe(3)
      expect(metrics.medianTimeToFirstActionMs).toBe(1500)
    })
  })

  describe('formatMetricsSummary', () => {
    it('should format empty metrics', () => {
      const metrics = aggregateMetrics([])
      const summary = formatMetricsSummary(metrics)
      
      expect(summary).toContain('## Loop Metrics Summary')
      expect(summary).toContain('Discovered: 0')
      expect(summary).toContain('No-op: 0')
      expect(summary).toContain('Average attempts/item: 0.00')
    })

    it('should return placeholder for null metrics', () => {
      const summary = formatMetricsSummary(null)
      expect(summary).toBe('No metrics available')
    })

    it('should format metrics with time-to-first-action', () => {
      const runs = [
        { outcome: 'delegated', timeToFirstActionMs: 1500 },
        { outcome: 'delegated', timeToFirstActionMs: 65000 },
      ]
      
      const metrics = aggregateMetrics(runs)
      const summary = formatMetricsSummary(metrics)
      
      expect(summary).toContain('### Time to First Action')
      expect(summary).toContain('Median:')
      expect(summary).toContain('95th percentile:')
    })

    it('should omit time section when no time data available', () => {
      const runs = [
        { outcome: 'discovered' },
        { outcome: 'proposed' },
      ]
      
      const metrics = aggregateMetrics(runs)
      const summary = formatMetricsSummary(metrics)
      
      expect(summary).not.toContain('Time to First Action')
    })

    it('should format all outcome types', () => {
      const runs = [
        { outcome: 'discovered' },
        { outcome: 'no-op' },
        { outcome: 'proposed' },
        { outcome: 'delegated' },
        { outcome: 'verified' },
        { outcome: 'blocked' },
        { outcome: 'escalated' },
      ]
      
      const metrics = aggregateMetrics(runs)
      const summary = formatMetricsSummary(metrics)
      
      expect(summary).toContain('Discovered: 1')
      expect(summary).toContain('No-op: 1')
      expect(summary).toContain('Proposed: 1')
      expect(summary).toContain('Delegated: 1')
      expect(summary).toContain('Verified: 1')
      expect(summary).toContain('Blocked: 1')
      expect(summary).toContain('Escalated: 1')
    })
  })
})
