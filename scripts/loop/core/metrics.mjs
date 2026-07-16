/**
 * Loop Metrics Aggregation
 * Pure functions for computing operational metrics from state records
 * Phase 8: Observability
 */

/**
 * Aggregate metrics from state runs
 * @param {Array<object>} runs - Array of run records from state
 * @returns {object} - Aggregated metrics
 */
export function aggregateMetrics(runs) {
  if (!Array.isArray(runs)) {
    return createEmptyMetrics()
  }

  const metrics = {
    discovered: 0,
    noOp: 0,
    proposed: 0,
    delegated: 0,
    verified: 0,
    blocked: 0,
    escalated: 0,
    duplicatePrevented: 0,
    totalAttempts: 0,
    itemsWithAttempts: 0,
    timeToFirstAction: [],
  }

  const itemAttempts = new Map()

  for (const run of runs) {
    if (!run || typeof run !== 'object') continue

    // Count outcomes
    const outcome = run.outcome
    if (outcome === 'discovered') metrics.discovered++
    else if (outcome === 'no-op') metrics.noOp++
    else if (outcome === 'proposed') metrics.proposed++
    else if (outcome === 'delegated') metrics.delegated++
    else if (outcome === 'verified') metrics.verified++
    else if (outcome === 'blocked') metrics.blocked++
    else if (outcome === 'escalated') metrics.escalated++

    // Track duplicate prevention
    if (run.duplicatePrevented === true || run.duplicate === true) {
      metrics.duplicatePrevented++
    }

    // Track attempts per item
    if (run.itemKey) {
      const current = itemAttempts.get(run.itemKey) || 0
      itemAttempts.set(run.itemKey, current + 1)
    }

    // Track time to first action
    if (run.timeToFirstActionMs && typeof run.timeToFirstActionMs === 'number') {
      metrics.timeToFirstAction.push(run.timeToFirstActionMs)
    }
  }

  // Compute attempts statistics
  metrics.totalAttempts = Array.from(itemAttempts.values()).reduce((sum, count) => sum + count, 0)
  metrics.itemsWithAttempts = itemAttempts.size
  metrics.averageAttemptsPerItem = metrics.itemsWithAttempts > 0 
    ? metrics.totalAttempts / metrics.itemsWithAttempts 
    : 0
  metrics.maxAttemptsForItem = itemAttempts.size > 0 
    ? Math.max(...itemAttempts.values()) 
    : 0

  // Compute time-to-first-action statistics
  if (metrics.timeToFirstAction.length > 0) {
    const sorted = [...metrics.timeToFirstAction].sort((a, b) => a - b)
    metrics.medianTimeToFirstActionMs = sorted[Math.floor(sorted.length / 2)]
    metrics.p95TimeToFirstActionMs = sorted[Math.floor(sorted.length * 0.95)]
  } else {
    metrics.medianTimeToFirstActionMs = null
    metrics.p95TimeToFirstActionMs = null
  }

  return metrics
}

/**
 * Create an empty metrics object
 * @returns {object} - Empty metrics with zero values
 */
function createEmptyMetrics() {
  return {
    discovered: 0,
    noOp: 0,
    proposed: 0,
    delegated: 0,
    verified: 0,
    blocked: 0,
    escalated: 0,
    duplicatePrevented: 0,
    totalAttempts: 0,
    itemsWithAttempts: 0,
    averageAttemptsPerItem: 0,
    maxAttemptsForItem: 0,
    timeToFirstAction: [],
    medianTimeToFirstActionMs: null,
    p95TimeToFirstActionMs: null,
  }
}

/**
 * Format metrics as a human-readable summary
 * @param {object} metrics - Metrics object from aggregateMetrics
 * @returns {string} - Formatted summary
 */
export function formatMetricsSummary(metrics) {
  if (!metrics) {
    return 'No metrics available'
  }

  const lines = [
    '## Loop Metrics Summary',
    '',
    '### Outcomes',
    `- Discovered: ${metrics.discovered}`,
    `- No-op: ${metrics.noOp}`,
    `- Proposed: ${metrics.proposed}`,
    `- Delegated: ${metrics.delegated}`,
    `- Verified: ${metrics.verified}`,
    `- Blocked: ${metrics.blocked}`,
    `- Escalated: ${metrics.escalated}`,
    '',
    '### Efficiency',
    `- Duplicate prevention: ${metrics.duplicatePrevented}`,
    `- Total attempts: ${metrics.totalAttempts}`,
    `- Items with attempts: ${metrics.itemsWithAttempts}`,
    `- Average attempts/item: ${metrics.averageAttemptsPerItem.toFixed(2)}`,
    `- Max attempts for single item: ${metrics.maxAttemptsForItem}`,
  ]

  if (metrics.medianTimeToFirstActionMs !== null) {
    lines.push('')
    lines.push('### Time to First Action')
    lines.push(`- Median: ${formatDuration(metrics.medianTimeToFirstActionMs)}`)
    lines.push(`- 95th percentile: ${formatDuration(metrics.p95TimeToFirstActionMs)}`)
  }

  return lines.join('\n')
}

/**
 * Format milliseconds as human-readable duration
 * @param {number} ms - Milliseconds
 * @returns {string} - Formatted duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}
