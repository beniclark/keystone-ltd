import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubCopilotAdapter, createGitHubCopilotAdapter } from '../../../scripts/loop/delegates/github-copilot.mjs'

describe('GitHubCopilotAdapter', () => {
  let mockConnector
  let adapter

  beforeEach(() => {
    mockConnector = {
      assignCopilotToIssue: vi.fn(),
      createIssueComment: vi.fn(),
    }

    process.env.GITHUB_TOKEN = 'test-token'
  })

  describe('constructor', () => {
    it('should require a connector', () => {
      expect(() => new GitHubCopilotAdapter({ owner: 'owner', repo: 'repo' }))
        .toThrow('requires a connector')
    })

    it('should require owner and repo', () => {
      expect(() => new GitHubCopilotAdapter({ connector: mockConnector }))
        .toThrow('requires owner and repo')
    })

    it('should default to dry-run mode', () => {
      const adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
      expect(adapter.dryRun).toBe(true)
    })

    it('should accept explicit dry-run setting but require allowLiveDelegation', () => {
      // Phase 6: dryRun=false ALONE is not enough — needs allowLiveDelegation too
      const adapter1 = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
        dryRun: false,
        allowLiveDelegation: false, // Second gate closed
      })
      expect(adapter1.dryRun).toBe(true) // Double-gate enforced: stays dry-run
      
      const adapter2 = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
        dryRun: false,
        allowLiveDelegation: true, // Both gates open
      })
      expect(adapter2.dryRun).toBe(false) // Real delegation allowed
    })
  })

  describe('isAvailable', () => {
    it('should return false when no token is set', async () => {
      delete process.env.GITHUB_TOKEN
      delete process.env.GH_TOKEN
      
      const adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
      
      expect(await adapter.isAvailable()).toBe(false)
    })

    it('should return true when GITHUB_TOKEN is set', async () => {
      process.env.GITHUB_TOKEN = 'test-token'
      
      const adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
      
      expect(await adapter.isAvailable()).toBe(true)
    })

    it('should return true when GH_TOKEN is set', async () => {
      delete process.env.GITHUB_TOKEN
      process.env.GH_TOKEN = 'test-token'
      
      const adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
      
      expect(await adapter.isAvailable()).toBe(true)
    })
  })

  describe('delegate - dry-run mode', () => {
    beforeEach(() => {
      adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
        dryRun: true,
      })
    })

    it('should return dry-run payload without calling API', async () => {
      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Fix lint errors',
        doneWhen: ['npm run lint passes'],
        allowedPaths: ['src/**'],
        deniedPaths: ['.github/**'],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: ['npm run lint'],
        escalationInstructions: 'Escalate to human',
      }

      const result = await adapter.delegate(request)

      expect(result.success).toBe(true)
      expect(result.status).toBe('dry-run')
      expect(result.dryRunPayload).toBeDefined()
      expect(result.dryRunPayload.adapter).toBe('github-copilot')
      expect(result.dryRunPayload.repository).toBe('owner/repo')
      expect(result.dryRunPayload.actions).toHaveLength(2)
      
      // Verify no API calls were made
      expect(mockConnector.assignCopilotToIssue).not.toHaveBeenCalled()
      expect(mockConnector.createIssueComment).not.toHaveBeenCalled()
    })

    it('should include complete delegation details in payload', async () => {
      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Fix lint errors',
        doneWhen: ['npm run lint passes', 'Tests pass'],
        allowedPaths: ['src/**/*.js', 'tests/**/*.js'],
        deniedPaths: ['.github/**', '.loop/**'],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: ['npm run lint', 'npm test'],
        escalationInstructions: 'Escalate to human on failure',
      }

      const result = await adapter.delegate(request)

      const { delegation } = result.dryRunPayload
      expect(delegation.objective).toBe('Fix lint errors')
      expect(delegation.doneWhen).toHaveLength(2)
      expect(delegation.pathConstraints.allowed).toHaveLength(2)
      expect(delegation.pathConstraints.denied).toHaveLength(2)
      expect(delegation.limits.maxAttempts).toBe(3)
      expect(delegation.limits.maxFiles).toBe(5)
      expect(delegation.verification.commands).toHaveLength(2)
    })

    it('should include actions with correct targets', async () => {
      const request = {
        source: {
          kind: 'issue',
          number: 456,
          url: 'https://github.com/owner/repo/issues/456',
        },
        idempotencyKey: 'issue-456-run-789',
        objective: 'Fix test failure',
        doneWhen: ['Tests pass'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: [],
        escalationInstructions: 'Escalate',
      }

      const result = await adapter.delegate(request)

      const actions = result.dryRunPayload.actions
      
      // First action: assign Copilot
      expect(actions[0].type).toBe('assign-copilot')
      expect(actions[0].target.owner).toBe('owner')
      expect(actions[0].target.repo).toBe('repo')
      expect(actions[0].target.issueNumber).toBe(456)
      expect(actions[0].payload.assignees).toEqual(['copilot'])
      
      // Second action: create comment
      expect(actions[1].type).toBe('create-comment')
      expect(actions[1].target.issueNumber).toBe(456)
      expect(actions[1].payload.body).toContain('Loop Delegation')
      expect(actions[1].payload.body).toContain('issue-456-run-789')
    })
  })

  describe('delegate - real mode', () => {
    beforeEach(() => {
      // Phase 6: Real delegation requires BOTH dryRun=false AND allowLiveDelegation=true
      adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
        dryRun: false,
        allowLiveDelegation: true, // Second gate open
      })
    })

    it('should assign Copilot and create comment on success', async () => {
      mockConnector.assignCopilotToIssue.mockResolvedValue({
        id: 1,
        assignees: [{ login: 'copilot' }],
      })
      
      mockConnector.createIssueComment.mockResolvedValue({
        id: 1,
        body: 'Comment created',
      })

      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Fix lint errors',
        doneWhen: ['Lint passes'],
        allowedPaths: ['src/**'],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: ['npm run lint'],
        escalationInstructions: 'Escalate',
      }

      const result = await adapter.delegate(request)

      expect(result.success).toBe(true)
      expect(result.status).toBe('queued')
      expect(result.isolation).toBeNull()
      expect(result.dryRunPayload).toBeNull()
      
      expect(mockConnector.assignCopilotToIssue).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        'copilot'
      )
      
      expect(mockConnector.createIssueComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        123,
        expect.stringContaining('Loop Delegation')
      )
    })

    it('should return failure on API error', async () => {
      mockConnector.assignCopilotToIssue.mockRejectedValue(
        new Error('API error: Insufficient permissions')
      )

      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Fix lint errors',
        doneWhen: ['Lint passes'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: [],
        escalationInstructions: 'Escalate',
      }

      const result = await adapter.delegate(request)

      expect(result.success).toBe(false)
      expect(result.status).toBe('failed')
      expect(result.error).toContain('Insufficient permissions')
    })
  })

  describe('createIsolationResult', () => {
    beforeEach(() => {
      adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
    })

    it('should create valid isolation result with branch only', () => {
      const result = adapter.createIsolationResult('loop/fix/issue-123-abc')
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('running')
      expect(result.isolation.type).toBe('cloud-branch')
      expect(result.isolation.branch).toBe('loop/fix/issue-123-abc')
      expect(result.isolation.prUrl).toBeUndefined()
    })

    it('should create valid isolation result with branch and PR', () => {
      const result = adapter.createIsolationResult(
        'loop/fix/issue-123-abc',
        'https://github.com/owner/repo/pull/456'
      )
      
      expect(result.success).toBe(true)
      expect(result.status).toBe('running')
      expect(result.isolation.type).toBe('cloud-branch')
      expect(result.isolation.branch).toBe('loop/fix/issue-123-abc')
      expect(result.isolation.prUrl).toBe('https://github.com/owner/repo/pull/456')
    })

    it('should throw on invalid isolation', () => {
      expect(() => adapter.createIsolationResult(null))
        .toThrow('Invalid cloud-branch isolation')
    })
  })

  describe('comment formatting', () => {
    beforeEach(() => {
      adapter = new GitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
        dryRun: true,
      })
    })

    it('should format delegation comment with all sections', async () => {
      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Fix lint errors in main.js',
        doneWhen: ['Lint passes', 'No errors remain'],
        allowedPaths: ['src/**/*.js'],
        deniedPaths: ['.github/**'],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: ['npm run lint'],
        escalationInstructions: 'Escalate to human on third failure',
      }

      const result = await adapter.delegate(request)
      const comment = result.dryRunPayload.actions[1].payload.body

      expect(comment).toContain('Loop Delegation')
      expect(comment).toContain('Fix lint errors in main.js')
      expect(comment).toContain('Lint passes')
      expect(comment).toContain('No errors remain')
      expect(comment).toContain('Allowed paths')
      expect(comment).toContain('src/**/*.js')
      expect(comment).toContain('Protected paths')
      expect(comment).toContain('.github/**')
      expect(comment).toContain('Maximum 5 changed files')
      expect(comment).toContain('Maximum 3 attempts')
      expect(comment).toContain('Required verification')
      expect(comment).toContain('npm run lint')
      expect(comment).toContain('Escalate to human on third failure')
      expect(comment).toContain('issue-123-run-456')
    })

    it('should omit sections when empty', async () => {
      const request = {
        source: {
          kind: 'issue',
          number: 123,
          url: 'https://github.com/owner/repo/issues/123',
        },
        idempotencyKey: 'issue-123-run-456',
        objective: 'Simple fix',
        doneWhen: ['Fixed'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: [],
        escalationInstructions: 'Escalate',
      }

      const result = await adapter.delegate(request)
      const comment = result.dryRunPayload.actions[1].payload.body

      expect(comment).not.toContain('Allowed paths')
      expect(comment).not.toContain('Protected paths')
      expect(comment).not.toContain('Required verification')
    })
  })

  describe('createGitHubCopilotAdapter', () => {
    it('should create an adapter instance', () => {
      const adapter = createGitHubCopilotAdapter({
        connector: mockConnector,
        owner: 'owner',
        repo: 'repo',
      })
      
      expect(adapter).toBeInstanceOf(GitHubCopilotAdapter)
      expect(adapter.name).toBe('github-copilot')
    })
  })
})
