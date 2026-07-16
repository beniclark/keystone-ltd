/**
 * Pre-tool-use policy hook for GitHub Copilot
 * Enforces .loop/policy.json rules before risky tool executions
 * 
 * Denies:
 * - Edits to protected paths
 * - Destructive Git commands (force push, hard reset, branch deletion on protected branches)
 * - Workflow/governance self-modification without human approval
 * - Dependency manifest changes without explicit override
 */

import { loadPolicy, isProtectedPath, checkFilesAllowed } from '../core/policy.mjs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Parse tool use payload from stdin (GitHub Copilot hook contract)
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
 * Check if a Git command is destructive on protected branches
 * @param {string} command - Git command string
 * @param {object} policy - Policy object
 * @returns {boolean}
 */
function isDestructiveGitCommand(command, policy) {
  const destructivePatterns = [
    /git\s+push\s+.*--force/,
    /git\s+push\s+.*-f\b/,
    /git\s+reset\s+--hard/,
    /git\s+branch\s+-D\b/,
    /git\s+branch\s+--delete\s+--force/,
  ]
  
  // Check if command matches any destructive pattern
  const isDestructive = destructivePatterns.some(pattern => pattern.test(command))
  
  if (!isDestructive) {
    return false
  }
  
  // Check if protected branch is mentioned
  const protectedBranches = policy.watchedBranches || ['main', 'master']
  const mentionsProtectedBranch = protectedBranches.some(branch => 
    command.includes(branch)
  )
  
  return mentionsProtectedBranch
}

/**
 * Check if command attempts to modify governance files
 * @param {string} command - Command string
 * @param {Array<string>} filePaths - File paths from tool payload
 * @returns {boolean}
 */
function modifiesGovernance(command, filePaths = []) {
  const governancePatterns = [
    '.github/workflows',
    '.github/hooks',
    '.loop/',
  ]
  
  // Check file paths if provided
  if (filePaths.length > 0) {
    return filePaths.some(path => 
      governancePatterns.some(pattern => path.includes(pattern))
    )
  }
  
  // Fallback: check command string
  return governancePatterns.some(pattern => command.includes(pattern))
}

/**
 * Check if command attempts to modify dependency manifests
 * @param {Array<string>} filePaths - File paths from tool payload
 * @returns {boolean}
 */
function modifiesDependencies(filePaths = []) {
  const dependencyFiles = ['package.json', 'package-lock.json']
  return filePaths.some(path => 
    dependencyFiles.some(depFile => path.endsWith(depFile))
  )
}

/**
 * Main policy enforcement logic
 * @param {object} payload - Tool use payload from Copilot
 * @param {object} policy - Loaded policy
 * @returns {{ allowed: boolean, reason: string }}
 */
function enforcePolicy(payload, policy) {
  const { tool, arguments: toolArgs } = payload
  
  // Extract file paths and command from various tool shapes
  let filePaths = []
  let command = ''
  
  if (tool === 'edit' || tool === 'create') {
    filePaths = [toolArgs?.path].filter(Boolean)
  } else if (tool === 'bash' || tool === 'powershell') {
    command = toolArgs?.command || ''
    // Also check for paths in bash/powershell tool args
    if (toolArgs?.paths) {
      filePaths = Array.isArray(toolArgs.paths) ? toolArgs.paths : [toolArgs.paths]
    }
  } else if (toolArgs?.paths) {
    filePaths = Array.isArray(toolArgs.paths) ? toolArgs.paths : [toolArgs.paths]
  } else if (toolArgs?.path) {
    filePaths = [toolArgs.path]
  }
  
  // 1. Check for protected path edits
  if (filePaths.length > 0) {
    const protectedCheck = checkFilesAllowed(policy, filePaths)
    if (!protectedCheck.allowed) {
      return {
        allowed: false,
        reason: `Policy violation: ${protectedCheck.reason}`,
      }
    }
  }
  
  // 2. Check for destructive Git commands
  if (command && isDestructiveGitCommand(command, policy)) {
    return {
      allowed: false,
      reason: 'Policy violation: Destructive Git command on protected branch denied (force push, hard reset, or branch deletion)',
    }
  }
  
  // 3. Check for governance self-modification
  if (modifiesGovernance(command, filePaths)) {
    return {
      allowed: false,
      reason: 'Policy violation: Governance self-modification requires human approval (.github/workflows, .github/hooks, .loop/)',
    }
  }
  
  // 4. Check for dependency changes (without override flag)
  if (modifiesDependencies(filePaths)) {
    // Check for explicit human-approved override in payload metadata
    const hasOverride = payload.metadata?.humanApproved === true || 
                       payload.metadata?.dependencyOverride === true
    
    if (!hasOverride) {
      return {
        allowed: false,
        reason: 'Policy violation: Dependency manifest changes require human approval (package.json, package-lock.json)',
      }
    }
  }
  
  // All checks passed
  return { allowed: true, reason: '' }
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
    
    // Enforce policy
    const result = enforcePolicy(payload, policy)
    
    // Output decision
    const output = {
      allowed: result.allowed,
      reason: result.reason || 'Policy check passed',
    }
    
    console.log(JSON.stringify(output, null, 2))
    
    // Exit with appropriate code
    // 0 = allowed, 1 = denied
    process.exit(result.allowed ? 0 : 1)
    
  } catch (err) {
    // Fail closed on error
    console.error(JSON.stringify({
      allowed: false,
      reason: `Policy hook error (fail closed): ${err.message}`,
    }, null, 2))
    process.exit(1)
  }
}

// Export for testing
export { enforcePolicy, isDestructiveGitCommand, modifiesGovernance, modifiesDependencies }

// Run if called directly (check for both direct execution and CLI invocation)
const isDirectExecution = import.meta.url === `file://${process.argv[1]}` || 
                         import.meta.url.endsWith(process.argv[1])

if (isDirectExecution) {
  main()
}
