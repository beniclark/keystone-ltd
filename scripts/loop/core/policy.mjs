import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { minimatch } from 'minimatch'

/**
 * Fail-closed policy enforcement for path/action checks
 * Deny by default — only explicitly allowed actions/paths proceed
 */

let cachedPolicy = null

/**
 * Load policy from .loop/policy.json
 * @param {string} [repoRoot] - Repository root path (defaults to cwd)
 * @returns {Promise<object>} - Policy object
 */
export async function loadPolicy(repoRoot = process.cwd()) {
  if (cachedPolicy) {
    return cachedPolicy
  }
  
  const policyPath = resolve(repoRoot, '.loop/policy.json')
  
  try {
    const policyData = await readFile(policyPath, 'utf-8')
    cachedPolicy = JSON.parse(policyData)
    return cachedPolicy
  } catch (err) {
    throw new Error(`Failed to load policy: ${err.message}`)
  }
}

/**
 * Reset cached policy (for testing)
 */
export function resetPolicyCache() {
  cachedPolicy = null
}

/**
 * Check if a file path is protected (cannot be modified by loop automation)
 * @param {object} policy - Policy object
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if path is protected (modification denied)
 */
export function isProtectedPath(policy, filePath) {
  if (!filePath) return true // Fail closed for missing path
  
  const protectedPatterns = policy.protectedPaths || []
  return protectedPatterns.some(pattern => minimatch(filePath, pattern))
}

/**
 * Check if a file path requires human approval before modification
 * @param {object} policy - Policy object
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if human gate is required
 */
export function requiresHumanGate(policy, filePath) {
  if (!filePath) return true // Fail closed for missing path
  
  const humanGatePatterns = policy.humanGatePaths || []
  return humanGatePatterns.some(pattern => minimatch(filePath, pattern))
}

/**
 * Check if an action is allowed in the current mode
 * @param {object} policy - Policy object
 * @param {string} mode - Current mode (L1 or L2)
 * @param {string} action - Action to check (e.g., 'read', 'label:loop:*', 'pr:draft')
 * @returns {boolean} - True if action is allowed
 */
export function isActionAllowed(policy, mode, action) {
  if (!mode || !action) return false // Fail closed for missing params
  
  const allowedActions = policy.allowedActions?.[mode] || []
  
  // Check for exact match or wildcard match
  return allowedActions.some(allowed => {
    if (allowed === action) return true
    
    // Support wildcard patterns like "label:loop:*"
    if (allowed.endsWith('*')) {
      const prefix = allowed.slice(0, -1)
      return action.startsWith(prefix)
    }
    
    return false
  })
}

/**
 * Check if an action is explicitly denied
 * @param {object} policy - Policy object
 * @param {string} action - Action to check
 * @returns {boolean} - True if action is denied
 */
export function isActionDenied(policy, action) {
  if (!action) return true // Fail closed
  
  const deniedActions = policy.deniedActions || []
  return deniedActions.includes(action)
}

/**
 * Check if an item requires escalation based on labels or content
 * @param {object} policy - Policy object
 * @param {object} item - Item to check (issue or PR)
 * @param {Array<string>} item.labels - Label names
 * @param {string} item.title - Title
 * @param {string} item.body - Body content
 * @returns {boolean} - True if item requires human escalation
 */
export function requiresEscalation(policy, item) {
  if (!item) return true // Fail closed
  
  const sensitiveLabels = policy.escalationRules?.sensitiveLabels || []
  const blockedPatterns = policy.escalationRules?.blockedPatterns || []
  
  // Check labels
  const itemLabels = (item.labels || []).map(l => 
    typeof l === 'string' ? l : l.name
  )
  
  if (itemLabels.some(label => sensitiveLabels.includes(label))) {
    return true
  }
  
  // Check content patterns
  const content = `${item.title || ''} ${item.body || ''}`.toLowerCase()
  return blockedPatterns.some(pattern => 
    content.includes(pattern.toLowerCase())
  )
}

/**
 * Check if modifications to a set of files are allowed
 * @param {object} policy - Policy object
 * @param {Array<string>} filePaths - Paths to check
 * @returns {{ allowed: boolean, blockedPaths: Array<string>, reason: string }} - Check result
 */
export function checkFilesAllowed(policy, filePaths) {
  if (!filePaths || !Array.isArray(filePaths)) {
    return { allowed: false, blockedPaths: [], reason: 'Invalid file paths' }
  }
  
  // Fail closed for empty list
  if (filePaths.length === 0) {
    return { allowed: false, blockedPaths: [], reason: 'No files specified' }
  }
  
  // Check max files limit
  if (filePaths.length > policy.maxChangedFiles) {
    return { 
      allowed: false, 
      blockedPaths: [], 
      reason: `Too many files (${filePaths.length} > ${policy.maxChangedFiles})` 
    }
  }
  
  // Check for protected paths
  const blockedPaths = filePaths.filter(path => isProtectedPath(policy, path))
  
  if (blockedPaths.length > 0) {
    return { 
      allowed: false, 
      blockedPaths, 
      reason: `Protected paths: ${blockedPaths.join(', ')}` 
    }
  }
  
  return { allowed: true, blockedPaths: [], reason: '' }
}

/**
 * Get policy limits
 * @param {object} policy - Policy object
 * @returns {object} - Policy limits
 */
export function getPolicyLimits(policy) {
  return {
    maxAttempts: policy.maxAttempts,
    maxChangedFiles: policy.maxChangedFiles,
    maxConcurrentPRs: policy.maxConcurrentPRs,
    maxConcurrentDelegations: policy.maxConcurrentDelegations,
    autoMerge: policy.autoMerge
  }
}
