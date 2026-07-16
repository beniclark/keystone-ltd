/**
 * Budget enforcement - attempts, delegations, concurrent PRs, cooldowns, pause checks
 * Pure functions operating on state and policy objects
 */

/**
 * Check if an item has exceeded max attempts
 * @param {object} state - Current state
 * @param {string} itemKey - Source item key
 * @param {number} maxAttempts - Max attempts from policy
 * @returns {{ allowed: boolean, attempts: number, reason: string }} - Check result
 */
export function checkAttempts(state, itemKey, maxAttempts) {
  if (!state || !itemKey) {
    return { allowed: false, attempts: 0, reason: 'Invalid state or item key' }
  }
  
  const item = state.sourceItems?.[itemKey]
  if (!item) {
    return { allowed: true, attempts: 0, reason: '' }
  }
  
  const attempts = item.attempts || 0
  const allowed = attempts < maxAttempts
  
  return {
    allowed,
    attempts,
    reason: allowed ? '' : `Max attempts reached (${attempts}/${maxAttempts})`
  }
}

/**
 * Check if concurrent PR limit is exceeded
 * @param {object} state - Current state
 * @param {number} maxConcurrentPRs - Max concurrent PRs from policy
 * @returns {{ allowed: boolean, count: number, reason: string }} - Check result
 */
export function checkConcurrentPRs(state, maxConcurrentPRs) {
  if (!state) {
    return { allowed: false, count: 0, reason: 'Invalid state' }
  }
  
  const openPRs = state.openPRs || []
  const count = openPRs.length
  const allowed = count < maxConcurrentPRs
  
  return {
    allowed,
    count,
    reason: allowed ? '' : `Max concurrent PRs reached (${count}/${maxConcurrentPRs})`
  }
}

/**
 * Check if max concurrent delegations limit is exceeded
 * @param {object} state - Current state
 * @param {number} maxConcurrentDelegations - Max concurrent delegations from policy
 * @returns {{ allowed: boolean, count: number, reason: string }} - Check result
 */
export function checkConcurrentDelegations(state, maxConcurrentDelegations) {
  if (!state) {
    return { allowed: false, count: 0, reason: 'Invalid state' }
  }
  
  const delegations = state.delegations || {}
  const runningCount = Object.values(delegations).filter(
    d => d.status === 'running' || d.status === 'pending'
  ).length
  
  const allowed = runningCount < maxConcurrentDelegations
  
  return {
    allowed,
    count: runningCount,
    reason: allowed ? '' : `Max concurrent delegations reached (${runningCount}/${maxConcurrentDelegations})`
  }
}

/**
 * Check if an item is in cooldown period
 * @param {object} state - Current state
 * @param {string} itemKey - Source item key
 * @returns {{ allowed: boolean, cooldownUntil: string|null, reason: string }} - Check result
 */
export function checkCooldown(state, itemKey) {
  if (!state || !itemKey) {
    return { allowed: false, cooldownUntil: null, reason: 'Invalid state or item key' }
  }
  
  const cooldowns = state.cooldowns || {}
  const cooldownUntil = cooldowns[itemKey]
  
  if (!cooldownUntil) {
    return { allowed: true, cooldownUntil: null, reason: '' }
  }
  
  const now = new Date()
  const cooldownDate = new Date(cooldownUntil)
  const allowed = now >= cooldownDate
  
  return {
    allowed,
    cooldownUntil: allowed ? null : cooldownUntil,
    reason: allowed ? '' : `Item in cooldown until ${cooldownUntil}`
  }
}

/**
 * Check if loop is paused
 * @param {object} state - Current state
 * @returns {{ allowed: boolean, reason: string }} - Check result
 */
export function checkPaused(state) {
  if (!state) {
    return { allowed: false, reason: 'Invalid state' }
  }
  
  const paused = state.status === 'paused'
  
  return {
    allowed: !paused,
    reason: paused ? 'Loop is paused' : ''
  }
}

/**
 * Check if an item already has an active delegation
 * @param {object} state - Current state
 * @param {string} itemKey - Source item key
 * @returns {{ allowed: boolean, delegationKey: string|null, reason: string }} - Check result
 */
export function checkActiveDelegation(state, itemKey) {
  if (!state || !itemKey) {
    return { allowed: false, delegationKey: null, reason: 'Invalid state or item key' }
  }
  
  const item = state.sourceItems?.[itemKey]
  if (!item) {
    return { allowed: true, delegationKey: null, reason: '' }
  }
  
  const activeDelegation = item.activeDelegation
  
  if (!activeDelegation) {
    return { allowed: true, delegationKey: null, reason: '' }
  }
  
  // Check if delegation is actually still running
  const delegation = state.delegations?.[activeDelegation]
  if (!delegation) {
    // Stale reference, allow new delegation
    return { allowed: true, delegationKey: null, reason: '' }
  }
  
  const isActive = delegation.status === 'running' || delegation.status === 'pending'
  
  return {
    allowed: !isActive,
    delegationKey: isActive ? activeDelegation : null,
    reason: isActive ? `Active delegation exists: ${activeDelegation}` : ''
  }
}

/**
 * Check all budgets for a proposed delegation
 * @param {object} state - Current state
 * @param {object} policy - Policy object
 * @param {string} itemKey - Source item key
 * @returns {{ allowed: boolean, checks: object, reasons: Array<string> }} - Comprehensive check result
 */
export function checkAllBudgets(state, policy, itemKey) {
  if (!state || !policy) {
    return { 
      allowed: false, 
      checks: {}, 
      reasons: ['Invalid state or policy'] 
    }
  }
  
  const checks = {
    paused: checkPaused(state),
    attempts: checkAttempts(state, itemKey, policy.maxAttempts),
    cooldown: checkCooldown(state, itemKey),
    activeDelegation: checkActiveDelegation(state, itemKey),
    concurrentPRs: checkConcurrentPRs(state, policy.maxConcurrentPRs),
    concurrentDelegations: checkConcurrentDelegations(state, policy.maxConcurrentDelegations)
  }
  
  const reasons = Object.entries(checks)
    .filter(([, result]) => !result.allowed)
    .map(([name, result]) => `${name}: ${result.reason}`)
  
  const allowed = reasons.length === 0
  
  return { allowed, checks, reasons }
}

/**
 * Calculate daily delegation count (requires state with timestamps)
 * @param {object} state - Current state
 * @returns {number} - Number of delegations created today
 */
export function getDailyDelegationCount(state) {
  if (!state || !state.delegations) {
    return 0
  }
  
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return Object.values(state.delegations).filter(d => {
    const createdAt = new Date(d.createdAt || 0)
    return createdAt >= todayStart
  }).length
}

/**
 * Set cooldown for an item
 * @param {object} state - Current state
 * @param {string} itemKey - Source item key
 * @param {number} hours - Hours to cooldown
 * @returns {object} - Updated cooldowns object
 */
export function setCooldown(state, itemKey, hours) {
  const cooldowns = { ...(state.cooldowns || {}) }
  const cooldownUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
  cooldowns[itemKey] = cooldownUntil
  return cooldowns
}

/**
 * Clear cooldown for an item
 * @param {object} state - Current state
 * @param {string} itemKey - Source item key
 * @returns {object} - Updated cooldowns object
 */
export function clearCooldown(state, itemKey) {
  const cooldowns = { ...(state.cooldowns || {}) }
  delete cooldowns[itemKey]
  return cooldowns
}
