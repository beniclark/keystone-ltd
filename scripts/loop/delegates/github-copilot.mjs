/**
 * GitHub Copilot delegation adapter
 * Dry-run is the DEFAULT; real delegation requires explicit opt-in
 */

import { DelegationAdapter, validateCloudBranchIsolation, createCloudBranchIsolation } from './index.mjs'

export class GitHubCopilotAdapter extends DelegationAdapter {
  /**
   * @param {object} options
   * @param {object} options.connector - GitHubConnector instance
   * @param {string} options.owner - Repository owner
   * @param {string} options.repo - Repository name
   * @param {boolean} [options.dryRun=true] - Dry-run mode (default: true)
   */
  constructor({ connector, owner, repo, dryRun = true }) {
    super('github-copilot')
    
    if (!connector) {
      throw new Error('GitHubCopilotAdapter requires a connector')
    }
    if (!owner || !repo) {
      throw new Error('GitHubCopilotAdapter requires owner and repo')
    }
    
    this.connector = connector
    this.owner = owner
    this.repo = repo
    this.dryRun = dryRun
  }

  /**
   * Check if adapter is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      // Check for GitHub token
      const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
      if (!token) {
        return false
      }
      
      // In real mode, could verify Copilot is installed/enabled
      // For now, just check token exists
      return true
    } catch {
      return false
    }
  }

  /**
   * Delegate work to GitHub Copilot
   * @param {import('./index.mjs').DelegationRequest} request
   * @returns {Promise<import('./index.mjs').DelegationResult>}
   */
  async delegate(request) {
    // Validate request structure
    this.validateRequest(request)

    // Build dry-run payload
    const payload = this._buildPayload(request)

    // Dry-run mode: return complete payload for human review
    if (this.dryRun) {
      return {
        success: true,
        status: 'dry-run',
        isolation: null,
        dryRunPayload: payload,
        error: null,
        metadata: {
          adapter: this.name,
          dryRun: true,
          timestamp: new Date().toISOString(),
        },
      }
    }

    // Real delegation mode: assign Copilot to the issue
    try {
      // Attempt to assign Copilot to the issue
      // NEEDS_LIVE_VERIFICATION: The exact API shape and bot login may vary
      const assignResult = await this.connector.assignCopilotToIssue(
        this.owner,
        this.repo,
        request.source.number,
        'copilot' // May need to be adjusted based on actual bot username
      )

      // Create issue comment with delegation instructions
      const commentBody = this._formatDelegationComment(request)
      await this.connector.createIssueComment(
        this.owner,
        this.repo,
        request.source.number,
        commentBody
      )

      // In cloud delegation, we don't immediately know the branch/PR
      // The agent will create them asynchronously
      // For now, mark as queued with no isolation details
      return {
        success: true,
        status: 'queued',
        isolation: null, // Will be populated when agent creates branch/PR
        dryRunPayload: null,
        error: null,
        metadata: {
          adapter: this.name,
          dryRun: false,
          assignResult,
          timestamp: new Date().toISOString(),
        },
      }
    } catch (err) {
      return {
        success: false,
        status: 'failed',
        isolation: null,
        dryRunPayload: null,
        error: err.message,
        metadata: {
          adapter: this.name,
          dryRun: false,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }

  /**
   * Build complete delegation payload for dry-run
   * @param {import('./index.mjs').DelegationRequest} request
   * @returns {object}
   * @private
   */
  _buildPayload(request) {
    return {
      adapter: this.name,
      repository: `${this.owner}/${this.repo}`,
      source: {
        kind: request.source.kind,
        number: request.source.number,
        url: request.source.url,
      },
      idempotencyKey: request.idempotencyKey,
      delegation: {
        objective: request.objective,
        doneWhen: request.doneWhen,
        pathConstraints: {
          allowed: request.allowedPaths,
          denied: request.deniedPaths,
        },
        limits: {
          maxAttempts: request.maxAttempts,
          maxFiles: request.maxFiles,
        },
        verification: {
          commands: request.verificationCommands,
        },
        escalation: request.escalationInstructions,
      },
      actions: [
        {
          type: 'assign-copilot',
          target: {
            owner: this.owner,
            repo: this.repo,
            issueNumber: request.source.number,
          },
          payload: {
            assignees: ['copilot'], // NEEDS_LIVE_VERIFICATION
          },
        },
        {
          type: 'create-comment',
          target: {
            owner: this.owner,
            repo: this.repo,
            issueNumber: request.source.number,
          },
          payload: {
            body: this._formatDelegationComment(request),
          },
        },
      ],
      metadata: request.metadata,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Format delegation instructions as issue comment
   * @param {import('./index.mjs').DelegationRequest} request
   * @returns {string}
   * @private
   */
  _formatDelegationComment(request) {
    const pathsSection = request.allowedPaths.length > 0
      ? `\n\n**Allowed paths:**\n${request.allowedPaths.map(p => `- \`${p}\``).join('\n')}`
      : ''
    
    const deniedSection = request.deniedPaths.length > 0
      ? `\n\n**Protected paths (DO NOT EDIT):**\n${request.deniedPaths.map(p => `- \`${p}\``).join('\n')}`
      : ''
    
    const verifySection = request.verificationCommands.length > 0
      ? `\n\n**Required verification:**\n${request.verificationCommands.map(c => `- \`${c}\``).join('\n')}`
      : ''
    
    return `<!-- loop-delegation: ${request.idempotencyKey} -->
# 🤖 Loop Delegation

**Objective:** ${request.objective}

**Done when:**
${request.doneWhen.map(c => `- ${c}`).join('\n')}
${pathsSection}
${deniedSection}

**Limits:**
- Maximum ${request.maxFiles} changed files
- Maximum ${request.maxAttempts} attempts
${verifySection}

**On failure or uncertainty:** ${request.escalationInstructions}

---
*Delegated by loop runtime • Key: \`${request.idempotencyKey}\`*`
  }

  /**
   * Update delegation result with isolation details from completed agent work
   * This is called after the agent creates a branch/PR
   * @param {string} branch - Branch name
   * @param {string} [prUrl] - PR URL
   * @returns {object} - Updated isolation result
   */
  createIsolationResult(branch, prUrl = null) {
    const isolation = createCloudBranchIsolation(branch, prUrl)
    
    if (!validateCloudBranchIsolation(isolation)) {
      throw new Error('Invalid cloud-branch isolation result')
    }
    
    return {
      success: true,
      status: 'running',
      isolation,
      dryRunPayload: null,
      error: null,
      metadata: {
        adapter: this.name,
        timestamp: new Date().toISOString(),
      },
    }
  }
}

/**
 * Create GitHub Copilot adapter with dry-run by default
 * @param {object} options
 * @returns {GitHubCopilotAdapter}
 */
export function createGitHubCopilotAdapter(options) {
  return new GitHubCopilotAdapter(options)
}
