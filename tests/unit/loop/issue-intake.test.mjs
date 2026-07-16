import { describe, it, expect, beforeEach } from 'vitest'
import { evaluate } from '../../../scripts/loop/patterns/issue-intake.mjs'
import issueOpenedFixture from '../../../.loop/fixtures/issue-opened.json'
import issueSecurityFixture from '../../../.loop/fixtures/issue-security.json'
import issueInsufficientFixture from '../../../.loop/fixtures/issue-insufficient-detail.json'
import issueStateFixture from '../../../.loop/fixtures/issue-state.json'

// Mock config and policy
const mockConfig = {
  mode: 'L1',
  labels: {
    state: 'loop:state',
    managed: 'loop:managed',
    priorities: {
      critical: 'P0: critical',
      high: 'P1: high',
      medium: 'P2: medium',
      low: 'P3: low'
    }
  }
}

const mockPolicy = {
  escalationRules: {
    sensitiveLabels: ['security', 'auth', 'P0: critical', 'P1: high'],
    blockedPatterns: ['architecture change', 'breaking change', 'database migration']
  }
}

describe('issue-intake pattern', () => {
  describe('no-op cases', () => {
    it('should skip state issue itself', () => {
      const input = {
        issue: issueStateFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('State issue excluded')
      expect(result.proposal).toBeNull()
    })
    
    it('should skip loop-managed fix issues', () => {
      const input = {
        issue: {
          number: 999,
          title: 'Fix: Bounded fix for lint errors',
          body: 'Auto-generated fix',
          labels: [{ name: 'loop:managed' }],
          created_at: '2026-07-15T10:00:00Z',
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/issues/999'
        },
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('Loop-managed fix issue excluded')
    })
    
    it('should skip already processed version (idempotency)', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'edited',
        priorState: {
          processedVersion: `${issueOpenedFixture.issue.number}-${issueOpenedFixture.issue.updated_at}`
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('Already processed')
    })
    
    it('should return no-op for empty/no-change runs', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'edited',
        priorState: {
          processedVersion: `${issueOpenedFixture.issue.number}-${issueOpenedFixture.issue.updated_at}`
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.proposal).toBeNull()
    })
  })
  
  describe('actionable cases', () => {
    it('should propose priority and type for well-formed bug report', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('actionable')
      expect(result.sourceKey).toBe('issue-123')
      expect(result.proposal).toBeDefined()
      expect(result.proposal.priority.proposed).toBeDefined()
      expect(result.proposal.type.proposed).toBeDefined()
      expect(result.proposal.area.proposed).toBeDefined()
      expect(result.proposal.readiness.ready).toBe(true)
    })
    
    it('should detect auth-related issues and suggest area:auth', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.area.proposed).toBe('area:auth')
    })
    
    it('should classify as type:bug for bug reports', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.type.proposed).toBe('type:bug')
    })
    
    it('should never apply labels in L1 mode', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.type.shouldApply).toBe(false)
      expect(result.proposal.area.shouldApply).toBe(false)
    })
  })
  
  describe('needs-human cases', () => {
    it('should escalate security issues', () => {
      const input = {
        issue: issueSecurityFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.reason).toContain('human review')
      expect(result.proposal.needsHuman).toBe(true)
    })
    
    it('should escalate P0/P1 issues', () => {
      const input = {
        issue: {
          number: 127,
          title: 'CRITICAL: Production down',
          body: 'The entire production site is down. Users cannot access the application.',
          labels: [],
          created_at: '2026-07-15T10:00:00Z',
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/issues/127'
        },
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.proposal.priority.proposed).toBe('P0: critical')
    })
    
    it('should preserve existing human-applied priority labels', () => {
      const input = {
        issue: {
          number: 128,
          title: 'Update documentation',
          body: 'Need to update the README with new features.',
          labels: [{ name: 'P1: high' }],
          created_at: '2026-07-15T10:00:00Z',
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/issues/128'
        },
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.priority.existing).toBe('P1: high')
      expect(result.proposal.priority.proposed).toBe('P1: high')
    })
  })
  
  describe('ambiguous cases', () => {
    it('should mark insufficient detail as ambiguous', () => {
      const input = {
        issue: issueInsufficientFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('ambiguous')
      expect(result.reason).toContain('Ambiguous')
      expect(result.proposal.readiness.ready).toBe(false)
      expect(result.proposal.readiness.missingCriteria.length).toBeGreaterThan(0)
    })
  })
  
  describe('malformed input', () => {
    it('should handle missing issue data', () => {
      const input = {
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('malformed')
      expect(result.reason).toContain('Missing or invalid')
      expect(result.proposal).toBeNull()
    })
    
    it('should handle null issue', () => {
      const input = {
        issue: null,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('malformed')
    })
  })
  
  describe('priority inference', () => {
    it('should infer P1: high for auth issues', () => {
      const input = {
        issue: {
          number: 129,
          title: 'Authentication broken after update',
          body: 'Users cannot log in after the latest deployment. This is blocking access.\n\n## Steps\n1. Try to log in\n2. See error',
          labels: [],
          created_at: '2026-07-15T10:00:00Z',
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/issues/129'
        },
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.priority.proposed).toBe('P1: high')
    })
    
    it('should infer P3: low for feature requests', () => {
      const input = {
        issue: {
          number: 130,
          title: 'Feature: Add export functionality',
          body: 'It would be nice to export data to CSV.\n\n## Acceptance Criteria\n- Export button in UI\n- Downloads CSV file',
          labels: [],
          created_at: '2026-07-15T10:00:00Z',
          updated_at: '2026-07-15T10:00:00Z',
          html_url: 'https://github.com/test/test/issues/130'
        },
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.priority.proposed).toBe('P3: low')
      expect(result.proposal.type.proposed).toBe('type:feature')
    })
  })
  
  describe('L1 constraints', () => {
    it('should never delegate in L1 mode', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      // Proposal should exist but shouldApply should be false for all actions
      expect(result.proposal).toBeDefined()
      expect(result.proposal.type.shouldApply).toBe(false)
      expect(result.proposal.area.shouldApply).toBe(false)
    })
    
    it('should link to source issue URL in proposal', () => {
      const input = {
        issue: issueOpenedFixture.issue,
        action: 'opened'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.sourceUrl).toBe(issueOpenedFixture.issue.html_url)
      expect(result.proposal.sourceUrl).toContain('https://github.com')
    })
  })
})
