/**
 * Loop CLI - Repository-Owned Loop Engineering
 * Phase 6 implementation: L2 graduation with double-gate reporting
 */

import { loadConfig } from './core/config.mjs'
import { loadPolicy } from './core/policy.mjs'
import { isEligibleForL2 } from './core/graduation.mjs'
import { createWorktreeManager } from './isolation/worktree.mjs'
import { main as labelsSync } from './labels-sync.mjs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const repoRoot = process.cwd()

/**
 * Parse command-line arguments
 * @param {Array<string>} argv - Process arguments
 * @returns {object} - Parsed arguments
 */
export function parseArgs(argv) {
  const args = {
    command: argv[2] || 'help',
    pattern: null,
    mode: 'l1',
    dryRun: true,
    source: null,
    apply: false,
    fixture: null,
  }

  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--pattern' && next) {
      args.pattern = next
      i++
    } else if (arg === '--mode' && next) {
      args.mode = next.toLowerCase()
      i++
    } else if (arg === '--dry-run' && (next === 'true' || next === 'false' || next === '1' || next === '0')) {
      args.dryRun = next === 'true' || next === '1'
      i++
    } else if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--apply') {
      args.apply = true
      args.dryRun = false
    } else if (arg === '--source' && next) {
      args.source = next
      i++
    } else if (arg === '--fixture' && next) {
      args.fixture = next
      i++
    }
  }

  return args
}

/**
 * Doctor command - check system health
 * Phase 8: Extended checks for state uniqueness, labels, workflows, adapter, and pause state
 */
async function doctor() {
  console.log('=== Loop Doctor ===\n')

  let exitCode = 0
  let config, policy

  // Check 1: Config validity
  try {
    config = await loadConfig(repoRoot)
    console.log('✓ Config loaded and valid')
    console.log(`  Mode: ${config.mode}`)
    console.log(`  Adapter: ${config.adapter.backend} (dry-run: ${config.adapter.dryRun})`)
  } catch (err) {
    console.error('✗ Config error:', err.message)
    exitCode = 1
  }

  // Check 2: Policy validity
  try {
    policy = await loadPolicy(repoRoot)
    console.log('✓ Policy loaded and valid')
    console.log(`  Max attempts: ${policy.maxAttempts}`)
    console.log(`  Max files: ${policy.maxChangedFiles}`)
    console.log(`  Protected paths: ${policy.protectedPaths.length}`)
  } catch (err) {
    console.error('✗ Policy error:', err.message)
    exitCode = 1
  }

  // Check 3: GITHUB_TOKEN presence
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (token) {
    console.log('✓ GITHUB_TOKEN present')
  } else {
    console.error('✗ GITHUB_TOKEN not found in environment')
    exitCode = 1
  }

  // Check 4: Git worktree availability
  try {
    const wtManager = createWorktreeManager({ repoRoot })
    const worktrees = await wtManager.list()
    console.log(`✓ Worktree manager operational (${worktrees.length} tracked)`)
  } catch (err) {
    console.error('✗ Worktree error:', err.message)
    exitCode = 1
  }

  // Check 5: Pattern modules existence (defensive — Rusty may be working on them)
  const patterns = ['issue-intake', 'ci-sweeper', 'pr-babysitter']
  for (const pattern of patterns) {
    try {
      await readFile(resolve(repoRoot, 'scripts', 'loop', 'patterns', `${pattern}.mjs`), 'utf-8')
      console.log(`✓ Pattern module exists: ${pattern}`)
    } catch {
      console.warn(`⚠ Pattern module not yet available: ${pattern} (may be under development)`)
    }
  }

  // Check 6: State issue uniqueness (best-effort — requires GitHub API)
  console.log('\nℹ️ State issue uniqueness check requires GitHub API')
  console.log('  Run manually: gh issue list --label "loop:state" --json number,title')
  console.log('  Expected: Exactly one open issue with loop:state label')

  // Check 7: Pause state consistency
  if (config && config.labels) {
    const pausedLabel = config.labels.paused
    console.log(`\nℹ️ Pause state check: Look for label "${pausedLabel}" on state issue`)
    console.log('  If present, all loops are paused — no automated actions will occur')
  }

  // Check 8: Required labels present (validate against labels.json)
  try {
    const labelsPath = resolve(repoRoot, '.loop/labels.json')
    const labelsData = await readFile(labelsPath, 'utf-8')
    const labelsConfig = JSON.parse(labelsData)
    
    const requiredLabels = [
      ...Object.keys(labelsConfig.labels.priority || {}),
      ...Object.keys(labelsConfig.labels.loop || {}),
    ]
    
    console.log(`\n✓ Labels configuration valid (${requiredLabels.length} labels defined)`)
    console.log('  Verify live sync: npm run loop -- labels --dry-run')
  } catch (err) {
    console.error(`\n✗ Labels configuration error: ${err.message}`)
    exitCode = 1
  }

  // Check 9: Required workflows present
  const requiredWorkflows = [
    '.github/workflows/loop-issue-intake.yml',
    '.github/workflows/loop-ci-sweeper.yml',
    '.github/workflows/loop-pr-babysitter.yml',
    '.github/workflows/loop-run.yml',
    '.github/workflows/ci.yml',
  ]
  
  console.log()
  for (const workflow of requiredWorkflows) {
    try {
      await readFile(resolve(repoRoot, workflow), 'utf-8')
      console.log(`✓ Workflow present: ${workflow}`)
    } catch {
      console.error(`✗ Missing workflow: ${workflow}`)
      exitCode = 1
    }
  }

  // Check 10: Branch ruleset presence (best-effort — requires GitHub API)
  console.log('\nℹ️ Branch ruleset check requires GitHub API')
  console.log('  Run manually: gh api repos/{owner}/{repo}/rulesets')
  console.log('  Expected: Ruleset protecting main with required CI checks')

  // Check 11: Adapter availability
  try {
    const adapterPath = resolve(repoRoot, 'scripts/loop/delegates/github-copilot.mjs')
    await readFile(adapterPath, 'utf-8')
    console.log('\n✓ GitHub Copilot adapter present')
    console.log('  Note: Adapter contains NEEDS_LIVE_VERIFICATION — full E2E requires live Copilot API')
  } catch (err) {
    console.error(`\n✗ Adapter not found: ${err.message}`)
    exitCode = 1
  }

  // Check 12: Stale open loop PRs (best-effort — requires GitHub API)
  console.log('\nℹ️ Stale loop PR check requires GitHub API')
  console.log('  Run manually: gh pr list --label "loop:managed" --json number,title,createdAt')
  console.log('  Review: PRs open >7 days may need human intervention or cleanup')

  console.log()
  if (exitCode === 0) {
    console.log('✅ All verifiable checks passed.')
    console.log('\nℹ️ Some checks require live GitHub API access — see informational notes above.')
  } else {
    console.log('❌ Some checks failed. Review errors above.')
  }

  process.exit(exitCode)
}

/**
 * Bootstrap command - delegate to existing bootstrap script
 */
async function bootstrap() {
  console.log('=== Loop Bootstrap ===\n')
  console.log('Delegating to scripts/loop/bootstrap-branch-protection.mjs...\n')

  // Import and run the bootstrap script
  const { default: bootstrapMain } = await import('./bootstrap-branch-protection.mjs')
  
  // The bootstrap script handles its own output and exit
  // If it exports a main function, call it; otherwise it runs on import
  if (typeof bootstrapMain === 'function') {
    await bootstrapMain()
  }
}

/**
 * Dry-run command - alias for run with dry-run forced
 */
async function dryRun(args) {
  console.log('=== Loop Dry-Run ===\n')
  await run({ ...args, dryRun: true })
}

/**
 * Run command - execute loop automation
 */
async function run(args) {
  const { pattern, mode, dryRun, source, fixture } = args

  if (!pattern) {
    console.error('Error: --pattern is required')
    console.error('Usage: run --pattern <name> --mode <l1|l2> --dry-run <true|false> --source <ref> [--fixture <path>]')
    process.exit(1)
  }

  console.log(`=== Loop Run: ${pattern} ===`)
  console.log(`Mode: ${mode.toUpperCase()}, Dry-run: ${dryRun}, Source: ${source || 'N/A'}\n`)

  // Load config and policy
  let config, policy
  try {
    config = await loadConfig(repoRoot)
    policy = await loadPolicy(repoRoot)
  } catch (err) {
    console.error('Fatal: Failed to load config/policy:', err.message)
    process.exit(1)
  }

  // Verify mode matches config
  if (config.mode.toLowerCase() !== mode) {
    console.warn(`Warning: Requested mode ${mode} differs from config mode ${config.mode}`)
  }

  // Attempt to load pattern module (defensive — may not exist yet)
  let patternModule
  try {
    const modulePath = `./patterns/${pattern}.mjs`
    patternModule = await import(modulePath)
    console.log(`✓ Loaded pattern module: ${pattern}`)
  } catch (err) {
    console.warn(`⚠ Pattern module not available: ${pattern}`)
    console.warn(`  This is expected if Rusty is still implementing pattern modules.`)
    console.warn(`  Error: ${err.message}`)
    console.log()
    console.log('Would execute pattern logic here when module is complete.')
    console.log('Exiting before any model delegation (L1 no-change rule).')
    process.exit(0)
  }

  // Build the pattern input. Local/manual testing loads a JSON fixture via --fixture;
  // live workflow runs currently only pass --source (a ref), since fetching the live
  // issue/PR/workflow-run payload via GitHubConnector is NEEDS_LIVE_VERIFICATION and
  // not yet wired here (see LOOP.md Phase 3/5 caveats).
  let input = null
  if (fixture) {
    try {
      const fixturePath = resolve(repoRoot, fixture)
      input = JSON.parse(await readFile(fixturePath, 'utf-8'))
      console.log(`✓ Loaded fixture input: ${fixture}`)
    } catch (err) {
      console.error(`Fatal: Failed to load fixture ${fixture}:`, err.message)
      process.exit(1)
    }

    // Normalize raw GitHub webhook payload shape (snake_case) to the
    // camelCase keys pattern modules expect. Real webhook events arrive
    // in this same snake_case shape, so this normalization will also be
    // needed once live event payloads are wired in (NEEDS_LIVE_VERIFICATION).
    if (input && input.workflow_run && !input.workflowRun) {
      input.workflowRun = input.workflow_run
    }
    if (input && input.pull_request && !input.pullRequest) {
      input.pullRequest = input.pull_request
    }
  }

  if (!input) {
    console.log()
    console.log('No --fixture provided and live GitHub payload fetching for --source is not yet wired.')
    console.log('Exiting before any evaluation (L1 no-change rule). Use --fixture <path> to test locally, e.g.:')
    console.log('  node scripts/loop/cli.mjs run --pattern issue-intake --fixture .loop/fixtures/issue-opened.json')
    process.exit(0)
  }

  // If pattern module has an `evaluate` export, call it
  if (typeof patternModule.evaluate === 'function') {
    try {
      const result = patternModule.evaluate(input, config, policy)

      console.log('\n=== Run Result ===')
      console.log(JSON.stringify(result, null, 2))

      // Phase 6: Show L2 graduation eligibility
      if (result.proposal) {
        console.log('\n=== L2 Graduation Check ===')
        
        const graduation = isEligibleForL2({
          config,
          policy,
          loopName: pattern,
          proposal: result.proposal,
          currentState: result.currentState || {}
        })
        
        console.log(`Eligible for L2 delegation: ${graduation.eligible ? 'YES' : 'NO'}`)
        console.log(`Effective mode: ${graduation.effectiveMode}`)
        console.log(`Reason: ${graduation.reason}`)
        
        // Show double-gate status
        if (graduation.eligible) {
          const liveDelegationAllowed = config.allowLiveDelegation === true
          console.log(`\nDouble-gate status:`)
          console.log(`  1. Mode is L2: ✓`)
          console.log(`  2. allowLiveDelegation: ${liveDelegationAllowed ? '✓' : '✗'}`)
          
          if (!liveDelegationAllowed) {
            console.log(`\nReal delegation BLOCKED: config.allowLiveDelegation is false`)
            console.log(`Delegation would run in dry-run mode (safe)`)
          } else {
            console.log(`\n⚠️  BOTH GATES OPEN: Real delegation would proceed`)
            console.log(`   (Still respects adapter dryRun setting)`)
          }
        }
      }

      // Exit before any model delegation if no changes (L1 rule)
      if (result.actions?.length === 0) {
        console.log('\nNo actions required. Exiting before any model delegation.')
        process.exit(0)
      }

      if (dryRun) {
        console.log('\nDry-run complete. No mutations performed.')
      }
    } catch (err) {
      console.error('Pattern execution error:', err.message)
      process.exit(1)
    }
  } else {
    console.log('Pattern module loaded but no `evaluate` export found.')
    console.log('This is expected during concurrent development.')
  }
}

/**
 * Pause command - set pause state (local concept for now)
 */
async function pause() {
  console.log('=== Loop Pause ===\n')
  console.log('Pause functionality is a TODO.')
  console.log('Full GitHub state-issue integration will be wired in later phases.')
  console.log('For now, manually add the `loop:paused` label to the state issue.')
  process.exit(0)
}

/**
 * Resume command - clear pause state
 */
async function resume() {
  console.log('=== Loop Resume ===\n')
  console.log('Resume functionality is a TODO.')
  console.log('Full GitHub state-issue integration will be wired in later phases.')
  console.log('For now, manually remove the `loop:paused` label from the state issue.')
  process.exit(0)
}

/**
 * Help command
 */
function help() {
  console.log('Loop CLI - Repository-Owned Loop Engineering\n')
  console.log('Usage: node scripts/loop/cli.mjs <command> [options]\n')
  console.log('Commands:')
  console.log('  doctor              Check loop system health and configuration')
  console.log('  bootstrap           Set up branch protection and labels')
  console.log('  dry-run             Simulate loop actions without making changes')
  console.log('  run                 Execute loop automation')
  console.log('    --pattern <name>    Pattern to run (issue-intake, ci-sweeper, pr-babysitter)')
  console.log('    --mode <l1|l2>      Loop mode (default: l1)')
  console.log('    --dry-run <bool>    Dry-run mode (default: true)')
  console.log('    --source <ref>      Source reference (issue/PR/run ID)')
  console.log('    --fixture <path>    Load a JSON fixture as pattern input (for local testing)')
  console.log('  pause               Pause loop automation (sets loop:paused label)')
  console.log('  resume              Resume loop automation (clears loop:paused label)')
  console.log('  help                Show this help message')
  console.log()
}

// Main execution (only when run directly, not when imported)
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = parseArgs(process.argv)

  try {
    switch (args.command) {
      case 'doctor':
        await doctor()
        break
      case 'bootstrap':
        await bootstrap()
        break
      case 'dry-run':
        await dryRun(args)
        break
      case 'run':
        await run(args)
        break
      case 'pause':
        await pause()
        break
      case 'resume':
        await resume()
        break
      case 'graduate':
        await graduate(args.source)
        break
      case 'labels':
        await labelsSync(args.apply ? ['node', 'labels-sync.mjs', '--apply'] : ['node', 'labels-sync.mjs'])
        break
      case 'worktree:list':
        await worktreeList(args.pattern)
        break
      case 'worktree:cleanup':
        await worktreeCleanup(args)
        break
      case 'help':
        help()
        process.exit(0)
        break
      default:
        console.error(`Unknown command: ${args.command}`)
        help()
        process.exit(1)
    }
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  }
}
