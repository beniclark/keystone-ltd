import { createHash } from 'node:crypto'

/**
 * Stable idempotency keys for event delivery, source items, failure fingerprints, and delegations.
 * Pure functions that generate consistent keys for deduplication and replay protection.
 */

/**
 * Generate a stable key for a GitHub event delivery
 * @param {object} event - GitHub webhook event
 * @param {string} deliveryId - GitHub X-GitHub-Delivery header
 * @returns {string} - Stable event delivery key
 */
export function eventDeliveryKey(event, deliveryId) {
  if (!event || !deliveryId) {
    throw new Error('Event and deliveryId are required')
  }
  return `event-${deliveryId}`
}

/**
 * Generate a stable key for a workflow run
 * @param {number} runId - GitHub workflow run ID
 * @returns {string} - Stable workflow run key
 */
export function workflowRunKey(runId) {
  if (!runId || typeof runId !== 'number') {
    throw new Error('Valid runId is required')
  }
  return `workflow-run-${runId}`
}

/**
 * Generate a stable key for a source item (issue, PR, workflow_run)
 * @param {string} kind - 'issue', 'pull_request', or 'workflow_run'
 * @param {number} number - Issue/PR number or workflow run ID
 * @returns {string} - Stable source item key
 */
export function sourceItemKey(kind, number) {
  if (!kind) {
    throw new Error('Kind and number are required')
  }
  if (typeof number !== 'number' || number < 1) {
    throw new Error('Number must be a positive integer')
  }
  if (!['issue', 'pull_request', 'workflow_run'].includes(kind)) {
    throw new Error('Kind must be issue, pull_request, or workflow_run')
  }
  
  const prefix = kind === 'pull_request' ? 'pr' : kind.replace('_', '-')
  return `${prefix}-${number}`
}

/**
 * Generate a stable fingerprint for a failure (for deduplication and retry tracking)
 * @param {object} failure - Failure details
 * @param {string} failure.workflow - Workflow name
 * @param {string} failure.job - Job name
 * @param {string} failure.step - Step name
 * @param {string} failure.sha - Git SHA
 * @param {string} failure.error - Normalized error message (first line or pattern)
 * @returns {string} - Stable failure fingerprint (sha256 hash)
 */
export function failureFingerprint(failure) {
  if (!failure || !failure.workflow || !failure.sha) {
    throw new Error('Failure must include workflow and sha')
  }
  
  const parts = [
    failure.workflow,
    failure.job || '',
    failure.step || '',
    failure.sha,
    normalizeError(failure.error || '')
  ]
  
  const content = parts.join('|')
  return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

/**
 * Generate a stable delegation key
 * @param {string} sourceKey - Source item key
 * @param {string} runId - Run ID or timestamp
 * @returns {string} - Stable delegation key
 */
export function delegationKey(sourceKey, runId) {
  if (!sourceKey || !runId) {
    throw new Error('sourceKey and runId are required')
  }
  return `deleg-${sourceKey}-run-${runId}`
}

/**
 * Normalize error messages for fingerprinting
 * @param {string} error - Raw error message
 * @returns {string} - Normalized error (first significant line, paths/numbers removed)
 */
function normalizeError(error) {
  if (!error) return ''
  
  // Take first non-empty line
  const firstLine = error
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0) || ''
  
  // Remove file paths, line numbers, and timestamps for stable fingerprints
  return firstLine
    .replace(/\b\d+:\d+\b/g, 'LINE:COL')
    .replace(/\b\d+\.\d+\.\d+\b/g, 'VERSION')
    .replace(/[/\\][^\s]+\.(js|ts|jsx|tsx|json|md)/gi, 'FILE')
    .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE')
    .replace(/\d{2}:\d{2}:\d{2}/g, 'TIME')
    .substring(0, 200) // Cap length for fingerprint stability
}

/**
 * Parse a source item key back into its components
 * @param {string} key - Source item key
 * @returns {{ kind: string, number: number }} - Parsed components
 */
export function parseSourceItemKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Valid key is required')
  }
  
  const match = key.match(/^(issue|pr|workflow-run)-(\d+)$/)
  if (!match) {
    throw new Error(`Invalid source item key: ${key}`)
  }
  
  const [, prefix, numberStr] = match
  const kind = prefix === 'pr' ? 'pull_request' : prefix.replace('-', '_')
  return { kind, number: parseInt(numberStr, 10) }
}
