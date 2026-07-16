import { requiresEscalation } from '../core/policy.mjs'
import { sourceItemKey } from '../core/idempotency.mjs'

/**
 * Issue Intake Pattern (L1 Report-Only Mode)
 * Evaluates newly opened/reopened/edited issues and proposes priority, type, area, readiness.
 * Never applies labels or comments directly — only returns a proposal for state ledger.
 */

/**
 * Evaluate an issue and generate a proposal for intake actions
 * @param {object} input - Issue data from GitHub
 * @param {object} input.issue - GitHub issue object
 * @param {string} input.action - Event action (opened, reopened, edited)
 * @param {object} [input.priorState] - Previous state from ledger
 * @param {object} config - Loop configuration
 * @param {object} policy - Loop policy
 * @returns {object} - Proposal object for state ledger
 */
export function evaluate(input, config, policy) {
  const { issue, action, priorState = {} } = input
  
  // Validate input
  if (!issue || !issue.number) {
    return {
      outcome: 'malformed',
      reason: 'Missing or invalid issue data',
      proposal: null
    }
  }
  
  // Generate source key for idempotency
  const sourceKey = sourceItemKey('issue', issue.number)
  
  // Exclude state issue itself
  const stateLabel = config.labels.state
  const issueLabels = (issue.labels || []).map(l => 
    typeof l === 'string' ? l : l.name
  )
  
  if (issueLabels.includes(stateLabel)) {
    return {
      outcome: 'no-op',
      reason: 'State issue excluded from intake',
      sourceKey,
      proposal: null
    }
  }
  
  // Exclude loop-managed bounded fix issues (created by loop itself)
  const managedLabel = config.labels.managed
  if (issueLabels.includes(managedLabel)) {
    return {
      outcome: 'no-op',
      reason: 'Loop-managed fix issue excluded from intake',
      sourceKey,
      proposal: null
    }
  }
  
  // Check if already processed this exact version (idempotency)
  const currentVersion = `${issue.number}-${issue.updated_at}`
  if (priorState.processedVersion === currentVersion) {
    return {
      outcome: 'no-op',
      reason: 'Already processed this issue version',
      sourceKey,
      proposal: null
    }
  }
  
  // Check if issue requires human escalation based on policy
  const needsEscalation = requiresEscalation(policy, {
    labels: issueLabels,
    title: issue.title,
    body: issue.body || ''
  })
  
  // Preserve existing human-applied priority labels
  const existingPriority = detectExistingPriority(issueLabels, config)
  
  // Propose priority (only if none exists)
  const proposedPriority = existingPriority || inferPriority(issue, issueLabels, policy)
  
  // Check if high priority (P0/P1)
  const isHighPriority = proposedPriority === 'P0: critical' || proposedPriority === 'P1: high'
  
  // Propose type
  const proposedType = inferType(issue)
  
  // Propose area
  const proposedArea = inferArea(issue)
  
  // Check readiness
  const readiness = assessReadiness(issue)
  
  // Detect possible duplicates (basic title similarity)
  const duplicates = [] // In real implementation, would search similar issues
  
  // Build proposal object
  const proposal = {
    sourceKey,
    sourceUrl: issue.html_url,
    action,
    processedVersion: currentVersion,
    priority: {
      existing: existingPriority,
      proposed: proposedPriority,
      shouldApply: !existingPriority && !needsEscalation && !isHighPriority
    },
    type: {
      proposed: proposedType,
      shouldApply: false // L1: never apply
    },
    area: {
      proposed: proposedArea,
      shouldApply: false // L1: never apply
    },
    readiness,
    duplicates,
    needsHuman: needsEscalation || isHighPriority || readiness.missingCriteria.length > 0
  }
  
  // L1: always just report, never delegate
  // Escalate high-priority (P0/P1) issues too
  const outcome = (needsEscalation || isHighPriority) ? 'needs-human' : 
                  readiness.ready ? 'actionable' : 'ambiguous'
  
  return {
    outcome,
    reason: buildReason(proposal, needsEscalation, readiness),
    sourceKey,
    proposal
  }
}

/**
 * Detect existing priority label
 */
function detectExistingPriority(labels, config) {
  const priorityLabels = config.labels.priorities
  for (const [level, label] of Object.entries(priorityLabels)) {
    if (labels.includes(label)) {
      return label
    }
  }
  return null
}

/**
 * Infer priority from issue content and labels
 */
function inferPriority(issue, labels, policy) {
  const title = (issue.title || '').toLowerCase()
  const body = (issue.body || '').toLowerCase()
  const content = `${title} ${body}`
  
  // Production/critical keywords (check first for highest priority) - must be in title
  if (title.includes('production down') || title.includes('critical:') || 
      title.includes('p0:') || title.includes('site down')) {
    return 'P0: critical'
  }
  
  // Security or vulnerability issues = high priority
  if (content.includes('security:') || content.includes('vulnerability') || 
      title.includes('security')) {
    return 'P1: high'
  }
  
  // Authentication/authorization SYSTEM issues (not bug reports with auth in context)
  // Only treat as P1 if it's about the auth system being down/broken
  if (title.includes('authentication system') || title.includes('authorization system') ||
      (title.includes('auth') && (title.includes('broken') || title.includes('down')))) {
    return 'P1: high'
  }
  
  // Bug vs feature - check title first
  if (title.includes('bug:') || title.includes('error:') || title.includes('crash:')) {
    return 'P2: medium'
  }
  
  // Explicit feature request
  if (title.includes('feature:') || title.includes('enhancement:') || 
      content.includes('feature request')) {
    return 'P3: low'
  }
  
  // Default to medium for unclear issues
  return 'P2: medium'
}

/**
 * Infer type from issue content
 */
function inferType(issue) {
  const title = (issue.title || '').toLowerCase()
  const body = (issue.body || '').toLowerCase()
  const content = `${title} ${body}`
  
  if (content.includes('bug') || content.includes('error') || 
      content.includes('broken') || content.includes('fix')) {
    return 'type:bug'
  }
  
  if (content.includes('feature') || content.includes('enhancement') || 
      content.includes('add')) {
    return 'type:feature'
  }
  
  if (content.includes('docs') || content.includes('documentation')) {
    return 'type:docs'
  }
  
  if (content.includes('test') || content.includes('testing')) {
    return 'type:test'
  }
  
  return 'type:unknown'
}

/**
 * Infer area from issue content
 */
function inferArea(issue) {
  const title = (issue.title || '').toLowerCase()
  const body = (issue.body || '').toLowerCase()
  const content = `${title} ${body}`
  
  if (content.includes('auth') || content.includes('login') || 
      content.includes('logout') || content.includes('session')) {
    return 'area:auth'
  }
  
  if (content.includes('options') || content.includes('trading') || 
      content.includes('chain')) {
    return 'area:options'
  }
  
  if (content.includes('ui') || content.includes('component') || 
      content.includes('layout')) {
    return 'area:ui'
  }
  
  if (content.includes('api') || content.includes('backend') || 
      content.includes('server')) {
    return 'area:backend'
  }
  
  if (content.includes('ci') || content.includes('workflow') || 
      content.includes('build') || content.includes('deploy')) {
    return 'area:infrastructure'
  }
  
  return 'area:general'
}

/**
 * Assess if issue is ready for action
 */
function assessReadiness(issue) {
  const body = issue.body || ''
  const missingCriteria = []
  
  // Check for acceptance criteria or steps to reproduce
  if (body.length < 50) {
    missingCriteria.push('Insufficient detail')
  }
  
  const hasStepsOrCriteria = 
    body.toLowerCase().includes('steps') || 
    body.toLowerCase().includes('reproduce') || 
    body.toLowerCase().includes('acceptance') ||
    body.toLowerCase().includes('expected') ||
    body.toLowerCase().includes('actual')
  
  if (!hasStepsOrCriteria && body.length < 200) {
    missingCriteria.push('No clear acceptance criteria or reproduction steps')
  }
  
  return {
    ready: missingCriteria.length === 0,
    missingCriteria
  }
}

/**
 * Build a human-readable reason string
 */
function buildReason(proposal, needsEscalation, readiness) {
  if (needsEscalation) {
    return `Requires human review (sensitive labels or blocked patterns)`
  }
  
  // Check if P0/P1 (which triggers escalation in evaluate())
  const isHighPriority = proposal.priority.proposed === 'P0: critical' || 
                        proposal.priority.proposed === 'P1: high'
  if (isHighPriority) {
    return `Requires human review (${proposal.priority.proposed})`
  }
  
  if (!readiness.ready) {
    return `Ambiguous: ${readiness.missingCriteria.join(', ')}`
  }
  
  return `Ready for triage: priority=${proposal.priority.proposed}, type=${proposal.type.proposed}`
}
