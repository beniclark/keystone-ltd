import { describe, it, expect } from 'vitest'
import {
  eventDeliveryKey,
  workflowRunKey,
  sourceItemKey,
  failureFingerprint,
  delegationKey,
  parseSourceItemKey
} from '../../../scripts/loop/core/idempotency.mjs'

describe('idempotency', () => {
  describe('eventDeliveryKey', () => {
    it('generates stable key from event and delivery ID', () => {
      const event = { action: 'opened', issue: { number: 123 } }
      const deliveryId = 'abc-123-def'
      
      const key = eventDeliveryKey(event, deliveryId)
      
      expect(key).toBe('event-abc-123-def')
    })
    
    it('throws on missing deliveryId', () => {
      expect(() => eventDeliveryKey({}, null)).toThrow('deliveryId are required')
    })
  })
  
  describe('workflowRunKey', () => {
    it('generates stable key from run ID', () => {
      expect(workflowRunKey(1234567890)).toBe('workflow-run-1234567890')
    })
    
    it('throws on invalid run ID', () => {
      expect(() => workflowRunKey('abc')).toThrow('Valid runId is required')
      expect(() => workflowRunKey(null)).toThrow('Valid runId is required')
    })
  })
  
  describe('sourceItemKey', () => {
    it('generates stable key for issue', () => {
      expect(sourceItemKey('issue', 123)).toBe('issue-123')
    })
    
    it('generates stable key for PR', () => {
      expect(sourceItemKey('pull_request', 456)).toBe('pr-456')
    })
    
    it('generates stable key for workflow run', () => {
      expect(sourceItemKey('workflow_run', 789)).toBe('workflow-run-789')
    })
    
    it('throws on invalid kind', () => {
      expect(() => sourceItemKey('invalid', 1)).toThrow('must be issue, pull_request, or workflow_run')
    })
    
    it('throws on invalid number', () => {
      expect(() => sourceItemKey('issue', 0)).toThrow('positive integer')
      expect(() => sourceItemKey('issue', -1)).toThrow('positive integer')
    })
  })
  
  describe('failureFingerprint', () => {
    it('generates stable fingerprint from failure details', () => {
      const failure = {
        workflow: 'CI',
        job: 'lint',
        step: 'Run ESLint',
        sha: 'abc123',
        error: 'Error: Unexpected token'
      }
      
      const fp1 = failureFingerprint(failure)
      const fp2 = failureFingerprint(failure)
      
      expect(fp1).toBe(fp2)
      expect(fp1).toMatch(/^sha256:[a-f0-9]{64}$/)
    })
    
    it('normalizes file paths and line numbers', () => {
      const failure1 = {
        workflow: 'CI',
        sha: 'abc123',
        error: 'Error at /path/to/file.js:42:10'
      }
      
      const failure2 = {
        workflow: 'CI',
        sha: 'abc123',
        error: 'Error at /different/path/other.js:100:5'
      }
      
      // Should produce same fingerprint due to normalization
      const fp1 = failureFingerprint(failure1)
      const fp2 = failureFingerprint(failure2)
      
      expect(fp1).toBe(fp2)
    })
    
    it('throws on missing workflow or sha', () => {
      expect(() => failureFingerprint({ sha: 'abc' })).toThrow('must include workflow')
      expect(() => failureFingerprint({ workflow: 'CI' })).toThrow('must include workflow and sha')
    })
  })
  
  describe('delegationKey', () => {
    it('generates stable delegation key', () => {
      expect(delegationKey('issue-123', '42')).toBe('deleg-issue-123-run-42')
    })
    
    it('throws on missing params', () => {
      expect(() => delegationKey('', '42')).toThrow('sourceKey and runId are required')
    })
  })
  
  describe('parseSourceItemKey', () => {
    it('parses issue key', () => {
      const result = parseSourceItemKey('issue-123')
      expect(result).toEqual({ kind: 'issue', number: 123 })
    })
    
    it('parses PR key', () => {
      const result = parseSourceItemKey('pr-456')
      expect(result).toEqual({ kind: 'pull_request', number: 456 })
    })
    
    it('parses workflow run key', () => {
      const result = parseSourceItemKey('workflow-run-789')
      expect(result).toEqual({ kind: 'workflow_run', number: 789 })
    })
    
    it('throws on invalid key format', () => {
      expect(() => parseSourceItemKey('invalid')).toThrow('Invalid source item key')
      expect(() => parseSourceItemKey('issue-abc')).toThrow('Invalid source item key')
    })
  })
  
  describe('replay protection', () => {
    it('produces identical keys for replayed events', () => {
      const event = { action: 'opened' }
      const deliveryId = 'same-delivery-id'
      
      const key1 = eventDeliveryKey(event, deliveryId)
      const key2 = eventDeliveryKey(event, deliveryId)
      
      expect(key1).toBe(key2)
    })
    
    it('produces different keys for different deliveries', () => {
      const event = { action: 'opened' }
      
      const key1 = eventDeliveryKey(event, 'delivery-1')
      const key2 = eventDeliveryKey(event, 'delivery-2')
      
      expect(key1).not.toBe(key2)
    })
  })
})
