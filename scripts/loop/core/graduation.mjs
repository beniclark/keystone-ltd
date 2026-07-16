/**
 * L2 Graduation Logic
 * Determines whether a loop proposal is eligible for L2 delegation.
 * 
 * FAIL CLOSED: If any condition is ambiguous or cannot be verified, return NOT eligible.
 * 
 * Eligibility criteria:
 * 1. Effective mode for the loop is L2 (loop override > global default)
 * 2. Proposal outcome is in the narrowly-scoped "safe" allowlist (lint/type fixes, mechanical CI)
 * 3. Budget/attempt caps from policy.mjs are not exceeded
 * 4. Protected paths are not implicated
 * 5. Proposal is actionable and has a clear doneWhen condition
 */

import { isProtectedPath } from './policy.mjs'

/**
 * Safe proposal categories eligible for L2 delegation
 * P0/P1/security/ambiguous ALWAYS stay human-owned regardless of mode
 */
const SAFE_PROPOSAL_CATEGORIES = new Set([
  'lint-fix',
  'type-fix',
  'mechanical-ci-fix',
  'deterministic-test-fix'
])

/**
 * Human-required proposal categories (never delegated, even in L2)
 */
const HUMAN_REQUIRED_CATEGORIES = new Set([
  'security',
  'auth',
  'dependency',
  'infrastructure',
  'P0',
  'P1',
  'breaking-change',
  'architecture',
  'ambiguous'
])

/**
 * Get effective mode for a specific loop
 * @param {object} config - Loop configuration
 * @param {string} loopName - Loop name (issueIntake, ciSweeper, prBabysitter)
 * @returns {string} - Effective mode (L1 or L2)
 */
export function getEffectiveMode(config, loopName) {
  if (!config || !loopName) {
    return 'L1' // Fail closed
  }
  
  // Check for per-loop override
  const loopConfig = config.loops?.[loopName]
  if (loopConfig?.mode) {
    return loopConfig.mode
  }
  
  // Fall back to global mode
  return config.mode || 'L1'
}

/**
 * Check if a proposal category is safe for L2 delegation
 * @param {string} category - Proposal category
 * @returns {boolean} - True if safe for L2
 */
export function isSafeCategory(category) {
  if (!category) {
    return false // Fail closed
  }
  
  // Human-required categories are never safe for delegation
  if (HUMAN_REQUIRED_CATEGORIES.has(category)) {
    return false
  }
  
  return SAFE_PROPOSAL_CATEGORIES.has(category)
}

/**
 * Check if any file paths are protected
 * @param {object} policy - Policy object
 * @param {Array<string>} filePaths - File paths to check
 * @returns {boolean} - True if any path is protected
 */
export function hasProtectedPaths(policy, filePaths) {
  if (!policy || !Array.isArray(filePaths)) {
    return true // Fail closed
  }
  
  return filePaths.some(path => isProtectedPath(policy, path))
}

/**
 * Check if budget limits allow delegation
 * @param {object} policy - Policy object
 * @param {object} currentState - Current loop state
 * @param {object} proposal - Proposal to check
 * @returns {object} - { allowed: boolean, reason: string }
 */
export function checkBudget(policy, currentState, proposal) {
  if (!policy || !currentState || !proposal) {
    return { allowed: false, reason: 'Missing budget data' }
  }
  
  // Check max attempts for this item
  const attempts = currentState.attempts || 0
  if (attempts >= policy.maxAttempts) {
    return { allowed: false, reason: `Max attempts exceeded (${attempts}/${policy.maxAttempts})` }
  }
  
  // Check max changed files
  const changedFiles = proposal.changedFiles?.length || 0
  if (changedFiles > policy.maxChangedFiles) {
    return { allowed: false, reason: `Too many changed files (${changedFiles}/${policy.maxChangedFiles})` }
  }
  
  // Check max concurrent PRs
  const openPRs = currentState.openLoopPRs || 0
  if (openPRs >= policy.maxConcurrentPRs) {
    return { allowed: false, reason: `Max concurrent PRs (${openPRs}/${policy.maxConcurrentPRs})` }
  }
  
  // Check max concurrent delegations for this item
  const activeDelegations = currentState.activeDelegations || 0
  if (activeDelegations >= policy.maxConcurrentDelegations) {
    return { allowed: false, reason: `Max concurrent delegations (${activeDelegations}/${policy.maxConcurrentDelegations})` }
  }
  
  return { allowed: true, reason: 'Budget limits satisfied' }
}

/**
 * Determine if a proposal is eligible for L2 delegation
 * @param {object} options
 * @param {object} options.config - Loop configuration
 * @param {object} options.policy - Policy object
 * @param {string} options.loopName - Loop name (issueIntake, ciSweeper, prBabysitter)
 * @param {object} options.proposal - Proposal object from pattern evaluation
 * @param {object} options.currentState - Current state for this item
 * @returns {object} - { eligible: boolean, reason: string, effectiveMode: string }
 */
export function isEligibleForL2(options) {
  const { config, policy, loopName, proposal, currentState = {} } = options
  
  // Validate inputs (fail closed)
  if (!config || !policy || !loopName || !proposal) {
    return {
      eligible: false,
      reason: 'Missing required inputs',
      effectiveMode: 'L1'
    }
  }
  
  // 1. Check effective mode
  const effectiveMode = getEffectiveMode(config, loopName)
  if (effectiveMode !== 'L2') {
    return {
      eligible: false,
      reason: `Mode is ${effectiveMode} (L2 required)`,
      effectiveMode
    }
  }
  
  // 2. Check proposal outcome is actionable
  if (proposal.outcome !== 'actionable') {
    return {
      eligible: false,
      reason: `Proposal outcome is "${proposal.outcome}" (actionable required)`,
      effectiveMode
    }
  }
  
  // 3. Check proposal has required fields
  if (!proposal.category) {
    return {
      eligible: false,
      reason: 'Proposal missing category',
      effectiveMode
    }
  }
  
  if (!proposal.doneWhen || proposal.doneWhen.length === 0) {
    return {
      eligible: false,
      reason: 'Proposal missing doneWhen conditions',
      effectiveMode
    }
  }
  
  // 4. Check category is safe
  if (!isSafeCategory(proposal.category)) {
    return {
      eligible: false,
      reason: `Category "${proposal.category}" not in safe allowlist`,
      effectiveMode
    }
  }
  
  // 5. Check for protected paths
  const filePaths = proposal.changedFiles || []
  if (hasProtectedPaths(policy, filePaths)) {
    return {
      eligible: false,
      reason: 'Proposal touches protected paths',
      effectiveMode
    }
  }
  
  // 6. Check budget limits
  const budgetCheck = checkBudget(policy, currentState, proposal)
  if (!budgetCheck.allowed) {
    return {
      eligible: false,
      reason: budgetCheck.reason,
      effectiveMode
    }
  }
  
  // All checks passed
  return {
    eligible: true,
    reason: 'All eligibility criteria satisfied',
    effectiveMode
  }
}
