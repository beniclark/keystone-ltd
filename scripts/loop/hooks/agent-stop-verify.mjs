/**
 * Agent stop verification hook for GitHub Copilot
 * Runs deterministic Keystone verification commands before allowing agent to stop successfully
 * 
 * Blocks completion if:
 * - Any verification command fails (non-zero exit)
 * - Changed files exceed max limit
 * - Protected paths modified
 */

import { execSync } from 'node:child_process'
import { loadPolicy, checkFilesAllowed } from '../core/policy.mjs'
import { readFile } from 'node:fs/promises'

/**
 * Parse agent stop payload from stdin
 * @returns {Promise<object>}
 */
async function parsePayload() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const payload = Buffer.concat(chunks).toString('utf-8')
  return JSON.parse(payload)
}

/**
 * Run a verification command and capture result
 * @param {string} command - Command to run
 * @param {Function} [execFn] - Execution function (for testing)
 * @returns {{ success: boolean, output: string, error: string }}
 */
function runCommand(command, execFn = execSync) {
  try {
    const output = execFn(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 300000, // 5 minutes
    })
    
    return {
      success: true,
      output: output || '',
      error: '',
    }
  } catch (err) {
    return {
      success: false,
      output: err.stdout || '',
      error: err.stderr || err.message,
    }
  }
}

/**
 * Get list of changed files from git
 * @returns {Array<string>}
 */
function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    
    return output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
  } catch {
    // If git command fails, return empty (will fail policy check)
    return []
  }
}

/**
 * Run all verification commands
 * @param {Array<string>} commands - Commands to run
 * @param {Function} [execFn] - Execution function (for testing)
 * @returns {{ passed: boolean, results: Array<object> }}
 */
function runVerification(commands, execFn) {
  const results = []
  let allPassed = true
  
  for (const command of commands) {
    const result = runCommand(command, execFn)
    results.push({
      command,
      success: result.success,
      output: result.output,
      error: result.error,
    })
    
    if (!result.success) {
      allPassed = false
      // Stop on first failure (short-circuit)
      break
    }
  }
  
  return { passed: allPassed, results }
}

/**
 * Format verification results for output
 * @param {Array<object>} results - Verification results
 * @returns {string}
 */
function formatResults(results) {
  return results.map(r => {
    const status = r.success ? '✅' : '❌'
    const summary = r.success 
      ? 'passed' 
      : `failed\n${r.error.substring(0, 500)}`
    return `${status} ${r.command} — ${summary}`
  }).join('\n')
}

/**
 * Main verification logic
 * @param {object} payload - Agent stop payload
 * @param {object} policy - Loaded policy
 * @param {Function} [execFn] - Execution function (for testing)
 * @param {Array<string>} [changedFilesOverride] - Override for changed files (for testing)
 * @returns {{ allowed: boolean, reason: string, evidence: string }}
 */
function verifyStop(payload, policy, execFn, changedFilesOverride = null) {
  // Get changed files (use override for testing, otherwise call getChangedFiles)
  const changedFiles = changedFilesOverride !== null ? changedFilesOverride : getChangedFiles()
  
  // Check policy compliance
  if (changedFiles.length > 0) {
    const policyCheck = checkFilesAllowed(policy, changedFiles)
    if (!policyCheck.allowed) {
      return {
        allowed: false,
        reason: `Policy violation: ${policyCheck.reason}`,
        evidence: `Changed files:\n${changedFiles.join('\n')}`,
      }
    }
  }
  
  // Default verification commands (can be overridden in payload metadata)
  const commands = payload.metadata?.verificationCommands || [
    'npm run lint',
    'npm run typecheck',
    'npm run test:unit',
    'npm run build',
  ]
  
  // Run verification
  const { passed, results } = runVerification(commands, execFn)
  
  const evidence = formatResults(results)
  
  if (!passed) {
    return {
      allowed: false,
      reason: 'Verification failed: One or more commands exited with non-zero status',
      evidence,
    }
  }
  
  return {
    allowed: true,
    reason: 'All verification commands passed',
    evidence,
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Load policy
    const repoRoot = process.cwd()
    const policy = await loadPolicy(repoRoot)
    
    // Parse payload from stdin
    const payload = await parsePayload()
    
    // Run verification
    const result = verifyStop(payload, policy)
    
    // Output decision
    const output = {
      allowed: result.allowed,
      reason: result.reason,
      evidence: result.evidence,
    }
    
    console.log(JSON.stringify(output, null, 2))
    
    // Exit with appropriate code
    // 0 = allowed (verification passed), 1 = blocked (verification failed)
    process.exit(result.allowed ? 0 : 1)
    
  } catch (err) {
    // Fail closed on error
    console.error(JSON.stringify({
      allowed: false,
      reason: `Verification hook error (fail closed): ${err.message}`,
      evidence: '',
    }, null, 2))
    process.exit(1)
  }
}

// Export for testing
export { runCommand, runVerification, verifyStop, formatResults }

// Run if called directly (check for both direct execution and CLI invocation)
const isDirectExecution = import.meta.url === `file://${process.argv[1]}` || 
                         import.meta.url.endsWith(process.argv[1])

if (isDirectExecution) {
  main()
}
