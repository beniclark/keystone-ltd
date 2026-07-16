import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubConnector } from '../../../scripts/loop/connectors/github.mjs'

describe('GitHubConnector', () => {
  let mockFetch
  let connector
  const mockToken = 'ghp_test123'

  beforeEach(() => {
    // Mock environment
    process.env.GITHUB_TOKEN = mockToken
    
    // Mock fetch
    mockFetch = vi.fn()
    connector = new GitHubConnector({ fetchImpl: mockFetch })
  })

  describe('constructor', () => {
    it('should use default fetch when not provided', () => {
      const conn = new GitHubConnector()
      expect(conn.fetchImpl).toBeDefined()
    })

    it('should use custom base URL when provided', () => {
      const conn = new GitHubConnector({ baseUrl: 'https://api.example.com' })
      expect(conn.baseUrl).toBe('https://api.example.com')
    })
  })

  describe('authentication', () => {
    it('should throw when no token is available', async () => {
      delete process.env.GITHUB_TOKEN
      delete process.env.GH_TOKEN
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({}),
      })

      await expect(connector.getIssue('owner', 'repo', 1))
        .rejects.toThrow('Missing GitHub token')
    })

    it('should use GITHUB_TOKEN when available', async () => {
      process.env.GITHUB_TOKEN = 'token1'
      delete process.env.GH_TOKEN
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ id: 1 }),
      })

      await connector.getIssue('owner', 'repo', 1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token1',
          }),
        })
      )
    })

    it('should use GH_TOKEN when GITHUB_TOKEN is not available', async () => {
      delete process.env.GITHUB_TOKEN
      process.env.GH_TOKEN = 'token2'
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ id: 1 }),
      })

      await connector.getIssue('owner', 'repo', 1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token2',
          }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle 403 permission denied', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ message: 'Access denied' }),
      })

      await expect(connector.getIssue('owner', 'repo', 1))
        .rejects.toThrow('GitHub API permission denied')
    })

    it('should handle 404 not found', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ message: 'Not found' }),
      })

      await expect(connector.getIssue('owner', 'repo', 999))
        .rejects.toThrow('GitHub API resource not found')
    })

    it('should handle 429 rate limit with retry-after', async () => {
      const headers = new Map([
        ['retry-after', '60'],
        ['x-ratelimit-remaining', '0'],
      ])
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers,
      })

      await expect(connector.getIssue('owner', 'repo', 1))
        .rejects.toThrow('GitHub API rate limit exceeded. Retry after 60s')
    })

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => {
          throw new Error('Unexpected token')
        },
      })

      await expect(connector.getIssue('owner', 'repo', 1))
        .rejects.toThrow('Malformed JSON response')
    })

    it('should handle non-JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'Plain text response',
      })

      const result = await connector.getIssue('owner', 'repo', 1)
      expect(result).toBe('Plain text response')
    })
  })

  describe('read operations', () => {
    it('should get a single issue', async () => {
      const issue = { id: 1, number: 123, title: 'Test issue' }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => issue,
      })

      const result = await connector.getIssue('owner', 'repo', 123)
      
      expect(result).toEqual(issue)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${mockToken}`,
          }),
        })
      )
    })

    it('should list issues with filters', async () => {
      const issues = [{ id: 1 }, { id: 2 }]
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => issues,
      })

      const result = await connector.listIssues('owner', 'repo', {
        state: 'open',
        labels: 'bug,help wanted',
        per_page: 10,
      })
      
      expect(result).toEqual(issues)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('state=open'),
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('labels=bug%2Chelp+wanted'),
        expect.any(Object)
      )
    })

    it('should list labels', async () => {
      const labels = [{ name: 'bug' }, { name: 'enhancement' }]
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => labels,
      })

      const result = await connector.listLabels('owner', 'repo')
      expect(result).toEqual(labels)
    })

    it('should get a pull request', async () => {
      const pr = { id: 1, number: 456, title: 'Test PR' }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => pr,
      })

      const result = await connector.getPullRequest('owner', 'repo', 456)
      expect(result).toEqual(pr)
    })

    it('should list PR reviews', async () => {
      const reviews = [{ id: 1, state: 'APPROVED' }]
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => reviews,
      })

      const result = await connector.listPullRequestReviews('owner', 'repo', 456)
      expect(result).toEqual(reviews)
    })

    it('should list check runs for ref', async () => {
      const checkRuns = { check_runs: [{ id: 1, name: 'test' }] }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => checkRuns,
      })

      const result = await connector.listCheckRunsForRef('owner', 'repo', 'main')
      expect(result).toEqual(checkRuns)
    })

    it('should list workflow runs', async () => {
      const runs = { workflow_runs: [{ id: 1 }] }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => runs,
      })

      const result = await connector.listWorkflowRuns('owner', 'repo', {
        branch: 'main',
        status: 'failure',
      })
      
      expect(result).toEqual(runs)
    })

    it('should get workflow run logs URL', async () => {
      const url = await connector.getWorkflowRunLogs('owner', 'repo', 123)
      expect(url).toContain('/actions/runs/123/logs')
    })

    it('should get workflow run jobs', async () => {
      const jobsResponse = {
        total_count: 2,
        jobs: [
          { id: 1, name: 'lint', conclusion: 'success' },
          { id: 2, name: 'test', conclusion: 'failure' }
        ]
      }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => jobsResponse,
      })

      const result = await connector.getWorkflowRunJobs('owner', 'repo', 123)
      
      expect(result).toEqual(jobsResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/actions/runs/123/jobs',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github+json',
          }),
        })
      )
    })
  })

  describe('write operations', () => {
    it('should update issue body and labels', async () => {
      const updated = { id: 1, body: 'New body', labels: ['bug'] }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => updated,
      })

      const result = await connector.updateIssue('owner', 'repo', 123, {
        body: 'New body',
        labels: ['bug'],
      })
      
      expect(result).toEqual(updated)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ body: 'New body', labels: ['bug'] }),
        })
      )
    })

    it('should create issue comment', async () => {
      const comment = { id: 1, body: 'Test comment' }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => comment,
      })

      const result = await connector.createIssueComment('owner', 'repo', 123, 'Test comment')
      
      expect(result).toEqual(comment)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/123/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ body: 'Test comment' }),
        })
      )
    })

    it('should create bounded fix issue', async () => {
      const issue = { id: 1, number: 456, title: 'Fix CI failure' }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => issue,
      })

      const result = await connector.createIssue('owner', 'repo', {
        title: 'Fix CI failure',
        body: 'Automated fix for lint error',
        labels: ['loop:managed', 'bug'],
      })
      
      expect(result).toEqual(issue)
    })

    it('should assign Copilot to issue', async () => {
      const assigned = { id: 1, assignees: [{ login: 'copilot' }] }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => assigned,
      })

      const result = await connector.assignCopilotToIssue('owner', 'repo', 123, 'copilot')
      
      expect(result).toEqual(assigned)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ assignees: ['copilot'] }),
        })
      )
    })
  })

  describe('idempotency and replay', () => {
    it('should make identical calls for replayed requests', async () => {
      const issue = { id: 1, number: 123 }
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => issue,
      })

      // First call
      const result1 = await connector.getIssue('owner', 'repo', 123)
      
      // Second call (replay)
      const result2 = await connector.getIssue('owner', 'repo', 123)
      
      expect(result1).toEqual(result2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
      
      // Both calls should have identical parameters
      const call1 = mockFetch.mock.calls[0]
      const call2 = mockFetch.mock.calls[1]
      expect(call1[0]).toBe(call2[0]) // Same URL
      expect(call1[1].headers).toEqual(call2[1].headers) // Same headers
    })
  })
})
