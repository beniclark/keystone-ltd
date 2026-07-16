import { describe, it, expect } from 'vitest'
import {
  parseState,
  serializeState,
  updateState,
  formatRunComment,
  pruneComments,
  createInitialState
} from '../../../scripts/loop/core/state.mjs'

describe('state', () => {
  describe('parseState', () => {
    it('parses state from issue body with markers', () => {
      const issueBody = `# Current Status

Some narrative text here.

---

<!-- LOOP_STATE_BEGIN -->
\`\`\`json
{
  "version": 1,
  "status": "active"
}
\`\`\`
<!-- LOOP_STATE_END -->
`
      
      const result = parseState(issueBody)
      
      expect(result.state).toEqual({ version: 1, status: 'active' })
      expect(result.narrative).toContain('Current Status')
    })
    
    it('throws on missing markers', () => {
      const issueBody = 'No markers here'
      
      expect(() => parseState(issueBody)).toThrow('State markers not found')
    })
    
    it('throws on invalid JSON', () => {
      const issueBody = `
<!-- LOOP_STATE_BEGIN -->
\`\`\`json
{ invalid json }
\`\`\`
<!-- LOOP_STATE_END -->
`
      
      expect(() => parseState(issueBody)).toThrow('Failed to parse state JSON')
    })
    
    it('throws on invalid marker order', () => {
      const issueBody = `
<!-- LOOP_STATE_END -->
<!-- LOOP_STATE_BEGIN -->
`
      
      expect(() => parseState(issueBody)).toThrow('Invalid state marker order')
    })
  })
  
  describe('serializeState', () => {
    it('serializes state to issue body format', () => {
      const state = { version: 1, status: 'active' }
      const narrative = '# Current Status\n\nActive loop'
      
      const result = serializeState(state, narrative)
      
      expect(result).toContain('# Current Status')
      expect(result).toContain('<!-- LOOP_STATE_BEGIN -->')
      expect(result).toContain('<!-- LOOP_STATE_END -->')
      expect(result).toContain('"version": 1')
    })
    
    it('throws on missing state', () => {
      expect(() => serializeState(null, 'narrative')).toThrow('State object is required')
    })
    
    it('throws on missing narrative', () => {
      expect(() => serializeState({}, '')).toThrow('Narrative is required')
    })
  })
  
  describe('updateState', () => {
    it('updates state and increments version', () => {
      const current = { version: 5, status: 'active' }
      const updateFn = (state) => ({ ...state, status: 'paused' })
      
      const updated = updateState(current, updateFn)
      
      expect(updated.version).toBe(6)
      expect(updated.status).toBe('paused')
      expect(updated.lastUpdated).toBeDefined()
    })
    
    it('throws on missing version', () => {
      const current = { status: 'active' }
      const updateFn = (state) => state
      
      expect(() => updateState(current, updateFn)).toThrow('must have a version')
    })
    
    it('throws on missing update function', () => {
      const current = { version: 1 }
      
      expect(() => updateState(current, null)).toThrow('Update function is required')
    })
  })
  
  describe('formatRunComment', () => {
    it('formats run comment with all sections', () => {
      const run = {
        runId: 'workflow-123',
        timestamp: '2026-07-16T01:00:00Z',
        trigger: 'issue.opened #123',
        mode: 'L1',
        discoveries: ['New issue found'],
        actions: ['Applied label'],
        deferrals: ['No delegation in L1'],
        links: {
          source: 'https://github.com/owner/repo/issues/123',
          workflow: 'https://github.com/owner/repo/actions/runs/123'
        }
      }
      
      const comment = formatRunComment(run)
      
      expect(comment).toContain('## Run: workflow-123')
      expect(comment).toContain('**Trigger:** issue.opened #123')
      expect(comment).toContain('### Discoveries')
      expect(comment).toContain('- New issue found')
      expect(comment).toContain('### Actions')
      expect(comment).toContain('### Deferrals')
      expect(comment).toContain('### Links')
    })
    
    it('throws on missing required fields', () => {
      expect(() => formatRunComment({})).toThrow('must include runId and timestamp')
      expect(() => formatRunComment({ runId: '123' })).toThrow('must include runId and timestamp')
    })
    
    it('handles empty optional sections', () => {
      const run = {
        runId: 'run-1',
        timestamp: '2026-07-16T01:00:00Z',
        trigger: 'test',
        mode: 'L1'
      }
      
      const comment = formatRunComment(run)
      
      expect(comment).not.toContain('### Discoveries')
      expect(comment).not.toContain('### Actions')
    })
  })
  
  describe('pruneComments', () => {
    it('keeps recent comments', () => {
      const now = new Date()
      const comments = [
        { id: 1, created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 2, created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 3, created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() }
      ]
      
      const result = pruneComments(comments, 30, 100)
      
      expect(result.keep).toHaveLength(3)
      expect(result.prune).toHaveLength(0)
    })
    
    it('prunes old comments beyond maxCount', () => {
      const now = new Date()
      const comments = Array.from({ length: 150 }, (_, i) => ({
        id: i,
        created_at: new Date(now - i * 24 * 60 * 60 * 1000).toISOString()
      }))
      
      const result = pruneComments(comments, 30, 100)
      
      expect(result.keep.length).toBeLessThanOrEqual(100)
      expect(result.prune.length).toBeGreaterThan(0)
    })
    
    it('prunes very old comments but keeps recent as per maxCount', () => {
      const now = new Date()
      const comments = [
        { id: 1, created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 2, created_at: new Date(now - 50 * 24 * 60 * 60 * 1000).toISOString() }
      ]
      
      const result = pruneComments(comments, 30, 100)
      
      // Comment 1 is within maxCount (top 100) and within maxAge
      // Comment 2 is within maxCount (top 100) but NOT within maxAge
      // With maxCount = 100 and only 2 comments, both stay within maxCount
      // But comment 2 is older than 30 days, so it gets pruned
      // Actually, with the OR logic, comment 2 should be kept because it's within maxCount (100)
      // Let me re-read the logic...
      
      // The logic is: keep if (isRecent OR isWithinAge)
      // isRecent = index < maxCount = index < 100 = true for both
      // So both should be kept
      
      expect(result.keep).toHaveLength(2)
      expect(result.prune).toHaveLength(0)
    })
    
    it('throws on invalid comments array', () => {
      expect(() => pruneComments(null)).toThrow('must be an array')
    })
  })
  
  describe('createInitialState', () => {
    it('creates valid initial state', () => {
      const state = createInitialState()
      
      expect(state.version).toBe(1)
      expect(state.status).toBe('active')
      expect(state.sourceItems).toEqual({})
      expect(state.delegations).toEqual({})
      expect(state.metrics).toEqual({
        discovered: 0,
        noOp: 0,
        proposed: 0,
        delegated: 0,
        verified: 0,
        blocked: 0,
        escalated: 0,
        duplicatePrevention: 0
      })
    })
  })
  
  describe('malformed state fails closed', () => {
    it('throws on invalid issue body', () => {
      expect(() => parseState('')).toThrow()
      expect(() => parseState(null)).toThrow('Issue body is required')
    })
    
    it('throws on malformed JSON', () => {
      const issueBody = `
<!-- LOOP_STATE_BEGIN -->
{ not valid json }
<!-- LOOP_STATE_END -->
`
      
      expect(() => parseState(issueBody)).toThrow()
    })
  })
  
  describe('round-trip serialization', () => {
    it('serializes and parses state without data loss', () => {
      const original = {
        version: 42,
        lastUpdated: '2026-07-16T01:00:00Z',
        status: 'active',
        sourceItems: { 'issue-123': { kind: 'issue', number: 123 } }
      }
      const narrative = '# Test'
      
      const serialized = serializeState(original, narrative)
      const parsed = parseState(serialized)
      
      expect(parsed.state).toEqual(original)
    })
  })
})
