#!/usr/bin/env node

/**
 * Bootstrap branch protection for the loop system
 * Phase 1 stub — prints commands for manual execution
 * Full implementation in Phase 2/3
 */

console.log('=== Loop Bootstrap: Branch Protection Setup ===\n')

console.log('This script will configure branch protection for the main branch.')
console.log('Since this requires admin permissions, please run the following commands manually:\n')

console.log('1. Create a repository ruleset for the main branch:')
console.log(`
gh api repos/{owner}/{repo}/rulesets \\
  --method POST \\
  --field name='Main Branch Protection' \\
  --field enforcement=active \\
  --field target=branch \\
  --field 'conditions[ref_name][include][]=refs/heads/main' \\
  --field 'rules[][type]=required_status_checks' \\
  --field 'rules[][parameters][strict_required_status_checks_policy]=true' \\
  --field 'rules[][parameters][required_status_checks][][context]=All Required Checks' \\
  --field 'rules[][type]=pull_request' \\
  --field 'rules[][parameters][required_approving_review_count]=1' \\
  --field 'rules[][parameters][dismiss_stale_reviews_on_push]=false' \\
  --field 'rules[][parameters][require_code_owner_review]=false' \\
  --field 'rules[][parameters][require_last_push_approval]=false' \\
  --field 'rules[][parameters][required_review_thread_resolution]=true' \\
  --field 'rules[][type]=creation' \\
  --field 'rules[][type]=deletion' \\
  --field 'bypass_actors[][actor_type]=RepositoryRole' \\
  --field 'bypass_actors[][actor_id]=5'
`)

console.log('\n2. Verify the ruleset is active:')
console.log('   gh api repos/{owner}/{repo}/rulesets\n')

console.log('Replace {owner} and {repo} with your GitHub username/org and repository name.\n')

console.log('For more details, see LOOP.md (Phase 1 section).')

process.exit(0)
