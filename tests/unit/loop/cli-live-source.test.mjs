import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRepoInfo, normalizeGitHubPayload, buildInputFromSource } from '../../../scripts/loop/cli.mjs'

describe('CLI live source fetching', () => {
  beforeEach(() => {
    // Clean up environment
    delete process.env.GITHUB_REPOSITORY
  })

  describe('getRepoInfo', () => {
    it('should parse owner and repo from GITHUB_REPOSITORY', () => {
      process.env.GITHUB_REPOSITORY = 'beniclark/keystone-ltd'
      const result = getRepoInfo()
      expect(result).toEqual({ owner: 'beniclark', repo: 'keystone-ltd' })
    })

    it('should return fallback when GITHUB_REPOSITORY is not set', () => {
      delete process.env.GITHUB_REPOSITORY
      const result = getRepoInfo()
      expect(result).toEqual({ owner: 'OWNER', repo: 'REPO' })
    })
  })

  describe('normalizeGitHubPayload', () => {
    it('should convert snake_case to camelCase', () => {
      const input = {
        workflow_run: { id: 1, head_sha: 'abc123' },
        pull_request: { number: 42, created_at: '2026-01-01' }
      }
      
      const result = normalizeGitHubPayload(input)
      
      expect(result).toEqual({
        workflowRun: { id: 1, headSha: 'abc123' },
        pullRequest: { number: 42, createdAt: '2026-01-01' }
      })
    })

    it('should handle nested objects', () => {
      const input = {
        top_level: {
          nested_field: {
            deep_value: 'test'
          }
        }
      }
      
      const result = normalizeGitHubPayload(input)
      
      expect(result).toEqual({
        topLevel: {
          nestedField: {
            deepValue: 'test'
          }
        }
      })
    })

    it('should handle arrays', () => {
      const input = {
        check_runs: [
          { id: 1, head_sha: 'abc' },
          { id: 2, head_sha: 'def' }
        ]
      }
      
      const result = normalizeGitHubPayload(input)
      
      expect(result).toEqual({
        checkRuns: [
          { id: 1, headSha: 'abc' },
          { id: 2, headSha: 'def' }
        ]
      })
    })

    it('should handle null and undefined', () => {
      expect(normalizeGitHubPayload(null)).toBe(null)
      expect(normalizeGitHubPayload(undefined)).toBe(undefined)
    })

    it('should handle primitive values', () => {
      expect(normalizeGitHubPayload('string')).toBe('string')
      expect(normalizeGitHubPayload(123)).toBe(123)
      expect(normalizeGitHubPayload(true)).toBe(true)
    })
  })

  describe('buildInputFromSource', () => {
    let mockConnector

    beforeEach(() => {
      process.env.GITHUB_REPOSITORY = 'beniclark/keystone-ltd'
      
      mockConnector = {
        getIssue: vi.fn(),
        getWorkflowRun: vi.fn(),
        getWorkflowRunJobs: vi.fn(),
        getPullRequest: vi.fn(),
        listPullRequestReviews: vi.fn(),
        listCheckRunsForRef: vi.fn(),
      }
    })

    describe('issue-intake pattern', () => {
      it('should build input from issue number', async () => {
        const issue = {
          number: 123,
          title: 'Test issue',
          body: 'Test body',
          state: 'open',
          labels: []
        }
        
        mockConnector.getIssue.mockResolvedValue(issue)
        
        const result = await buildInputFromSource('issue-intake', '123', mockConnector)
        
        expect(mockConnector.getIssue).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 123)
        expect(result).toEqual({
          action: 'reconciliation',
          issue,
          repository: {
            name: 'keystone-ltd',
            owner: { login: 'beniclark' }
          }
        })
      })

      it('should reject invalid issue number', async () => {
        await expect(
          buildInputFromSource('issue-intake', 'not-a-number', mockConnector)
        ).rejects.toThrow('Invalid issue number')
      })

      it('should handle connector failure gracefully', async () => {
        mockConnector.getIssue.mockRejectedValue(new Error('API error'))
        
        await expect(
          buildInputFromSource('issue-intake', '123', mockConnector)
        ).rejects.toThrow('Failed to fetch live source for issue-intake')
      })
    })

    describe('ci-sweeper pattern', () => {
      it('should build input from workflow run ID', async () => {
        const workflowRun = {
          id: 456,
          name: 'CI',
          status: 'completed',
          conclusion: 'failure'
        }
        
        const jobsResponse = {
          total_count: 2,
          jobs: [
            { id: 1, name: 'lint', conclusion: 'success' },
            { id: 2, name: 'test', conclusion: 'failure' }
          ]
        }
        
        mockConnector.getWorkflowRun.mockResolvedValue(workflowRun)
        mockConnector.getWorkflowRunJobs.mockResolvedValue(jobsResponse)
        
        const result = await buildInputFromSource('ci-sweeper', '456', mockConnector)
        
        expect(mockConnector.getWorkflowRun).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 456)
        expect(mockConnector.getWorkflowRunJobs).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 456)
        expect(result).toEqual({
          workflowRun,
          jobs: jobsResponse.jobs,
          logs: '',
          repository: {
            name: 'keystone-ltd',
            owner: { login: 'beniclark' }
          }
        })
      })

      it('should handle jobs response without wrapper', async () => {
        const workflowRun = { id: 456 }
        const jobsResponse = { jobs: [] }
        
        mockConnector.getWorkflowRun.mockResolvedValue(workflowRun)
        mockConnector.getWorkflowRunJobs.mockResolvedValue(jobsResponse)
        
        const result = await buildInputFromSource('ci-sweeper', '456', mockConnector)
        
        expect(result.jobs).toEqual([])
      })

      it('should reject invalid run ID', async () => {
        await expect(
          buildInputFromSource('ci-sweeper', 'not-a-number', mockConnector)
        ).rejects.toThrow('Invalid workflow run ID')
      })
    })

    describe('pr-babysitter pattern', () => {
      it('should build input from PR number', async () => {
        const pullRequest = {
          number: 789,
          title: 'Test PR',
          state: 'open',
          head: { sha: 'abc123', ref: 'feature/test' }
        }
        
        const reviews = [
          { id: 1, state: 'approved' }
        ]
        
        const checksResponse = {
          total_count: 2,
          check_runs: [
            { id: 1, name: 'CI', conclusion: 'success' }
          ]
        }
        
        mockConnector.getPullRequest.mockResolvedValue(pullRequest)
        mockConnector.listPullRequestReviews.mockResolvedValue(reviews)
        mockConnector.listCheckRunsForRef.mockResolvedValue(checksResponse)
        
        const result = await buildInputFromSource('pr-babysitter', '789', mockConnector)
        
        expect(mockConnector.getPullRequest).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 789)
        expect(mockConnector.listPullRequestReviews).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 789)
        expect(mockConnector.listCheckRunsForRef).toHaveBeenCalledWith('beniclark', 'keystone-ltd', 'abc123')
        expect(result).toEqual({
          pullRequest,
          reviews,
          checks: checksResponse.check_runs,
          conversations: [],
          linkedIssue: null,
          repository: {
            name: 'keystone-ltd',
            owner: { login: 'beniclark' }
          }
        })
      })

      it('should handle checks response without wrapper', async () => {
        const pullRequest = { number: 789, head: { sha: 'abc' } }
        const checksResponse = { check_runs: [] }
        
        mockConnector.getPullRequest.mockResolvedValue(pullRequest)
        mockConnector.listPullRequestReviews.mockResolvedValue([])
        mockConnector.listCheckRunsForRef.mockResolvedValue(checksResponse)
        
        const result = await buildInputFromSource('pr-babysitter', '789', mockConnector)
        
        expect(result.checks).toEqual([])
      })

      it('should reject invalid PR number', async () => {
        await expect(
          buildInputFromSource('pr-babysitter', 'not-a-number', mockConnector)
        ).rejects.toThrow('Invalid PR number')
      })
    })

    describe('error handling', () => {
      it('should throw for unknown pattern', async () => {
        await expect(
          buildInputFromSource('unknown-pattern', '123', mockConnector)
        ).rejects.toThrow('Unknown pattern')
      })

      it('should wrap connector errors with context', async () => {
        mockConnector.getIssue.mockRejectedValue(new Error('Network failure'))
        
        await expect(
          buildInputFromSource('issue-intake', '123', mockConnector)
        ).rejects.toThrow('Failed to fetch live source for issue-intake: Network failure')
      })
    })
  })
})
