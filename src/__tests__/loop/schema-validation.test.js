import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import { loadConfig, resetConfigCache } from '../../../scripts/loop/core/config.mjs'
import { validateState } from '../../../scripts/loop/core/state.mjs'

describe('schema validation', () => {
  describe('config validation', () => {
    it('validates config.json against schema', async () => {
      resetConfigCache()
      const config = await loadConfig()
      
      expect(config.schemaVersion).toBe('1.0.0')
      expect(config.mode).toMatch(/^L[12]$/)
      expect(config.watchedBranches).toBeInstanceOf(Array)
    })
  })
  
  describe('state fixture validation', () => {
    it('validates state-valid.json fixture against schema', async () => {
      const fixturePath = resolve(process.cwd(), '.loop/fixtures/state-valid.json')
      const fixtureData = await readFile(fixturePath, 'utf-8')
      const fixture = JSON.parse(fixtureData)
      
      const result = await validateState(fixture)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
  
  describe('policy schema validation', () => {
    it('validates policy.json structure', async () => {
      const policyPath = resolve(process.cwd(), '.loop/policy.json')
      const policyData = await readFile(policyPath, 'utf-8')
      const policy = JSON.parse(policyData)
      
      expect(policy.schemaVersion).toBe('1.0.0')
      expect(policy.maxAttempts).toBeGreaterThan(0)
      expect(policy.maxChangedFiles).toBeGreaterThan(0)
      expect(policy.protectedPaths).toBeInstanceOf(Array)
      expect(policy.allowedActions).toHaveProperty('L1')
      expect(policy.allowedActions).toHaveProperty('L2')
    })
  })
  
  describe('GitHub event fixtures', () => {
    it('validates issue-opened.json structure', async () => {
      const fixturePath = resolve(process.cwd(), '.loop/fixtures/issue-opened.json')
      const fixtureData = await readFile(fixturePath, 'utf-8')
      const fixture = JSON.parse(fixtureData)
      
      expect(fixture.action).toBe('opened')
      expect(fixture.issue).toBeDefined()
      expect(fixture.issue.number).toBeGreaterThan(0)
      expect(fixture.repository).toBeDefined()
    })
    
    it('validates workflow-run-failure.json structure', async () => {
      const fixturePath = resolve(process.cwd(), '.loop/fixtures/workflow-run-failure.json')
      const fixtureData = await readFile(fixturePath, 'utf-8')
      const fixture = JSON.parse(fixtureData)
      
      expect(fixture.workflow_run).toBeDefined()
      expect(fixture.workflow_run.conclusion).toBe('failure')
      expect(fixture.workflow_run.status).toBe('completed')
    })
    
    it('validates pr-review-approved.json structure', async () => {
      const fixturePath = resolve(process.cwd(), '.loop/fixtures/pr-review-approved.json')
      const fixtureData = await readFile(fixturePath, 'utf-8')
      const fixture = JSON.parse(fixtureData)
      
      expect(fixture.action).toBe('submitted')
      expect(fixture.review).toBeDefined()
      expect(fixture.review.state).toBe('approved')
      expect(fixture.pull_request).toBeDefined()
    })
  })
  
  describe('malformed state fails validation', () => {
    it('rejects state missing required fields', async () => {
      const invalidState = {
        version: 1
        // Missing required fields
      }
      
      const result = await validateState(invalidState)
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
    
    it('rejects state with invalid version', async () => {
      const invalidState = {
        version: 'not-a-number',
        lastUpdated: '2026-07-16T01:00:00Z',
        status: 'active',
        sourceItems: {},
        delegations: {},
        metrics: {
          discovered: 0,
          noOp: 0,
          proposed: 0,
          delegated: 0,
          verified: 0,
          blocked: 0,
          escalated: 0,
          duplicatePrevention: 0
        }
      }
      
      const result = await validateState(invalidState)
      
      expect(result.valid).toBe(false)
    })
  })
})
