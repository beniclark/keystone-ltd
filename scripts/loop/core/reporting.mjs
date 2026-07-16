/**
 * GitHub Step Summary Generation
 * Pure functions for generating markdown summaries for GitHub Actions
 * Phase 8: Observability
 */

/**
 * Generate GitHub Step Summary content for a loop run
 * @param {object} params - Summary parameters
 * @param {string} params.loopName - Loop name (issueIntake, ciSweeper, prBabysitter)
 * @param {string} params.mode - Loop mode (L1 or L2)
 * @param {object} params.evaluation - Pattern evaluation result
 * @param {Array<object>} params.actions - Actions taken or proposed
 * @param {boolean} params.graduationEligible - Whether proposal is eligible for L2
 * @param {string} [params.reason] - Graduation ineligibility reason
 * @returns {string} - Markdown content for step summary
 */
export function generateStepSummary({ loopName, mode, evaluation, actions = [], graduationEligible, reason }) {
  if (!loopName || !mode || !evaluation) {
    return '## Loop Run Summary\n\n⚠️ Incomplete run data — summary unavailable\n'
  }

  const lines = [
    '## Loop Run Summary',
    '',
    `**Loop:** ${formatLoopName(loopName)}`,
    `**Mode:** ${mode}`,
    `**Timestamp:** ${new Date().toISOString()}`,
    '',
  ]

  // Evaluation outcome
  lines.push('### Pattern Evaluation')
  lines.push('')
  lines.push(`**Outcome:** ${formatOutcome(evaluation.outcome)}`)
  
  if (evaluation.category) {
    lines.push(`**Category:** \`${evaluation.category}\``)
  }
  
  if (evaluation.itemsEvaluated !== undefined) {
    lines.push(`**Items Evaluated:** ${evaluation.itemsEvaluated}`)
  }
  
  if (evaluation.itemsSkipped !== undefined) {
    lines.push(`**Items Skipped:** ${evaluation.itemsSkipped} (duplicate/cooldown)`)
  }

  lines.push('')

  // Actions taken or proposed
  if (actions.length > 0) {
    lines.push('### Actions')
    lines.push('')
    
    for (const action of actions) {
      const icon = action.taken ? '✅' : '📋'
      const status = action.taken ? 'Taken' : 'Proposed'
      lines.push(`${icon} **${status}:** ${action.description}`)
      
      if (action.target) {
        lines.push(`  - Target: ${action.target}`)
      }
      
      if (action.link) {
        lines.push(`  - [View →](${action.link})`)
      }
    }
    
    lines.push('')
  } else {
    lines.push('### Actions')
    lines.push('')
    lines.push('_No actions taken or proposed_')
    lines.push('')
  }

  // L2 graduation status
  lines.push('### L2 Graduation')
  lines.push('')
  
  if (mode === 'L2' && graduationEligible === true) {
    lines.push('✅ **Eligible** — Proposal meets L2 safety criteria')
  } else if (mode === 'L2' && graduationEligible === false) {
    lines.push('❌ **Not Eligible**')
    if (reason) {
      lines.push(`  - Reason: ${reason}`)
    }
  } else if (mode === 'L1') {
    lines.push('ℹ️ **Not Evaluated** — L1 report-only mode')
  } else if (graduationEligible === undefined) {
    lines.push('ℹ️ **Not Evaluated** — Graduation check not performed')
  }
  
  lines.push('')

  // Next steps / escalation
  if (evaluation.outcome === 'escalated' || evaluation.outcome === 'blocked') {
    lines.push('### Next Steps')
    lines.push('')
    lines.push('🚨 **Human intervention required**')
    
    if (evaluation.escalationReason) {
      lines.push(`  - ${evaluation.escalationReason}`)
    }
    
    lines.push('')
    lines.push('Review the loop state issue for full context and take appropriate action.')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Format loop name for display
 * @param {string} loopName - Loop name in camelCase
 * @returns {string} - Human-readable loop name
 */
function formatLoopName(loopName) {
  const names = {
    issueIntake: 'Issue Intake',
    ciSweeper: 'CI Sweeper',
    prBabysitter: 'PR Babysitter',
  }
  return names[loopName] || loopName
}

/**
 * Format outcome with icon
 * @param {string} outcome - Outcome string
 * @returns {string} - Formatted outcome with icon
 */
function formatOutcome(outcome) {
  const icons = {
    'discovered': '🔍 Discovered',
    'no-op': '⏭️ No-op',
    'proposed': '📝 Proposed',
    'delegated': '🚀 Delegated',
    'verified': '✅ Verified',
    'blocked': '🚫 Blocked',
    'escalated': '🚨 Escalated',
  }
  return icons[outcome] || outcome
}

/**
 * Write step summary to GITHUB_STEP_SUMMARY when available
 * @param {string} content - Markdown content
 * @returns {boolean} - True if written, false if not in CI
 */
export function writeStepSummary(content) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  
  if (!summaryPath) {
    // Not in GitHub Actions — skip silently
    return false
  }
  
  // In real GitHub Actions, we would append to the file:
  // await appendFile(summaryPath, content, 'utf-8')
  // For now, this is just a marker for where the write would occur
  console.log('Would write to GITHUB_STEP_SUMMARY:', summaryPath)
  console.log(content)
  
  return true
}
