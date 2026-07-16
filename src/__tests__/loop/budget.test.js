import { describe, it, expect } from 'vitest'
import {
  checkAttempts,
  checkConcurrentPRs,
  checkConcurrentDelegations,
  checkCooldown,
  checkPaused,
  checkActiveDelegation,
  checkAllBudgets,
  getDailyDelegationCount,
  setCooldown,
  clearCooldown
} from '../../../scripts/loop/core/budget.mjs'

describe('budget', () => {
  describe('checkAttempts', () => {
    it('allows item with attempts under limit', () => {
      const state = {
        sourceItems: {
          'issue-123': { attempts: 1 }
        }
      }
      
      const result = checkAttempts(state, 'issue-123', 3)
      
      expect(result.allowed).toBe(true)
      expect(result.attempts).toBe(1)
    })
    
    it('blocks item at max attempts', () => {
      const state = {
        sourceItems: {
          'issue-123': { attempts: 3 }
        }
      }
      
      const result = checkAttempts(state, 'issue-123', 3)
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max attempts reached')
    })
    
    it('allows new item with no attempts', () => {
      const state = { sourceItems: {} }
      
      const result = checkAttempts(state, 'issue-999', 3)
      
      expect(result.allowed).toBe(true)
      expect(result.attempts).toBe(0)
    })
  })
  
  describe('checkConcurrentPRs', () => {
    it('allows PRs under limit', () => {
      const state = { openPRs: [124] }
      
      const result = checkConcurrentPRs(state, 2)
      
      expect(result.allowed).toBe(true)
      expect(result.count).toBe(1)
    })
    
    it('blocks PRs at limit', () => {
      const state = { openPRs: [124, 125] }
      
      const result = checkConcurrentPRs(state, 2)
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max concurrent PRs')
    })
    
    it('handles empty openPRs', () => {
      const state = { openPRs: [] }
      
      const result = checkConcurrentPRs(state, 2)
      
      expect(result.allowed).toBe(true)
    })
  })
  
  describe('checkConcurrentDelegations', () => {
    it('allows delegations under limit', () => {
      const state = {
        delegations: {
          'deleg-1': { status: 'running' }
        }
      }
      
      const result = checkConcurrentDelegations(state, 2)
      
      expect(result.allowed).toBe(true)
      expect(result.count).toBe(1)
    })
    
    it('blocks delegations at limit', () => {
      const state = {
        delegations: {
          'deleg-1': { status: 'running' },
          'deleg-2': { status: 'pending' }
        }
      }
      
      const result = checkConcurrentDelegations(state, 2)
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max concurrent delegations')
    })
    
    it('does not count completed delegations', () => {
      const state = {
        delegations: {
          'deleg-1': { status: 'completed' },
          'deleg-2': { status: 'running' }
        }
      }
      
      const result = checkConcurrentDelegations(state, 2)
      
      expect(result.allowed).toBe(true)
      expect(result.count).toBe(1)
    })
  })
  
  describe('checkCooldown', () => {
    it('allows item not in cooldown', () => {
      const state = { cooldowns: {} }
      
      const result = checkCooldown(state, 'issue-123')
      
      expect(result.allowed).toBe(true)
    })
    
    it('blocks item in cooldown', () => {
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const state = { cooldowns: { 'issue-123': future } }
      
      const result = checkCooldown(state, 'issue-123')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('in cooldown')
    })
    
    it('allows item past cooldown', () => {
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const state = { cooldowns: { 'issue-123': past } }
      
      const result = checkCooldown(state, 'issue-123')
      
      expect(result.allowed).toBe(true)
    })
  })
  
  describe('checkPaused', () => {
    it('allows when status is active', () => {
      const state = { status: 'active' }
      
      const result = checkPaused(state)
      
      expect(result.allowed).toBe(true)
    })
    
    it('blocks when status is paused', () => {
      const state = { status: 'paused' }
      
      const result = checkPaused(state)
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Loop is paused')
    })
  })
  
  describe('checkActiveDelegation', () => {
    it('allows item without active delegation', () => {
      const state = {
        sourceItems: { 'issue-123': { activeDelegation: null } },
        delegations: {}
      }
      
      const result = checkActiveDelegation(state, 'issue-123')
      
      expect(result.allowed).toBe(true)
    })
    
    it('blocks item with running delegation', () => {
      const state = {
        sourceItems: { 'issue-123': { activeDelegation: 'deleg-1' } },
        delegations: { 'deleg-1': { status: 'running' } }
      }
      
      const result = checkActiveDelegation(state, 'issue-123')
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Active delegation exists')
    })
    
    it('allows item with completed delegation', () => {
      const state = {
        sourceItems: { 'issue-123': { activeDelegation: 'deleg-1' } },
        delegations: { 'deleg-1': { status: 'completed' } }
      }
      
      const result = checkActiveDelegation(state, 'issue-123')
      
      expect(result.allowed).toBe(true)
    })
  })
  
  describe('checkAllBudgets', () => {
    const policy = {
      maxAttempts: 3,
      maxConcurrentPRs: 2,
      maxConcurrentDelegations: 1
    }
    
    it('allows item passing all checks', () => {
      const state = {
        status: 'active',
        sourceItems: { 'issue-123': { attempts: 0 } },
        delegations: {},
        openPRs: [],
        cooldowns: {}
      }
      
      const result = checkAllBudgets(state, policy, 'issue-123')
      
      expect(result.allowed).toBe(true)
      expect(result.reasons).toHaveLength(0)
    })
    
    it('blocks item failing any check', () => {
      const state = {
        status: 'paused',
        sourceItems: { 'issue-123': { attempts: 3 } },
        delegations: {},
        openPRs: [],
        cooldowns: {}
      }
      
      const result = checkAllBudgets(state, policy, 'issue-123')
      
      expect(result.allowed).toBe(false)
      expect(result.reasons.length).toBeGreaterThan(0)
      expect(result.reasons.some(r => r.includes('paused'))).toBe(true)
    })
    
    it('provides detailed check results', () => {
      const state = {
        status: 'active',
        sourceItems: { 'issue-123': { attempts: 0 } },
        delegations: {},
        openPRs: [],
        cooldowns: {}
      }
      
      const result = checkAllBudgets(state, policy, 'issue-123')
      
      expect(result.checks.paused).toBeDefined()
      expect(result.checks.attempts).toBeDefined()
      expect(result.checks.cooldown).toBeDefined()
    })
  })
  
  describe('getDailyDelegationCount', () => {
    it('counts delegations created today', () => {
      const now = new Date()
      const today = now.toISOString()
      const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      
      const state = {
        delegations: {
          'deleg-1': { createdAt: today },
          'deleg-2': { createdAt: today },
          'deleg-3': { createdAt: yesterday }
        }
      }
      
      const count = getDailyDelegationCount(state)
      
      expect(count).toBe(2)
    })
    
    it('returns 0 for no delegations', () => {
      const state = { delegations: {} }
      
      expect(getDailyDelegationCount(state)).toBe(0)
    })
  })
  
  describe('setCooldown', () => {
    it('sets cooldown for item', () => {
      const state = { cooldowns: {} }
      
      const cooldowns = setCooldown(state, 'issue-123', 2)
      
      expect(cooldowns['issue-123']).toBeDefined()
      const cooldownDate = new Date(cooldowns['issue-123'])
      const now = new Date()
      const diff = (cooldownDate - now) / (60 * 60 * 1000)
      expect(diff).toBeCloseTo(2, 0)
    })
  })
  
  describe('clearCooldown', () => {
    it('clears cooldown for item', () => {
      const state = {
        cooldowns: { 'issue-123': '2026-07-16T10:00:00Z' }
      }
      
      const cooldowns = clearCooldown(state, 'issue-123')
      
      expect(cooldowns['issue-123']).toBeUndefined()
    })
  })
  
  describe('pause label short-circuiting', () => {
    it('checkPaused blocks all further checks when paused', () => {
      const state = { status: 'paused' }
      const policy = { maxAttempts: 3 }
      
      const result = checkAllBudgets(state, policy, 'issue-123')
      
      expect(result.allowed).toBe(false)
      expect(result.reasons.some(r => r.includes('paused'))).toBe(true)
    })
  })
})
