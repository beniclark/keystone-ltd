/**
 * Unit tests for graduation.mjs
 * Phase 6: L2 graduation with double-gate safety
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  getEffectiveMode,
  isSafeCategory,
  hasProtectedPaths,
  checkBudget,
  isEligibleForL2
} from '../../../scripts/loop/core/graduation.mjs'
import { loadConfig, resetConfigCache } from '../../../scripts/loop/core/config.mjs'
import { loadPolicy, resetPolicyCache } from '../../../scripts/loop/core/policy.mjs'

const fixturesDir = resolve(process.cwd(), '.loop/fixtures')

describe('graduation.mjs', () => {
  let config, policy, configL2PerLoop
  
  beforeEach(async () => {
    resetConfigCache()
    resetPolicyCache()
    config = await loadConfig()
    policy = await loadPolicy()
    
    // Load fixture config with per-loop overrides
    const l2ConfigData = await readFile(resolve(fixturesDir, 'config-l2-per-loop.json'), 'utf-8')
    configL2PerLoop = JSON.parse(l2ConfigData)
  })
  
  afterEach(() => {
    resetConfigCache()
    resetPolicyCache()
  })

  describe('getEffectiveMode', () => {
    it('should return L1 for missing config (fail closed)', () => {
      expect(getEffectiveMode(null, 'ciSweeper')).toBe('L1')
      expect(getEffectiveMode(undefined, 'ciSweeper')).toBe('L1')
    })

    it('should return L1 for missing loop name (fail closed)', () => {
      expect(getEffectiveMode(config, null)).toBe('L1')
      expect(getEffectiveMode(config, undefined)).toBe('L1')
      expect(getEffectiveMode(config, '')).toBe('L1')
    })

    it('should return global mode when no per-loop override exists', () => {
      const globalL1Config = { mode: 'L1', loops: {} }
      expect(getEffectiveMode(globalL1Config, 'ciSweeper')).toBe('L1')
      
      const globalL2Config = { mode: 'L2', loops: {} }
      expect(getEffectiveMode(globalL2Config, 'ciSweeper')).toBe('L2')
    })

    it('should return per-loop override when present', () => {
      // configL2PerLoop has global L2, but issueIntake=L1, ciSweeper=L2, prBabysitter=L1
      expect(getEffectiveMode(configL2PerLoop, 'issueIntake')).toBe('L1')
      expect(getEffectiveMode(configL2PerLoop, 'ciSweeper')).toBe('L2')
      expect(getEffectiveMode(configL2PerLoop, 'prBabysitter')).toBe('L1')
    })

    it('should prioritize per-loop override over global mode', () => {
      const mixedConfig = {
        mode: 'L2',
        loops: {
          issueIntake: { mode: 'L1' }
        }
      }
      expect(getEffectiveMode(mixedConfig, 'issueIntake')).toBe('L1')
      expect(getEffectiveMode(mixedConfig, 'ciSweeper')).toBe('L2')
    })

    it('should default to L1 when config has no mode field', () => {
      const noModeConfig = { loops: {} }
      expect(getEffectiveMode(noModeConfig, 'ciSweeper')).toBe('L1')
    })
  })

  describe('isSafeCategory', () => {
    it('should return false for missing category (fail closed)', () => {
      expect(isSafeCategory(null)).toBe(false)
      expect(isSafeCategory(undefined)).toBe(false)
      expect(isSafeCategory('')).toBe(false)
    })

    it('should return true for safe categories', () => {
      expect(isSafeCategory('lint-fix')).toBe(true)
      expect(isSafeCategory('type-fix')).toBe(true)
      expect(isSafeCategory('mechanical-ci-fix')).toBe(true)
      expect(isSafeCategory('deterministic-test-fix')).toBe(true)
    })

    it('should return false for human-required categories', () => {
      expect(isSafeCategory('security')).toBe(false)
      expect(isSafeCategory('auth')).toBe(false)
      expect(isSafeCategory('dependency')).toBe(false)
      expect(isSafeCategory('infrastructure')).toBe(false)
      expect(isSafeCategory('P0')).toBe(false)
      expect(isSafeCategory('P1')).toBe(false)
      expect(isSafeCategory('breaking-change')).toBe(false)
      expect(isSafeCategory('architecture')).toBe(false)
      expect(isSafeCategory('ambiguous')).toBe(false)
    })

    it('should return false for unknown categories (fail closed)', () => {
      expect(isSafeCategory('unknown-category')).toBe(false)
      expect(isSafeCategory('feature-request')).toBe(false)
    })
  })

  describe('hasProtectedPaths', () => {
    it('should return true for missing policy (fail closed)', () => {
      expect(hasProtectedPaths(null, ['src/app.js'])).toBe(true)
      expect(hasProtectedPaths(undefined, ['src/app.js'])).toBe(true)
    })

    it('should return true for missing/invalid filePaths (fail closed)', () => {
      expect(hasProtectedPaths(policy, null)).toBe(true)
      expect(hasProtectedPaths(policy, undefined)).toBe(true)
      expect(hasProtectedPaths(policy, 'not-an-array')).toBe(true)
    })

    it('should return false when no paths are protected', () => {
      expect(hasProtectedPaths(policy, [])).toBe(false)
      expect(hasProtectedPaths(policy, ['src/components/Button.jsx'])).toBe(false)
      expect(hasProtectedPaths(policy, ['src/lib/utils.js'])).toBe(false)
    })

    it('should return true when any path is protected', () => {
      expect(hasProtectedPaths(policy, ['src/lib/auth.js'])).toBe(true)
      expect(hasProtectedPaths(policy, ['.github/workflows/ci.yml'])).toBe(true)
      expect(hasProtectedPaths(policy, ['.loop/config.json'])).toBe(true)
      expect(hasProtectedPaths(policy, ['package.json'])).toBe(true)
      
      // Mixed: one protected, one not
      expect(hasProtectedPaths(policy, [
        'src/components/Button.jsx',
        'src/lib/auth.js'
      ])).toBe(true)
    })

    it('should match protected path patterns', () => {
      // Pattern: **/auth* (matches src/lib/auth.js)
      expect(hasProtectedPaths(policy, ['src/lib/auth.js'])).toBe(true)
      
      // Pattern: .github/workflows/**
      expect(hasProtectedPaths(policy, ['.github/workflows/ci.yml'])).toBe(true)
      expect(hasProtectedPaths(policy, ['.github/workflows/deploy/staging.yml'])).toBe(true)
    })
  })

  describe('checkBudget', () => {
    it('should return not allowed for missing inputs (fail closed)', () => {
      const result1 = checkBudget(null, {}, { changedFiles: [] })
      expect(result1.allowed).toBe(false)
      expect(result1.reason).toContain('Missing budget data')
      
      const result2 = checkBudget(policy, null, { changedFiles: [] })
      expect(result2.allowed).toBe(false)
      
      const result3 = checkBudget(policy, {}, null)
      expect(result3.allowed).toBe(false)
    })

    it('should allow when all budget limits are satisfied', () => {
      const currentState = {
        attempts: 0,
        openLoopPRs: 0,
        activeDelegations: 0
      }
      const proposal = {
        changedFiles: ['src/app.js', 'src/utils.js']
      }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('Budget limits satisfied')
    })

    it('should deny when max attempts exceeded', () => {
      const currentState = {
        attempts: 3, // policy.maxAttempts = 3
        openLoopPRs: 0,
        activeDelegations: 0
      }
      const proposal = { changedFiles: [] }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max attempts exceeded')
    })

    it('should deny when too many changed files', () => {
      const currentState = {
        attempts: 0,
        openLoopPRs: 0,
        activeDelegations: 0
      }
      const proposal = {
        changedFiles: ['a', 'b', 'c', 'd', 'e', 'f'] // 6 files, policy.maxChangedFiles = 5
      }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Too many changed files')
    })

    it('should deny when max concurrent PRs reached', () => {
      const currentState = {
        attempts: 0,
        openLoopPRs: 2, // policy.maxConcurrentPRs = 2
        activeDelegations: 0
      }
      const proposal = { changedFiles: [] }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max concurrent PRs')
    })

    it('should deny when max concurrent delegations reached', () => {
      const currentState = {
        attempts: 0,
        openLoopPRs: 0,
        activeDelegations: 1 // policy.maxConcurrentDelegations = 1
      }
      const proposal = { changedFiles: [] }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Max concurrent delegations')
    })

    it('should handle missing budget fields gracefully', () => {
      const currentState = {} // All fields missing
      const proposal = { changedFiles: [] }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(true) // 0 < maxAttempts, etc.
    })

    it('should allow when at limit minus one', () => {
      const currentState = {
        attempts: 2, // < 3
        openLoopPRs: 1, // < 2
        activeDelegations: 0 // < 1
      }
      const proposal = {
        changedFiles: ['a', 'b', 'c', 'd', 'e'] // exactly 5
      }
      
      const result = checkBudget(policy, currentState, proposal)
      expect(result.allowed).toBe(true)
    })
  })

  describe('isEligibleForL2 - fixture-based integration', () => {
    async function loadFixture(name) {
      const data = await readFile(resolve(fixturesDir, name), 'utf-8')
      return JSON.parse(data)
    }

    it('should match graduation-safe-lint-fix fixture', async () => {
      const fixture = await loadFixture('graduation-safe-lint-fix.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })

    it('should match graduation-p0-human-required fixture', async () => {
      const fixture = await loadFixture('graduation-p0-human-required.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })

    it('should match graduation-l1-mode fixture', async () => {
      const fixture = await loadFixture('graduation-l1-mode.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })

    it('should match graduation-budget-exhausted fixture', async () => {
      const fixture = await loadFixture('graduation-budget-exhausted.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })

    it('should match graduation-protected-path fixture', async () => {
      const fixture = await loadFixture('graduation-protected-path.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })

    it('should match graduation-max-concurrent-prs fixture', async () => {
      const fixture = await loadFixture('graduation-max-concurrent-prs.json')
      
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: fixture.loopName,
        proposal: fixture.proposal,
        currentState: fixture.currentState
      })
      
      expect(result.eligible).toBe(fixture.expectedEligible)
      expect(result.reason).toContain(fixture.expectedReason)
    })
  })

  describe('isEligibleForL2 - fail-closed edge cases', () => {
    it('should deny when missing required inputs', () => {
      const result = isEligibleForL2({})
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Missing required inputs')
      expect(result.effectiveMode).toBe('L1')
    })

    it('should deny when proposal outcome is not actionable', () => {
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper',
        proposal: {
          outcome: 'no-op',
          category: 'lint-fix',
          doneWhen: ['test'],
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Proposal outcome is "no-op"')
    })

    it('should deny when proposal missing category', () => {
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper',
        proposal: {
          outcome: 'actionable',
          doneWhen: ['test'],
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Proposal missing category')
    })

    it('should deny when proposal missing doneWhen', () => {
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper',
        proposal: {
          outcome: 'actionable',
          category: 'lint-fix',
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Proposal missing doneWhen')
    })

    it('should deny when doneWhen is empty array', () => {
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper',
        proposal: {
          outcome: 'actionable',
          category: 'lint-fix',
          doneWhen: [],
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result.eligible).toBe(false)
      expect(result.reason).toContain('Proposal missing doneWhen')
    })

    it('should include effectiveMode in all responses', () => {
      const result1 = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper',
        proposal: {
          outcome: 'actionable',
          category: 'lint-fix',
          doneWhen: ['test'],
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result1.effectiveMode).toBe('L2')
      
      const result2 = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'issueIntake',
        proposal: {
          outcome: 'actionable',
          category: 'lint-fix',
          doneWhen: ['test'],
          changedFiles: []
        },
        currentState: {}
      })
      
      expect(result2.effectiveMode).toBe('L1')
    })
  })

  describe('isEligibleForL2 - comprehensive pass scenario', () => {
    it('should allow when all criteria are met', () => {
      const result = isEligibleForL2({
        config: configL2PerLoop,
        policy,
        loopName: 'ciSweeper', // L2 mode in fixture
        proposal: {
          outcome: 'actionable',
          category: 'type-fix',
          objective: 'Fix type errors',
          doneWhen: ['npm run typecheck passes'],
          changedFiles: ['src/components/Button.jsx']
        },
        currentState: {
          attempts: 0,
          openLoopPRs: 0,
          activeDelegations: 0
        }
      })
      
      expect(result.eligible).toBe(true)
      expect(result.reason).toContain('All eligibility criteria satisfied')
      expect(result.effectiveMode).toBe('L2')
    })
  })
})
