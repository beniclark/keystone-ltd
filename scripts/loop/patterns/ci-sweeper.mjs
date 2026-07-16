import { failureFingerprint, sourceItemKey } from '../core/idempotency.mjs'

/**
 * CI Sweeper Pattern (L1 Report-Only Mode)
 * Evaluates CI workflow failures, fingerprints them, classifies the type, and proposes bounded fixes.
 * Never retries, never delegates, never weakens tests — only produces diagnosis for state ledger.
 */

/**
 * Evaluate a CI failure and generate a diagnosis proposal
 * @param {object} input - CI failure data
 * @param {object} input.workflowRun - GitHub workflow_run object
 * @param {Array<object>} input.jobs - Job details with steps
 * @param {string} input.logs - Relevant error logs (normalized)
 * @param {object} [input.priorState] - Previous state from ledger
 * @param {object} config - Loop configuration
 * @param {object} policy - Loop policy
 * @returns {object} - Diagnosis proposal for state ledger
 */
export function evaluate(input, config, policy) {
  const { workflowRun, jobs = [], logs = '', priorState = {} } = input
  
  // Validate input
  if (!workflowRun || !workflowRun.id) {
    return {
      outcome: 'malformed',
      reason: 'Missing or invalid workflow run data',
      proposal: null
    }
  }
  
  // Generate source key
  const sourceKey = sourceItemKey('workflow_run', workflowRun.id)
  
  // Only act on failures
  if (workflowRun.conclusion !== 'failure') {
    return {
      outcome: 'no-op',
      reason: 'Workflow did not fail',
      sourceKey,
      proposal: null
    }
  }
  
  // Only process the named CI workflow
  if (workflowRun.name !== 'CI') {
    return {
      outcome: 'no-op',
      reason: `Not the CI workflow (got: ${workflowRun.name})`,
      sourceKey,
      proposal: null
    }
  }
  
  // Find failed jobs and steps
  const failures = extractFailures(jobs, logs)
  
  if (failures.length === 0) {
    return {
      outcome: 'no-op',
      reason: 'No specific failure details found',
      sourceKey,
      proposal: null
    }
  }
  
  // Take first significant failure (could be extended to handle multiple)
  const primaryFailure = failures[0]
  
  // Generate fingerprint
  const fingerprint = failureFingerprint({
    workflow: workflowRun.name,
    job: primaryFailure.job,
    step: primaryFailure.step,
    sha: workflowRun.head_sha,
    error: primaryFailure.error
  })
  
  // Check if this fingerprint was already processed
  if (priorState.fingerprint === fingerprint) {
    return {
      outcome: 'no-op',
      reason: 'Already processed this failure fingerprint',
      sourceKey,
      fingerprint,
      proposal: null
    }
  }
  
  // Classify failure type
  const classification = classifyFailure(primaryFailure, logs)
  
  // Assess if this is actionable or needs human
  const needsHuman = shouldEscalateToHuman(classification, primaryFailure, policy, priorState)
  
  // Build proposal object
  const proposal = {
    sourceKey,
    sourceUrl: workflowRun.html_url,
    fingerprint,
    sha: workflowRun.head_sha,
    branch: workflowRun.head_branch,
    workflow: workflowRun.name,
    failure: {
      job: primaryFailure.job,
      step: primaryFailure.step,
      error: primaryFailure.error,
      classification: classification.type,
      confidence: classification.confidence,
      likelyFlake: classification.likelyFlake
    },
    diagnosis: classification.diagnosis,
    boundedObjective: classification.boundedObjective,
    needsHuman: needsHuman || classification.likelyFlake, // Flakes always need human
    attempts: (priorState.attempts || 0) + 1
  }
  
  // L1: never delegate, just report
  // Flakes get their own outcome, even though they need human
  const outcome = classification.likelyFlake ? 'flake-detected' :
                  needsHuman ? 'needs-human' : 'actionable'
  
  return {
    outcome,
    reason: buildReason(classification, needsHuman, proposal.attempts, policy),
    sourceKey,
    fingerprint,
    proposal
  }
}

/**
 * Extract failures from job/step data and logs
 */
function extractFailures(jobs, logs) {
  const failures = []
  
  for (const job of jobs) {
    if (job.conclusion === 'failure' && job.steps) {
      for (const step of job.steps) {
        if (step.conclusion === 'failure') {
          // Extract first meaningful error line from logs
          const error = extractErrorFromLogs(logs, job.name, step.name)
          
          failures.push({
            job: job.name,
            step: step.name,
            error: error || 'Unknown error'
          })
        }
      }
    }
  }
  
  return failures
}

/**
 * Extract error message from logs
 */
function extractErrorFromLogs(logs, jobName, stepName) {
  if (!logs) return null
  
  const lines = logs.split('\n')
  
  // Look for common error patterns
  for (const line of lines) {
    const trimmed = line.trim()
    
    // ESLint errors
    if (trimmed.match(/error\s+.+\s+eslint/i)) {
      return trimmed
    }
    
    // TypeScript errors
    if (trimmed.match(/error TS\d+:/i)) {
      return trimmed
    }
    
    // Vitest/test errors
    if (trimmed.match(/(FAIL|FAILED|Error:|AssertionError|Expected)/i)) {
      return trimmed
    }
    
    // Build errors
    if (trimmed.match(/(Build failed|ERROR in|Module not found)/i)) {
      return trimmed
    }
  }
  
  // Fallback to first line with "error" (case insensitive)
  const errorLine = lines.find(l => /error/i.test(l))
  return errorLine ? errorLine.trim() : null
}

/**
 * Classify failure type and generate diagnosis
 */
function classifyFailure(failure, logs) {
  const error = failure.error.toLowerCase()
  const step = failure.step.toLowerCase()
  const fullLogs = logs.toLowerCase()
  
  // Lint/type failure
  if (step.includes('lint') || error.includes('eslint') || error.includes('prettier')) {
    return {
      type: 'lint-failure',
      confidence: 'high',
      likelyFlake: false,
      diagnosis: `Linting failure in ${failure.step}: ${failure.error}`,
      boundedObjective: `Fix linting errors in ${failure.step}`
    }
  }
  
  if (step.includes('type') || error.includes('ts') || error.includes('typescript')) {
    return {
      type: 'type-failure',
      confidence: 'high',
      likelyFlake: false,
      diagnosis: `Type checking failure: ${failure.error}`,
      boundedObjective: `Fix type errors in affected files`
    }
  }
  
  // Test failure - check for flakes FIRST
  const hasTimeout = error.includes('timeout') || fullLogs.includes('timeout')
  const hasNetwork = error.includes('network') || error.includes('connection') || 
                    error.includes('econnrefused') || error.includes('econnreset')
  const isFlake = hasTimeout || hasNetwork || fullLogs.includes('flaky')
  
  if (step.includes('test') || step.includes('unit') || step.includes('e2e') || 
      error.includes('test') || error.includes('expect') || error.includes('assertion')) {
    
    return {
      type: 'test-failure',
      confidence: isFlake ? 'medium' : 'high',
      likelyFlake: isFlake,
      diagnosis: isFlake ? 
        `Likely flaky test: ${failure.error}` : 
        `Test failure: ${failure.error}`,
      boundedObjective: isFlake ? 
        `Investigate and stabilize flaky test (do NOT retry to go green)` :
        `Fix failing test assertions`
    }
  }
  
  // Build failure
  if (step.includes('build') || error.includes('build') || 
      error.includes('module not found') || error.includes('cannot find')) {
    return {
      type: 'build-failure',
      confidence: 'high',
      likelyFlake: false,
      diagnosis: `Build failure: ${failure.error}`,
      boundedObjective: `Fix build errors and missing dependencies`
    }
  }
  
  // Permission/secret issues
  if (error.includes('permission') || error.includes('denied') || 
      error.includes('unauthorized') || error.includes('forbidden')) {
    return {
      type: 'permission-failure',
      confidence: 'high',
      likelyFlake: false,
      diagnosis: `Permission or secret issue: ${failure.error}`,
      boundedObjective: `Requires human intervention for secrets/permissions`
    }
  }
  
  // Infrastructure issues
  const hasInfraKeywords = error.includes('runner') || error.includes('github actions') || 
                          error.includes('workflow') || fullLogs.includes('runner')
  
  if (hasInfraKeywords || (hasNetwork && !step.includes('test'))) {
    return {
      type: 'infrastructure-failure',
      confidence: 'medium',
      likelyFlake: true,
      diagnosis: `Infrastructure/runner issue: ${failure.error}`,
      boundedObjective: `Requires human investigation of CI infrastructure`
    }
  }
  
  // Code regression (default)
  return {
    type: 'code-regression',
    confidence: 'low',
    likelyFlake: false,
    diagnosis: `Code regression detected: ${failure.error}`,
    boundedObjective: `Investigate and fix code regression in ${failure.job}`
  }
}

/**
 * Determine if failure should be escalated to human
 */
function shouldEscalateToHuman(classification, failure, policy, priorState) {
  // Always escalate these types
  const humanRequiredTypes = [
    'permission-failure',
    'infrastructure-failure'
  ]
  
  if (humanRequiredTypes.includes(classification.type)) {
    return true
  }
  
  // Escalate flakes (never auto-retry just to go green)
  if (classification.likelyFlake) {
    return true
  }
  
  // Escalate after max attempts
  const attempts = (priorState.attempts || 0) + 1
  if (attempts >= policy.maxAttempts) {
    return true
  }
  
  // Escalate low confidence classifications
  if (classification.confidence === 'low') {
    return true
  }
  
  // Actionable: lint, type, test (non-flake), build errors
  return false
}

/**
 * Build a human-readable reason string
 */
function buildReason(classification, needsHuman, attempts, policy) {
  if (classification.likelyFlake) {
    return `Likely flake detected: ${classification.diagnosis} (never auto-retry)`
  }
  
  if (attempts >= policy.maxAttempts) {
    return `Max attempts reached (${attempts}/${policy.maxAttempts})`
  }
  
  if (needsHuman) {
    return `Requires human: ${classification.type} - ${classification.diagnosis}`
  }
  
  return `${classification.type} detected: ${classification.boundedObjective}`
}
