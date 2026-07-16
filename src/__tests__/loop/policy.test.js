import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetPolicyCache,
  isProtectedPath,
  requiresHumanGate,
  isActionAllowed,
  isActionDenied,
  requiresEscalation,
  checkFilesAllowed,
  getPolicyLimits
} from '../../../scripts/loop/core/policy.mjs'

describe('policy', () => {
  const mockPolicy = {
    maxAttempts: 3,
    maxChangedFiles: 5,
    maxConcurrentPRs: 2,
    autoMerge: false,
    protectedPaths: [
      '.env*',
      '.github/workflows/**',
      'package.json',
      'src/lib/auth.js'
    ],
    humanGatePaths: [
      '.github/workflows/**',
      'package.json',
      '**/*auth*',
      '**/*session*'
    ],
    allowedActions: {
      L1: ['read', 'report', 'label:loop:*'],
      L2: ['read', 'report', 'label:loop:*', 'label:P*', 'pr:draft']
    },
    deniedActions: ['merge', 'close:issue', 'force-push'],
    escalationRules: {
      sensitiveLabels: ['security', 'P0: critical'],
      blockedPatterns: ['breaking change', 'database migration']
    }
  }
  
  beforeEach(() => {
    resetPolicyCache()
  })
  
  describe('isProtectedPath', () => {
    it('returns true for protected paths', () => {
      expect(isProtectedPath(mockPolicy, '.env')).toBe(true)
      expect(isProtectedPath(mockPolicy, '.env.local')).toBe(true)
      expect(isProtectedPath(mockPolicy, '.github/workflows/ci.yml')).toBe(true)
      expect(isProtectedPath(mockPolicy, 'package.json')).toBe(true)
      expect(isProtectedPath(mockPolicy, 'src/lib/auth.js')).toBe(true)
    })
    
    it('returns false for allowed paths', () => {
      expect(isProtectedPath(mockPolicy, 'src/components/Button.jsx')).toBe(false)
      expect(isProtectedPath(mockPolicy, 'README.md')).toBe(false)
    })
    
    it('fails closed on missing path', () => {
      expect(isProtectedPath(mockPolicy, '')).toBe(true)
      expect(isProtectedPath(mockPolicy, null)).toBe(true)
    })
  })
  
  describe('requiresHumanGate', () => {
    it('returns true for human gate paths', () => {
      expect(requiresHumanGate(mockPolicy, '.github/workflows/ci.yml')).toBe(true)
      expect(requiresHumanGate(mockPolicy, 'package.json')).toBe(true)
      expect(requiresHumanGate(mockPolicy, 'src/lib/auth-helpers.js')).toBe(true)
      expect(requiresHumanGate(mockPolicy, 'server/session-store.js')).toBe(true)
    })
    
    it('returns false for paths not requiring human gate', () => {
      expect(requiresHumanGate(mockPolicy, 'src/components/Button.jsx')).toBe(false)
    })
  })
  
  describe('isActionAllowed', () => {
    it('allows explicitly listed actions in L1', () => {
      expect(isActionAllowed(mockPolicy, 'L1', 'read')).toBe(true)
      expect(isActionAllowed(mockPolicy, 'L1', 'report')).toBe(true)
    })
    
    it('allows wildcard actions in L1', () => {
      expect(isActionAllowed(mockPolicy, 'L1', 'label:loop:managed')).toBe(true)
      expect(isActionAllowed(mockPolicy, 'L1', 'label:loop:queued')).toBe(true)
    })
    
    it('denies non-allowed actions in L1', () => {
      expect(isActionAllowed(mockPolicy, 'L1', 'pr:draft')).toBe(false)
      expect(isActionAllowed(mockPolicy, 'L1', 'merge')).toBe(false)
    })
    
    it('allows more actions in L2', () => {
      expect(isActionAllowed(mockPolicy, 'L2', 'pr:draft')).toBe(true)
      expect(isActionAllowed(mockPolicy, 'L2', 'label:P0')).toBe(true)
    })
    
    it('fails closed on missing params', () => {
      expect(isActionAllowed(mockPolicy, '', 'read')).toBe(false)
      expect(isActionAllowed(mockPolicy, 'L1', '')).toBe(false)
    })
  })
  
  describe('isActionDenied', () => {
    it('returns true for explicitly denied actions', () => {
      expect(isActionDenied(mockPolicy, 'merge')).toBe(true)
      expect(isActionDenied(mockPolicy, 'close:issue')).toBe(true)
      expect(isActionDenied(mockPolicy, 'force-push')).toBe(true)
    })
    
    it('returns false for actions not in deny list', () => {
      expect(isActionDenied(mockPolicy, 'read')).toBe(false)
      expect(isActionDenied(mockPolicy, 'pr:draft')).toBe(false)
    })
    
    it('fails closed on missing action', () => {
      expect(isActionDenied(mockPolicy, '')).toBe(true)
    })
  })
  
  describe('requiresEscalation', () => {
    it('requires escalation for sensitive labels', () => {
      const item = {
        labels: [{ name: 'security' }],
        title: 'Bug fix',
        body: 'Simple fix'
      }
      
      expect(requiresEscalation(mockPolicy, item)).toBe(true)
    })
    
    it('requires escalation for blocked patterns in content', () => {
      const item = {
        labels: [],
        title: 'Breaking change: Update API',
        body: 'This is a breaking change'
      }
      
      expect(requiresEscalation(mockPolicy, item)).toBe(true)
    })
    
    it('does not require escalation for normal items', () => {
      const item = {
        labels: [{ name: 'bug' }],
        title: 'Fix button color',
        body: 'The button should be blue'
      }
      
      expect(requiresEscalation(mockPolicy, item)).toBe(false)
    })
    
    it('fails closed on missing item', () => {
      expect(requiresEscalation(mockPolicy, null)).toBe(true)
    })
  })
  
  describe('checkFilesAllowed', () => {
    it('allows valid file changes within limits', () => {
      const files = ['src/Button.jsx', 'src/Card.jsx']
      const result = checkFilesAllowed(mockPolicy, files)
      
      expect(result.allowed).toBe(true)
      expect(result.blockedPaths).toEqual([])
    })
    
    it('blocks too many files', () => {
      const files = ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js']
      const result = checkFilesAllowed(mockPolicy, files)
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Too many files')
    })
    
    it('blocks protected paths', () => {
      const files = ['src/Button.jsx', 'package.json']
      const result = checkFilesAllowed(mockPolicy, files)
      
      expect(result.allowed).toBe(false)
      expect(result.blockedPaths).toContain('package.json')
    })
    
    it('fails closed on invalid input', () => {
      expect(checkFilesAllowed(mockPolicy, null).allowed).toBe(false)
      expect(checkFilesAllowed(mockPolicy, []).allowed).toBe(false)
    })
  })
  
  describe('getPolicyLimits', () => {
    it('returns all policy limits', () => {
      const limits = getPolicyLimits(mockPolicy)
      
      expect(limits).toEqual({
        maxAttempts: 3,
        maxChangedFiles: 5,
        maxConcurrentPRs: 2,
        maxConcurrentDelegations: undefined,
        autoMerge: false
      })
    })
  })
  
  describe('fail-closed behavior', () => {
    it('denies ambiguous paths by default', () => {
      expect(isProtectedPath(mockPolicy, '')).toBe(true)
      expect(requiresHumanGate(mockPolicy, null)).toBe(true)
    })
    
    it('denies ambiguous actions by default', () => {
      expect(isActionAllowed(mockPolicy, 'L1', '')).toBe(false)
      expect(isActionDenied(mockPolicy, null)).toBe(true)
    })
    
    it('escalates ambiguous items by default', () => {
      expect(requiresEscalation(mockPolicy, null)).toBe(true)
      expect(requiresEscalation(mockPolicy, {})).toBe(false) // Empty item is valid, just no escalation needed
    })
  })
})
