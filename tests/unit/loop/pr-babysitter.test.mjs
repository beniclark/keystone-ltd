import { describe, it, expect } from 'vitest'
import { evaluate } from '../../../scripts/loop/patterns/pr-babysitter.mjs'
import prReviewApprovedFixture from '../../../.loop/fixtures/pr-review-approved.json'
import prLargeScopeFixture from '../../../.loop/fixtures/pr-large-scope.json'
import prLoopManagedFixture from '../../../.loop/fixtures/pr-loop-managed-pending.json'

const mockConfig = {
  mode: 'L1',
  labels: {
    managed: 'loop:managed'
  }
}

const mockPolicy = {
  maxChangedFiles: 5
}

describe('pr-babysitter pattern', () => {
  describe('no-op cases', () => {
    it('should skip closed PRs', () => {
      const input = {
        pullRequest: {
          number: 100,
          state: 'closed',
          merged: false,
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/pull/100'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('closed or merged')
    })
    
    it('should skip merged PRs', () => {
      const input = {
        pullRequest: {
          number: 101,
          state: 'closed',
          merged: true,
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/pull/101'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('closed or merged')
    })
    
    it('should skip already processed version (idempotency)', () => {
      const input = {
        pullRequest: prReviewApprovedFixture.pull_request,
        priorState: {
          processedVersion: `${prReviewApprovedFixture.pull_request.number}-${prReviewApprovedFixture.pull_request.updated_at}`,
          checksVersion: 'none'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('Already processed')
    })
  })
  
  describe('needs-human cases', () => {
    it('should mark PR #18 as human-required', () => {
      const input = {
        pullRequest: prLargeScopeFixture.pull_request,
        reviews: prLargeScopeFixture.reviews,
        checks: prLargeScopeFixture.checks,
        conversations: prLargeScopeFixture.conversations
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.reason).toContain('Large PR')
      expect(result.proposal.status).toBe('human-required')
    })
    
    it('should mark large file count PRs as human-required', () => {
      const input = {
        pullRequest: {
          number: 102,
          state: 'open',
          draft: false,
          changed_files: 50,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/big', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/102'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.reason).toContain('Large PR')
    })
    
    it('should escalate stale PRs', () => {
      const staleDate = new Date()
      staleDate.setDate(staleDate.getDate() - 10) // 10 days ago
      
      const input = {
        pullRequest: {
          number: 103,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: staleDate.toISOString(),
          head: { ref: 'feature/old', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/103',
          labels: [{ name: 'loop:managed' }]
        },
        checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }]
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.stale).toBe(true)
      expect(result.proposal.needsHuman).toBe(true)
      expect(result.proposal.reasons.some(r => r.includes('Stale'))).toBe(true)
    })
  })
  
  describe('actionable cases', () => {
    it('should report ready state when checks pass and approved', () => {
      const input = {
        pullRequest: {
          number: 104,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/ready', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/104'
        },
        reviews: [
          {
            user: { login: 'reviewer' },
            state: 'approved',
            submitted_at: '2026-07-15T11:00:00Z'
          }
        ],
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'success' }
        ],
        conversations: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('actionable')
      expect(result.proposal.state).toBe('ready')
      expect(result.proposal.checks.allRequired).toBe(true)
      expect(result.proposal.reviews.approved).toBe(1)
    })
  })
  
  describe('blocked cases', () => {
    it('should report blocked when checks fail', () => {
      const input = {
        pullRequest: {
          number: 105,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/failing', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/105'
        },
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'failure' }
        ],
        conversations: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('blocked')
      expect(result.proposal.state).toBe('blocked')
      expect(result.proposal.checks.failing).toBe(1)
      expect(result.proposal.reasons.some(r => r.includes('failing'))).toBe(true)
    })
    
    it('should report blocked when changes requested', () => {
      const input = {
        pullRequest: {
          number: 106,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/changes', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/106'
        },
        reviews: [
          {
            user: { login: 'reviewer' },
            state: 'changes_requested',
            submitted_at: '2026-07-15T11:00:00Z'
          }
        ],
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'success' }
        ],
        conversations: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('blocked')
      expect(result.proposal.reviews.changesRequested).toBe(1)
      expect(result.proposal.reasons.some(r => r.includes('Changes requested'))).toBe(true)
    })
    
    it('should report blocked with unresolved conversations', () => {
      const input = {
        pullRequest: {
          number: 107,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/conversations', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/107'
        },
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'success' }
        ],
        conversations: [
          { resolved: false },
          { resolved: false },
          { resolved: true }
        ]
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.conversations.unresolved).toBe(2)
      expect(result.proposal.reasons.some(r => r.includes('unresolved conversation'))).toBe(true)
    })
    
    it('should report draft state separately', () => {
      const input = {
        pullRequest: {
          number: 108,
          state: 'open',
          draft: true,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/draft', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/108'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('blocked')
      expect(result.proposal.state).toBe('draft')
      expect(result.proposal.draft).toBe(true)
    })
  })
  
  describe('pending cases', () => {
    it('should report pending when checks are running', () => {
      const input = {
        pullRequest: prLoopManagedFixture.pull_request,
        reviews: prLoopManagedFixture.reviews,
        checks: prLoopManagedFixture.checks,
        conversations: prLoopManagedFixture.conversations,
        linkedIssue: prLoopManagedFixture.linkedIssue
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.checks.pending).toBe(1)
      expect(result.proposal.state).toBe('blocked')
    })
  })
  
  describe('loop-managed PR tracking', () => {
    it('should detect loop-managed PRs', () => {
      const input = {
        pullRequest: prLoopManagedFixture.pull_request,
        reviews: prLoopManagedFixture.reviews,
        checks: prLoopManagedFixture.checks,
        conversations: prLoopManagedFixture.conversations,
        linkedIssue: prLoopManagedFixture.linkedIssue
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.loopManaged).toBe(true)
    })
    
    it('should track linked issue for loop-managed PRs', () => {
      const input = {
        pullRequest: prLoopManagedFixture.pull_request,
        reviews: prLoopManagedFixture.reviews,
        checks: prLoopManagedFixture.checks,
        conversations: prLoopManagedFixture.conversations,
        linkedIssue: prLoopManagedFixture.linkedIssue
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.linkedIssue.linked).toBe(true)
      expect(result.proposal.linkedIssue.number).toBe(128)
    })
    
    it('should escalate loop-managed PRs without linked issue', () => {
      const input = {
        pullRequest: {
          ...prLoopManagedFixture.pull_request,
          number: 109
        },
        reviews: [],
        checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }],
        conversations: [],
        linkedIssue: null
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.needsHuman).toBe(true)
      expect(result.proposal.reasons).toContain('No linked issue')
    })
  })
  
  describe('check assessment', () => {
    it('should correctly count passing checks', () => {
      const input = {
        pullRequest: {
          number: 110,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/test', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/110'
        },
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'success' },
          { name: 'lint', status: 'completed', conclusion: 'success' }
        ]
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.checks.passing).toBeGreaterThan(0)
    })
  })
  
  describe('malformed input', () => {
    it('should handle missing PR data', () => {
      const input = {}
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('malformed')
      expect(result.proposal).toBeNull()
    })
  })
  
  describe('L1 constraints', () => {
    it('should never rebase in L1 mode', () => {
      const input = {
        pullRequest: prReviewApprovedFixture.pull_request,
        reviews: [prReviewApprovedFixture.review],
        checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }],
        conversations: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      // L1: only report state, never take action
      expect(result.proposal).toBeDefined()
      expect(result.proposal.state).toBeDefined()
    })
    
    it('should never merge in L1 mode', () => {
      const input = {
        pullRequest: {
          number: 111,
          state: 'open',
          draft: false,
          changed_files: 2,
          updated_at: '2026-07-15T10:00:00Z',
          head: { ref: 'feature/ready', sha: 'abc123' },
          base: { ref: 'main' },
          html_url: 'https://github.com/test/test/pull/111'
        },
        reviews: [
          {
            user: { login: 'reviewer' },
            state: 'approved',
            submitted_at: '2026-07-15T11:00:00Z'
          }
        ],
        checks: [
          { name: 'CI', status: 'completed', conclusion: 'success' }
        ],
        conversations: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      // Even if ready, L1 only reports, never merges
      expect(result.proposal.state).toBe('ready')
      expect(result.proposal.needsHuman).toBe(false) // Still needs human to merge
    })
    
    it('should link to PR URL', () => {
      const input = {
        pullRequest: prReviewApprovedFixture.pull_request,
        reviews: [prReviewApprovedFixture.review],
        checks: [{ name: 'CI', status: 'completed', conclusion: 'success' }]
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.sourceUrl).toBe(prReviewApprovedFixture.pull_request.html_url)
      expect(result.proposal.sourceUrl).toContain('/pull/')
    })
  })
})
