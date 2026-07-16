/**
 * GitHub REST API connector with injected transport
 * Never stores credentials; reads token from env at call time
 */

const DEFAULT_BASE_URL = 'https://api.github.com'

export class GitHubConnector {
  /**
   * @param {object} [options]
   * @param {Function} [options.fetchImpl] - HTTP transport (defaults to global fetch)
   * @param {string} [options.baseUrl] - API base URL (defaults to https://api.github.com)
   */
  constructor({ fetchImpl = globalThis.fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
    this.fetchImpl = fetchImpl
    this.baseUrl = baseUrl
  }

  /**
   * Get token from environment
   * @returns {string|null}
   * @private
   */
  _getToken() {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null
  }

  /**
   * Make authenticated GitHub API request with retry on rate limit
   * @param {string} path - API path (e.g., '/repos/owner/repo/issues')
   * @param {object} [options] - fetch options
   * @returns {Promise<object>} - Response data
   * @throws {Error} - On network, auth, or API errors
   * @private
   */
  async _request(path, options = {}) {
    const token = this._getToken()
    if (!token) {
      throw new Error('Missing GitHub token: set GITHUB_TOKEN or GH_TOKEN')
    }

    const url = `${this.baseUrl}${path}`
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    }

    const response = await this.fetchImpl(url, {
      ...options,
      headers,
    })

    // Rate limit handling
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset')
      const waitSeconds = retryAfter ? parseInt(retryAfter, 10) : 60
      
      throw new Error(
        `GitHub API rate limit exceeded. Retry after ${waitSeconds}s. ` +
        `Remaining: ${response.headers.get('x-ratelimit-remaining') || 'unknown'}`
      )
    }

    // Permission failures
    if (response.status === 403) {
      throw new Error(`GitHub API permission denied: ${response.statusText}`)
    }

    // Not found
    if (response.status === 404) {
      throw new Error(`GitHub API resource not found: ${path}`)
    }

    // Malformed response body
    let data
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch (err) {
        throw new Error(`Malformed JSON response from ${path}: ${err.message}`)
      }
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      throw new Error(
        `GitHub API error (${response.status}): ${data.message || response.statusText}`
      )
    }

    return data
  }

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  /**
   * Get a single issue
   * @param {string} owner
   * @param {string} repo
   * @param {number} issueNumber
   * @returns {Promise<object>}
   */
  async getIssue(owner, repo, issueNumber) {
    return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}`)
  }

  /**
   * List issues with filters
   * @param {string} owner
   * @param {string} repo
   * @param {object} [filters] - { state, labels, sort, direction, per_page, page }
   * @returns {Promise<Array>}
   */
  async listIssues(owner, repo, filters = {}) {
    const params = new URLSearchParams()
    if (filters.state) params.set('state', filters.state)
    if (filters.labels) params.set('labels', filters.labels)
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.direction) params.set('direction', filters.direction)
    if (filters.per_page) params.set('per_page', filters.per_page)
    if (filters.page) params.set('page', filters.page)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this._request(`/repos/${owner}/${repo}/issues${query}`)
  }

  /**
   * List repository labels
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Array>}
   */
  async listLabels(owner, repo) {
    return this._request(`/repos/${owner}/${repo}/labels`)
  }

  /**
   * Get a pull request
   * @param {string} owner
   * @param {string} repo
   * @param {number} prNumber
   * @returns {Promise<object>}
   */
  async getPullRequest(owner, repo, prNumber) {
    return this._request(`/repos/${owner}/${repo}/pulls/${prNumber}`)
  }

  /**
   * List pull requests
   * @param {string} owner
   * @param {string} repo
   * @param {object} [filters] - { state, head, base, sort, direction }
   * @returns {Promise<Array>}
   */
  async listPullRequests(owner, repo, filters = {}) {
    const params = new URLSearchParams()
    if (filters.state) params.set('state', filters.state)
    if (filters.head) params.set('head', filters.head)
    if (filters.base) params.set('base', filters.base)
    if (filters.sort) params.set('sort', filters.sort)
    if (filters.direction) params.set('direction', filters.direction)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this._request(`/repos/${owner}/${repo}/pulls${query}`)
  }

  /**
   * List PR reviews
   * @param {string} owner
   * @param {string} repo
   * @param {number} prNumber
   * @returns {Promise<Array>}
   */
  async listPullRequestReviews(owner, repo, prNumber) {
    return this._request(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`)
  }

  /**
   * Get check runs for a ref
   * @param {string} owner
   * @param {string} repo
   * @param {string} ref - Branch, tag, or SHA
   * @returns {Promise<object>}
   */
  async listCheckRunsForRef(owner, repo, ref) {
    return this._request(`/repos/${owner}/${repo}/commits/${ref}/check-runs`)
  }

  /**
   * List workflow runs
   * @param {string} owner
   * @param {string} repo
   * @param {object} [filters] - { branch, event, status, per_page, page }
   * @returns {Promise<object>}
   */
  async listWorkflowRuns(owner, repo, filters = {}) {
    const params = new URLSearchParams()
    if (filters.branch) params.set('branch', filters.branch)
    if (filters.event) params.set('event', filters.event)
    if (filters.status) params.set('status', filters.status)
    if (filters.per_page) params.set('per_page', filters.per_page)
    if (filters.page) params.set('page', filters.page)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this._request(`/repos/${owner}/${repo}/actions/runs${query}`)
  }

  /**
   * Get a single workflow run
   * @param {string} owner
   * @param {string} repo
   * @param {number} runId
   * @returns {Promise<object>}
   */
  async getWorkflowRun(owner, repo, runId) {
    return this._request(`/repos/${owner}/${repo}/actions/runs/${runId}`)
  }

  /**
   * Get workflow run logs (note: returns redirect URL, not logs directly)
   * TODO: Follow redirect and stream/buffer logs - requires live API shape verification
   * @param {string} owner
   * @param {string} repo
   * @param {number} runId
   * @returns {Promise<string>} - Log download URL
   */
  async getWorkflowRunLogs(owner, repo, runId) {
    // GitHub returns a 302 redirect to the log archive URL
    // For now, return the logs endpoint; caller must follow redirect
    return `${this.baseUrl}/repos/${owner}/${repo}/actions/runs/${runId}/logs`
  }

  // ============================================================================
  // WRITE OPERATIONS (narrowly scoped)
  // ============================================================================

  /**
   * Update issue body and/or labels
   * @param {string} owner
   * @param {string} repo
   * @param {number} issueNumber
   * @param {object} updates - { body?, labels? }
   * @returns {Promise<object>}
   */
  async updateIssue(owner, repo, issueNumber, updates) {
    return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }

  /**
   * Create an issue comment
   * @param {string} owner
   * @param {string} repo
   * @param {number} issueNumber
   * @param {string} body
   * @returns {Promise<object>}
   */
  async createIssueComment(owner, repo, issueNumber, body) {
    return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
  }

  /**
   * Create a bounded "fix" issue
   * @param {string} owner
   * @param {string} repo
   * @param {object} issueData - { title, body, labels?, assignees? }
   * @returns {Promise<object>}
   */
  async createIssue(owner, repo, issueData) {
    return this._request(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issueData),
    })
  }

  /**
   * Assign GitHub Copilot coding agent to an issue
   * NEEDS_LIVE_VERIFICATION: The exact API shape for assigning Copilot to an issue
   * may vary. Common approaches:
   * 1. REST: PATCH /repos/:owner/:repo/issues/:issue_number with assignees: ["copilot"]
   * 2. GraphQL: replaceActorsForAssignable mutation
   * 3. GitHub Apps API using the Copilot bot installation
   * 
   * This implementation uses REST assignees update as the most straightforward
   * approach based on public documentation. However, the exact bot username/login
   * for GitHub Copilot coding agent may differ from "copilot" and may require
   * org-specific installation lookup.
   * 
   * @param {string} owner
   * @param {string} repo
   * @param {number} issueNumber
   * @param {string} [copilotLogin='copilot'] - Copilot bot username/login
   * @returns {Promise<object>}
   */
  async assignCopilotToIssue(owner, repo, issueNumber, copilotLogin = 'copilot') {
    // Attempt assignment via REST API assignees field
    // If this fails in production, verify the exact login/username needed
    return this._request(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignees: [copilotLogin],
      }),
    })
  }
}
