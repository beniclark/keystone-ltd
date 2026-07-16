import { describe, it, expect, beforeEach } from 'vitest'
import {
  DelegationAdapter,
  createDelegationRequest,
  validateCloudBranchIsolation,
  createCloudBranchIsolation,
} from '../../../scripts/loop/delegates/index.mjs'

describe('DelegationAdapter', () => {
  describe('constructor', () => {
    it('should require a name', () => {
      expect(() => new DelegationAdapter()).toThrow('requires a name')
    })

    it('should store the adapter name', () => {
      const adapter = new DelegationAdapter('test-adapter')
      expect(adapter.name).toBe('test-adapter')
    })
  })

  describe('abstract methods', () => {
    let adapter

    beforeEach(() => {
      adapter = new DelegationAdapter('test')
    })

    it('should throw when delegate() is not implemented', async () => {
      await expect(adapter.delegate({}))
        .rejects.toThrow('must implement delegate')
    })

    it('should throw when isAvailable() is not implemented', async () => {
      await expect(adapter.isAvailable())
        .rejects.toThrow('must implement isAvailable')
    })
  })

  describe('validateRequest', () => {
    let adapter

    beforeEach(() => {
      adapter = new DelegationAdapter('test')
    })

    it('should throw when request is null', () => {
      expect(() => adapter.validateRequest(null))
        .toThrow('DelegationRequest is required')
    })

    it('should throw when source is missing', () => {
      expect(() => adapter.validateRequest({}))
        .toThrow('source is required')
    })

    it('should throw when source.kind is invalid', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'invalid', number: 1, url: 'http://example.com' },
      })).toThrow('Invalid source.kind')
    })

    it('should throw when source.number is not a number', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: '123', url: 'http://example.com' },
      })).toThrow('source.number must be a number')
    })

    it('should throw when idempotencyKey is missing', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
      })).toThrow('idempotencyKey is required')
    })

    it('should throw when objective is missing', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
      })).toThrow('objective is required')
    })

    it('should throw when objective exceeds 200 chars', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'x'.repeat(201),
      })).toThrow('objective must be 200 characters or less')
    })

    it('should throw when doneWhen is empty', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: [],
      })).toThrow('doneWhen must be a non-empty array')
    })

    it('should throw when paths are not arrays', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: 'src/**',
      })).toThrow('allowedPaths must be an array')
    })

    it('should throw when maxAttempts is invalid', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 0,
      })).toThrow('maxAttempts must be a positive number')
    })

    it('should throw when maxFiles is invalid', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: -1,
      })).toThrow('maxFiles must be a positive number')
    })

    it('should throw when verificationCommands is not an array', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: 'npm test',
      })).toThrow('verificationCommands must be an array')
    })

    it('should throw when escalationInstructions is missing', () => {
      expect(() => adapter.validateRequest({
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: [],
        deniedPaths: [],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: [],
      })).toThrow('escalationInstructions is required')
    })

    it('should validate a complete valid request', () => {
      const validRequest = {
        source: { kind: 'issue', number: 123, url: 'http://example.com' },
        idempotencyKey: 'test-key',
        objective: 'Fix the bug',
        doneWhen: ['Tests pass'],
        allowedPaths: ['src/**'],
        deniedPaths: ['.github/**'],
        maxAttempts: 3,
        maxFiles: 5,
        verificationCommands: ['npm test'],
        escalationInstructions: 'Escalate to human',
      }

      expect(() => adapter.validateRequest(validRequest)).not.toThrow()
    })
  })
})

describe('createDelegationRequest', () => {
  it('should create a valid delegation request', () => {
    const request = createDelegationRequest({
      sourceKind: 'issue',
      sourceNumber: 123,
      sourceUrl: 'https://github.com/owner/repo/issues/123',
      idempotencyKey: 'issue-123-run-456',
      objective: 'Fix lint errors in src/main.js',
      doneWhen: ['npm run lint passes', 'All tests pass'],
      allowedPaths: ['src/**/*.js'],
      deniedPaths: ['.github/**', '.loop/**'],
      maxAttempts: 3,
      maxFiles: 5,
      verificationCommands: ['npm run lint', 'npm test'],
      escalationInstructions: 'Escalate to human review on failure',
    })

    expect(request.source.kind).toBe('issue')
    expect(request.source.number).toBe(123)
    expect(request.idempotencyKey).toBe('issue-123-run-456')
    expect(request.objective).toBe('Fix lint errors in src/main.js')
    expect(request.doneWhen).toHaveLength(2)
    expect(request.maxAttempts).toBe(3)
    expect(request.maxFiles).toBe(5)
  })

  it('should use defaults when optional params are omitted', () => {
    const request = createDelegationRequest({
      sourceKind: 'pr',
      sourceNumber: 456,
      sourceUrl: 'https://github.com/owner/repo/pull/456',
      idempotencyKey: 'pr-456-run-789',
      objective: 'Fix failing test',
    })

    expect(request.doneWhen).toEqual([])
    expect(request.allowedPaths).toEqual([])
    expect(request.deniedPaths).toEqual([])
    expect(request.maxAttempts).toBe(3)
    expect(request.maxFiles).toBe(5)
    expect(request.verificationCommands).toEqual([])
    expect(request.escalationInstructions).toContain('Escalate to human')
    expect(request.metadata).toEqual({})
  })
})

describe('validateCloudBranchIsolation', () => {
  it('should return false for null/undefined', () => {
    expect(validateCloudBranchIsolation(null)).toBe(false)
    expect(validateCloudBranchIsolation(undefined)).toBe(false)
  })

  it('should return false for non-object', () => {
    expect(validateCloudBranchIsolation('string')).toBe(false)
    expect(validateCloudBranchIsolation(123)).toBe(false)
  })

  it('should return false for wrong type', () => {
    expect(validateCloudBranchIsolation({
      type: 'worktree',
      branch: 'test-branch',
    })).toBe(false)
  })

  it('should return false for missing branch', () => {
    expect(validateCloudBranchIsolation({
      type: 'cloud-branch',
    })).toBe(false)
  })

  it('should return false for invalid branch type', () => {
    expect(validateCloudBranchIsolation({
      type: 'cloud-branch',
      branch: 123,
    })).toBe(false)
  })

  it('should return true for valid cloud-branch without PR', () => {
    expect(validateCloudBranchIsolation({
      type: 'cloud-branch',
      branch: 'loop/fix/issue-123-abc',
    })).toBe(true)
  })

  it('should return true for valid cloud-branch with PR', () => {
    expect(validateCloudBranchIsolation({
      type: 'cloud-branch',
      branch: 'loop/fix/issue-123-abc',
      prUrl: 'https://github.com/owner/repo/pull/456',
    })).toBe(true)
  })

  it('should return false for invalid prUrl type', () => {
    expect(validateCloudBranchIsolation({
      type: 'cloud-branch',
      branch: 'loop/fix/issue-123-abc',
      prUrl: 123,
    })).toBe(false)
  })
})

describe('createCloudBranchIsolation', () => {
  it('should create isolation without PR', () => {
    const isolation = createCloudBranchIsolation('loop/fix/issue-123-abc')
    
    expect(isolation.type).toBe('cloud-branch')
    expect(isolation.branch).toBe('loop/fix/issue-123-abc')
    expect(isolation.prUrl).toBeUndefined()
  })

  it('should create isolation with PR', () => {
    const isolation = createCloudBranchIsolation(
      'loop/fix/issue-123-abc',
      'https://github.com/owner/repo/pull/456'
    )
    
    expect(isolation.type).toBe('cloud-branch')
    expect(isolation.branch).toBe('loop/fix/issue-123-abc')
    expect(isolation.prUrl).toBe('https://github.com/owner/repo/pull/456')
  })

  it('should validate against validateCloudBranchIsolation', () => {
    const isolation = createCloudBranchIsolation('test-branch')
    expect(validateCloudBranchIsolation(isolation)).toBe(true)
  })
})
