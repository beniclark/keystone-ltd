/**
 * Backend-neutral delegation interface
 * Defines the contract for delegating bounded work to coding agents
 */

/**
 * @typedef {object} DelegationRequest
 * @property {object} source - Source reference
 * @property {string} source.kind - 'issue' | 'pr' | 'workflow_run' | 'check_run'
 * @property {number} source.number - Issue/PR number or run ID
 * @property {string} source.url - Full GitHub URL to source object
 * @property {string} idempotencyKey - Stable key to prevent duplicate delegations
 * @property {string} objective - One-sentence goal for the agent (max 200 chars)
 * @property {Array<string>} doneWhen - Deterministic completion conditions
 * @property {Array<string>} allowedPaths - Glob patterns for editable paths
 * @property {Array<string>} deniedPaths - Glob patterns for protected paths (higher priority)
 * @property {number} maxAttempts - Maximum retry attempts
 * @property {number} maxFiles - Maximum changed files per delegation
 * @property {Array<string>} verificationCommands - Required verification commands (e.g., npm test)
 * @property {string} escalationInstructions - What to do on failure/uncertainty
 * @property {object} [metadata] - Additional backend-specific metadata
 */

/**
 * @typedef {object} DelegationResult
 * @property {boolean} success - Whether delegation was accepted/initiated
 * @property {string} status - 'queued' | 'running' | 'completed' | 'failed' | 'dry-run'
 * @property {object|null} isolation - Isolation details
 * @property {string} isolation.type - 'cloud-branch' | 'worktree' | 'none'
 * @property {string} [isolation.branch] - Branch name (if applicable)
 * @property {string} [isolation.prUrl] - PR URL (if created)
 * @property {string} [isolation.worktreePath] - Worktree path (if local)
 * @property {object|null} dryRunPayload - Complete dry-run payload (if status === 'dry-run')
 * @property {string|null} error - Error message (if success === false)
 * @property {object} [metadata] - Additional backend-specific result metadata
 */

/**
 * Abstract delegation adapter interface
 * Concrete implementations (e.g., github-copilot.mjs) must implement this interface
 */
export class DelegationAdapter {
  /**
   * @param {string} name - Adapter name for logging/debugging
   */
  constructor(name) {
    if (!name) {
      throw new Error('DelegationAdapter requires a name')
    }
    this.name = name
  }

  /**
   * Delegate a bounded work request
   * @param {DelegationRequest} request
   * @returns {Promise<DelegationResult>}
   * @abstract
   */
  async delegate(request) {
    throw new Error(`${this.name} adapter must implement delegate(request)`)
  }

  /**
   * Check if adapter is available and configured
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error(`${this.name} adapter must implement isAvailable()`)
  }

  /**
   * Validate delegation request structure
   * @param {DelegationRequest} request
   * @throws {Error} - If request is invalid
   */
  validateRequest(request) {
    if (!request) {
      throw new Error('DelegationRequest is required')
    }

    // Source validation
    if (!request.source || typeof request.source !== 'object') {
      throw new Error('DelegationRequest.source is required')
    }
    if (!['issue', 'pr', 'workflow_run', 'check_run'].includes(request.source.kind)) {
      throw new Error(`Invalid source.kind: ${request.source.kind}`)
    }
    if (typeof request.source.number !== 'number') {
      throw new Error('source.number must be a number')
    }
    if (!request.source.url || typeof request.source.url !== 'string') {
      throw new Error('source.url is required')
    }

    // Idempotency key
    if (!request.idempotencyKey || typeof request.idempotencyKey !== 'string') {
      throw new Error('idempotencyKey is required')
    }

    // Objective
    if (!request.objective || typeof request.objective !== 'string') {
      throw new Error('objective is required')
    }
    if (request.objective.length > 200) {
      throw new Error('objective must be 200 characters or less')
    }

    // Done conditions
    if (!Array.isArray(request.doneWhen) || request.doneWhen.length === 0) {
      throw new Error('doneWhen must be a non-empty array')
    }

    // Paths
    if (!Array.isArray(request.allowedPaths)) {
      throw new Error('allowedPaths must be an array')
    }
    if (!Array.isArray(request.deniedPaths)) {
      throw new Error('deniedPaths must be an array')
    }

    // Limits
    if (typeof request.maxAttempts !== 'number' || request.maxAttempts < 1) {
      throw new Error('maxAttempts must be a positive number')
    }
    if (typeof request.maxFiles !== 'number' || request.maxFiles < 1) {
      throw new Error('maxFiles must be a positive number')
    }

    // Verification commands
    if (!Array.isArray(request.verificationCommands)) {
      throw new Error('verificationCommands must be an array')
    }

    // Escalation instructions
    if (!request.escalationInstructions || typeof request.escalationInstructions !== 'string') {
      throw new Error('escalationInstructions is required')
    }
  }
}

/**
 * Create a standardized delegation request
 * @param {object} params
 * @returns {DelegationRequest}
 */
export function createDelegationRequest(params) {
  return {
    source: {
      kind: params.sourceKind,
      number: params.sourceNumber,
      url: params.sourceUrl,
    },
    idempotencyKey: params.idempotencyKey,
    objective: params.objective,
    doneWhen: params.doneWhen || [],
    allowedPaths: params.allowedPaths || [],
    deniedPaths: params.deniedPaths || [],
    maxAttempts: params.maxAttempts || 3,
    maxFiles: params.maxFiles || 5,
    verificationCommands: params.verificationCommands || [],
    escalationInstructions: params.escalationInstructions || 'Escalate to human review on failure or uncertainty.',
    metadata: params.metadata || {},
  }
}

/**
 * Validate cloud-branch isolation result
 * @param {object} isolation
 * @returns {boolean}
 */
export function validateCloudBranchIsolation(isolation) {
  if (!isolation || typeof isolation !== 'object') {
    return false
  }
  
  if (isolation.type !== 'cloud-branch') {
    return false
  }
  
  if (!isolation.branch || typeof isolation.branch !== 'string') {
    return false
  }
  
  // PR URL is optional but must be a string if present
  if (isolation.prUrl !== undefined && typeof isolation.prUrl !== 'string') {
    return false
  }
  
  return true
}

/**
 * Create a cloud-branch isolation result
 * @param {string} branch - Branch name
 * @param {string} [prUrl] - PR URL
 * @returns {object}
 */
export function createCloudBranchIsolation(branch, prUrl = null) {
  const isolation = {
    type: 'cloud-branch',
    branch,
  }
  
  if (prUrl) {
    isolation.prUrl = prUrl
  }
  
  return isolation
}
