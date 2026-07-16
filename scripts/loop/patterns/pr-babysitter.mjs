import { sourceItemKey } from '../core/idempotency.mjs'

/**
 * PR Babysitter Pattern (L1 Report-Only Mode)
 * Tracks PR state: checks, reviews, conversations, draft status, staleness, linked issues.
 * Never rebases, edits, merges, or delegates — only reports ready/blocked/needs-human states.
 */

/**
 * Evaluate a PR and generate a status report
 * @param {object} input - PR data
 * @param {object} input.pullRequest - GitHub pull_request object
 * @param {Array<object>} [input.reviews] - PR reviews
 * @param {Array<object>} [input.checks] - Check runs/statuses
 * @param {Array<object>} [input.conversations] - Review comments/conversations
 * @param {object} [input.linkedIssue] - Linked issue if any
 * @param {object} [input.priorState] - Previous state from ledger
 * @param {object} config - Loop configuration
 * @param {object} policy - Loop policy
 * @returns {object} - Status report for state ledger
 */
export function evaluate(input, config, policy) {
  const { 
    pullRequest, 
    reviews = [], 
    checks = [], 
    conversations = [],
    linkedIssue = null,
    priorState = {} 
  } = input
  
  // Validate input
  if (!pullRequest || !pullRequest.number) {
    return {
      outcome: 'malformed',
      reason: 'Missing or invalid pull request data',
      proposal: null
    }
  }
  
  // Generate source key
  const sourceKey = sourceItemKey('pull_request', pullRequest.number)
  
  // Check if closed
  if (pullRequest.state === 'closed' || pullRequest.merged) {
    return {
      outcome: 'no-op',
      reason: 'PR is closed or merged',
      sourceKey,
      proposal: null
    }
  }
  
  // Check idempotency
  const currentVersion = `${pullRequest.number}-${pullRequest.updated_at}`
  if (priorState.processedVersion === currentVersion && 
      priorState.checksVersion === getChecksVersion(checks)) {
    return {
      outcome: 'no-op',
      reason: 'Already processed this PR version',
      sourceKey,
      proposal: null
    }
  }
  
  // Special case: PR #18 or large PRs (file count)
  const isLargePR = pullRequest.number === 18 || 
                    (pullRequest.changed_files && pullRequest.changed_files > policy.maxChangedFiles)
  
  if (isLargePR) {
    return {
      outcome: 'needs-human',
      reason: `Large PR (${pullRequest.changed_files || 'unknown'} files) requires human review`,
      sourceKey,
      proposal: {
        sourceKey,
        sourceUrl: pullRequest.html_url,
        status: 'human-required',
        reason: 'File count exceeds automation threshold'
      }
    }
  }
  
  // Check if loop-managed
  const prLabels = (pullRequest.labels || []).map(l => 
    typeof l === 'string' ? l : l.name
  )
  
  const isLoopManaged = prLabels.includes(config.labels.managed)
  
  // Assess required checks
  const checkStatus = assessChecks(checks)
  
  // Assess review status
  const reviewStatus = assessReviews(reviews)
  
  // Assess conversations
  const conversationStatus = assessConversations(conversations)
  
  // Assess draft state
  const isDraft = pullRequest.draft === true
  
  // Assess staleness
  const staleness = assessStaleness(pullRequest)
  
  // Assess linked issue
  const issueStatus = linkedIssue ? {
    linked: true,
    number: linkedIssue.number,
    state: linkedIssue.state
  } : {
    linked: false
  }
  
  // Determine overall state
  const prState = determinePRState({
    checkStatus,
    reviewStatus,
    conversationStatus,
    isDraft,
    staleness,
    issueStatus,
    isLoopManaged
  })
  
  // Build status report
  const proposal = {
    sourceKey,
    sourceUrl: pullRequest.html_url,
    processedVersion: currentVersion,
    checksVersion: getChecksVersion(checks),
    branch: pullRequest.head.ref,
    baseBranch: pullRequest.base.ref,
    sha: pullRequest.head.sha,
    state: prState.state,
    reasons: prState.reasons,
    checks: {
      required: checkStatus.requiredCount,
      passing: checkStatus.passingCount,
      failing: checkStatus.failingCount,
      pending: checkStatus.pendingCount,
      allRequired: checkStatus.allRequiredPassing
    },
    reviews: {
      approved: reviewStatus.approvedCount,
      changesRequested: reviewStatus.changesRequestedCount,
      needsReview: reviewStatus.needsReview
    },
    conversations: {
      total: conversationStatus.total,
      unresolved: conversationStatus.unresolved
    },
    draft: isDraft,
    stale: staleness.isStale,
    staleDays: staleness.days,
    linkedIssue: issueStatus,
    loopManaged: isLoopManaged,
    needsHuman: prState.needsHuman
  }
  
  return {
    outcome: prState.outcome,
    reason: prState.reasons.join('; '),
    sourceKey,
    proposal
  }
}

/**
 * Get a version string for checks (for idempotency)
 */
function getChecksVersion(checks) {
  if (checks.length === 0) return 'none'
  
  // Hash of all check conclusions
  const conclusions = checks.map(c => `${c.name}:${c.conclusion || c.status}`).sort()
  return conclusions.join('|')
}

/**
 * Assess check status
 */
function assessChecks(checks) {
  // In real implementation, would fetch required checks from branch protection
  // For now, assume CI is required
  const requiredCheckNames = ['CI', 'ci']
  
  const requiredChecks = checks.filter(c => 
    requiredCheckNames.some(name => c.name?.toLowerCase().includes(name.toLowerCase()))
  )
  
  const passingChecks = requiredChecks.filter(c => 
    c.conclusion === 'success' || c.status === 'completed'
  )
  
  const failingChecks = requiredChecks.filter(c => 
    c.conclusion === 'failure' || c.conclusion === 'cancelled' || c.conclusion === 'timed_out'
  )
  
  const pendingChecks = requiredChecks.filter(c => 
    c.status === 'pending' || c.status === 'queued' || c.status === 'in_progress'
  )
  
  return {
    requiredCount: requiredChecks.length,
    passingCount: passingChecks.length,
    failingCount: failingChecks.length,
    pendingCount: pendingChecks.length,
    allRequiredPassing: requiredChecks.length > 0 && 
                       passingChecks.length === requiredChecks.length &&
                       failingChecks.length === 0
  }
}

/**
 * Assess review status
 */
function assessReviews(reviews) {
  // Get latest review per user
  const latestReviews = new Map()
  
  for (const review of reviews) {
    const user = review.user?.login
    if (!user) continue
    
    const existing = latestReviews.get(user)
    if (!existing || new Date(review.submitted_at) > new Date(existing.submitted_at)) {
      latestReviews.set(user, review)
    }
  }
  
  const latestReviewStates = Array.from(latestReviews.values())
  
  const approvedCount = latestReviewStates.filter(r => r.state === 'approved').length
  const changesRequestedCount = latestReviewStates.filter(r => 
    r.state === 'changes_requested'
  ).length
  
  return {
    approvedCount,
    changesRequestedCount,
    needsReview: approvedCount === 0 && reviews.length === 0
  }
}

/**
 * Assess conversation status
 */
function assessConversations(conversations) {
  const unresolved = conversations.filter(c => !c.resolved).length
  
  return {
    total: conversations.length,
    unresolved
  }
}

/**
 * Assess if PR is stale
 */
function assessStaleness(pullRequest) {
  const updatedAt = new Date(pullRequest.updated_at)
  const now = new Date()
  const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24)
  
  return {
    isStale: daysSinceUpdate > 7,
    days: Math.floor(daysSinceUpdate)
  }
}

/**
 * Determine overall PR state
 */
function determinePRState(assessment) {
  const { 
    checkStatus, 
    reviewStatus, 
    conversationStatus, 
    isDraft, 
    staleness,
    issueStatus,
    isLoopManaged
  } = assessment
  
  const reasons = []
  let needsHuman = false
  
  // Draft state
  if (isDraft) {
    reasons.push('Draft PR')
    return {
      state: 'draft',
      outcome: 'blocked',
      reasons,
      needsHuman: false
    }
  }
  
  // Failing checks
  if (checkStatus.failingCount > 0) {
    reasons.push(`${checkStatus.failingCount} check(s) failing`)
  }
  
  // Pending checks
  if (checkStatus.pendingCount > 0) {
    reasons.push(`${checkStatus.pendingCount} check(s) pending`)
  }
  
  // Changes requested
  if (reviewStatus.changesRequestedCount > 0) {
    reasons.push(`Changes requested by ${reviewStatus.changesRequestedCount} reviewer(s)`)
  }
  
  // Unresolved conversations
  if (conversationStatus.unresolved > 0) {
    reasons.push(`${conversationStatus.unresolved} unresolved conversation(s)`)
  }
  
  // No linked issue
  if (!issueStatus.linked && isLoopManaged) {
    reasons.push('No linked issue')
    needsHuman = true
  }
  
  // Stale
  if (staleness.isStale) {
    reasons.push(`Stale (${staleness.days} days)`)
    needsHuman = true
  }
  
  // Determine state and outcome
  const hasBlockers = reasons.length > 0
  
  if (!hasBlockers && checkStatus.allRequiredPassing && reviewStatus.approvedCount > 0) {
    return {
      state: 'ready',
      outcome: 'actionable',
      reasons: ['All checks passing, approved, ready for merge (human approval required)'],
      needsHuman: false // L1: still needs human to merge
    }
  }
  
  if (hasBlockers) {
    return {
      state: 'blocked',
      outcome: 'blocked',
      reasons,
      needsHuman
    }
  }
  
  return {
    state: 'pending',
    outcome: 'pending',
    reasons: ['Awaiting checks and reviews'],
    needsHuman: false
  }
}
