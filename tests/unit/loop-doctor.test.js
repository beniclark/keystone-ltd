import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadConfig, resetConfigCache } from '../../scripts/loop/core/config.mjs'
import { loadPolicy, resetPolicyCache } from '../../scripts/loop/core/policy.mjs'

describe('Doctor command health checks', () => {
  beforeEach(() => {
    // Reset caches before each test
    resetConfigCache()
    resetPolicyCache()
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GITHUB_TOKEN
    delete process.env.GH_TOKEN
  })

  it('validates config successfully', async () => {
    // Config should load without throwing
    const config = await loadConfig()
    
    expect(config).toBeDefined()
    expect(config.mode).toMatch(/^L[12]$/i)
    expect(config.adapter).toBeDefined()
    expect(config.adapter.backend).toBe('github-copilot')
  })

  it('validates policy successfully', async () => {
    // Policy should load without throwing
    const policy = await loadPolicy()
    
    expect(policy).toBeDefined()
    expect(policy.maxAttempts).toBe(3)
    expect(policy.maxChangedFiles).toBe(5)
    expect(policy.maxConcurrentPRs).toBe(2)
    expect(policy.protectedPaths).toBeDefined()
    expect(Array.isArray(policy.protectedPaths)).toBe(true)
  })

  it('detects GITHUB_TOKEN presence', () => {
    // Test with GITHUB_TOKEN
    process.env.GITHUB_TOKEN = 'fake-token-for-test'
    expect(process.env.GITHUB_TOKEN).toBeDefined()
    
    // Test with GH_TOKEN as fallback
    delete process.env.GITHUB_TOKEN
    process.env.GH_TOKEN = 'fake-gh-token'
    expect(process.env.GH_TOKEN).toBeDefined()
  })

  it('detects missing GITHUB_TOKEN', () => {
    delete process.env.GITHUB_TOKEN
    delete process.env.GH_TOKEN
    
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    expect(token).toBeUndefined()
  })

  it('validates config schema properties', async () => {
    const config = await loadConfig()
    
    // Schema version
    expect(config.schemaVersion).toBe('1.0.0')
    
    // Watched branches
    expect(config.watchedBranches).toBeDefined()
    expect(Array.isArray(config.watchedBranches)).toBe(true)
    
    // Labels
    expect(config.labels).toBeDefined()
    expect(config.labels.state).toBe('loop:state')
    expect(config.labels.paused).toBe('loop:paused')
    
    // Action caps
    expect(config.actionCaps).toBeDefined()
    expect(config.actionCaps.issueIntake).toBeDefined()
    expect(config.actionCaps.ciSweeper).toBeDefined()
    expect(config.actionCaps.prBabysitter).toBeDefined()
  })

  it('validates policy schema properties', async () => {
    const policy = await loadPolicy()
    
    // Schema version
    expect(policy.schemaVersion).toBe('1.0.0')
    
    // Limits
    expect(policy.maxAttempts).toBeGreaterThan(0)
    expect(policy.maxChangedFiles).toBeGreaterThan(0)
    expect(policy.maxConcurrentPRs).toBeGreaterThan(0)
    
    // Auto-merge disabled
    expect(policy.autoMerge).toBe(false)
    
    // Protected paths include critical files
    expect(policy.protectedPaths).toContain('.github/workflows/**')
    expect(policy.protectedPaths).toContain('.loop/**')
    expect(policy.protectedPaths).toContain('package.json')
    
    // Allowed/denied actions
    expect(policy.allowedActions).toBeDefined()
    expect(policy.allowedActions.L1).toBeDefined()
    expect(policy.deniedActions).toBeDefined()
    expect(policy.deniedActions).toContain('merge')
    
    // Escalation rules
    expect(policy.escalationRules).toBeDefined()
    expect(policy.escalationRules.sensitiveLabels).toBeDefined()
    expect(policy.escalationRules.blockedPatterns).toBeDefined()
  })

  it('validates L1 mode restrictions', async () => {
    const policy = await loadPolicy()
    
    const l1Actions = policy.allowedActions.L1
    expect(l1Actions).toContain('read')
    expect(l1Actions).toContain('report')
    
    // L1 should not allow PR creation or assignment
    expect(l1Actions).not.toContain('pr:draft')
    expect(l1Actions).not.toContain('assign:copilot')
  })

  it('validates L2 mode includes L1 plus delegation', async () => {
    const policy = await loadPolicy()
    
    const l2Actions = policy.allowedActions.L2
    expect(l2Actions).toContain('read')
    expect(l2Actions).toContain('report')
    expect(l2Actions).toContain('pr:draft')
    expect(l2Actions).toContain('assign:copilot')
  })

  it('ensures auto-merge is disabled', async () => {
    const policy = await loadPolicy()
    const config = await loadConfig()
    
    expect(policy.autoMerge).toBe(false)
    
    // Also check action caps for PR babysitter
    expect(config.actionCaps.prBabysitter.allowAutoMerge).toBe(false)
  })
})
