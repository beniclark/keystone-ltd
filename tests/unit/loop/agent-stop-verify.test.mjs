import { describe, it, expect, vi } from 'vitest'
import { runCommand, runVerification, verifyStop, formatResults } from '../../../scripts/loop/hooks/agent-stop-verify.mjs'

describe('agent-stop-verify', () => {
  const mockPolicy = {
    protectedPaths: [
      '.env*',
      '.github/workflows/**',
      'package.json',
      'src/lib/auth.js',
    ],
    maxChangedFiles: 5,
  }

  describe('runCommand', () => {
    it('should return success for passing command', () => {
      const mockExec = vi.fn(() => 'output')
      const result = runCommand('npm run lint', mockExec)

      expect(result.success).toBe(true)
      expect(result.output).toBe('output')
      expect(result.error).toBe('')
      expect(mockExec).toHaveBeenCalledWith('npm run lint', expect.any(Object))
    })

    it('should return failure for failing command', () => {
      const mockExec = vi.fn(() => {
        const err = new Error('Command failed')
        err.stdout = 'stdout output'
        err.stderr = 'error message'
        throw err
      })

      const result = runCommand('npm run lint', mockExec)

      expect(result.success).toBe(false)
      expect(result.output).toBe('stdout output')
      expect(result.error).toBe('error message')
    })
  })

  describe('runVerification', () => {
    it('should run all commands when all pass', () => {
      const mockExec = vi.fn(() => 'passed')
      const commands = ['npm run lint', 'npm run test']

      const result = runVerification(commands, mockExec)

      expect(result.passed).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(true)
      expect(mockExec).toHaveBeenCalledTimes(2)
    })

    it('should short-circuit on first failure', () => {
      const mockExec = vi.fn()
        .mockReturnValueOnce('lint passed')
        .mockImplementationOnce(() => {
          const err = new Error('typecheck failed')
          err.stderr = 'type error'
          throw err
        })

      const commands = ['npm run lint', 'npm run typecheck', 'npm run test']

      const result = runVerification(commands, mockExec)

      expect(result.passed).toBe(false)
      expect(result.results).toHaveLength(2) // Only first two ran
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
      expect(mockExec).toHaveBeenCalledTimes(2) // Third not called
    })

    it('should handle empty command list', () => {
      const mockExec = vi.fn()
      const result = runVerification([], mockExec)

      expect(result.passed).toBe(true)
      expect(result.results).toHaveLength(0)
      expect(mockExec).not.toHaveBeenCalled()
    })
  })

  describe('formatResults', () => {
    it('should format passing results', () => {
      const results = [
        { command: 'npm run lint', success: true, output: '', error: '' },
        { command: 'npm run test', success: true, output: '', error: '' },
      ]

      const formatted = formatResults(results)

      expect(formatted).toContain('✅ npm run lint — passed')
      expect(formatted).toContain('✅ npm run test — passed')
    })

    it('should format failing results with error', () => {
      const results = [
        { command: 'npm run lint', success: true, output: '', error: '' },
        { command: 'npm run test', success: false, output: '', error: 'Test failed: expected 1 to equal 2' },
      ]

      const formatted = formatResults(results)

      expect(formatted).toContain('✅ npm run lint — passed')
      expect(formatted).toContain('❌ npm run test — failed')
      expect(formatted).toContain('Test failed')
    })

    it('should truncate long error messages', () => {
      const longError = 'x'.repeat(1000)
      const results = [
        { command: 'npm run test', success: false, output: '', error: longError },
      ]

      const formatted = formatResults(results)

      expect(formatted.length).toBeLessThan(longError.length + 100)
    })
  })

  describe('verifyStop - integration-style', () => {
    it('should allow stop when all verifications pass and no changed files', () => {
      const mockExec = vi.fn(() => 'passed')
      const payload = { metadata: {} }

      // Pass empty changed files array
      const result = verifyStop(payload, mockPolicy, mockExec, [])

      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('passed')
    })

    it('should block stop when verification fails', () => {
      const mockExec = vi.fn()
        .mockReturnValueOnce('lint passed')
        .mockImplementationOnce(() => {
          const err = new Error('typecheck failed')
          err.stderr = 'Type error found'
          throw err
        })

      const payload = {
        metadata: {
          verificationCommands: ['npm run lint', 'npm run typecheck'],
        },
      }

      // Pass empty changed files array to skip git diff
      const result = verifyStop(payload, mockPolicy, mockExec, [])

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Verification failed')
      expect(result.evidence).toContain('❌ npm run typecheck')
    })
  })

  describe('verifyStop - policy checks', () => {
    it('should use default verification commands when not specified', () => {
      const mockExec = vi.fn(() => 'passed')
      const payload = { metadata: {} }

      const result = verifyStop(payload, mockPolicy, mockExec, [])

      // Default commands should be: lint, typecheck, test:unit, build
      expect(result.allowed).toBe(true)
    })

    it('should respect custom verification commands', () => {
      const mockExec = vi.fn(() => 'passed')
      const payload = {
        metadata: {
          verificationCommands: ['npm run custom-check'],
        },
      }

      const result = verifyStop(payload, mockPolicy, mockExec, [])

      expect(result.allowed).toBe(true)
    })
  })
})

// Lightweight integration test using a real trivial command
describe('agent-stop-verify - real command integration', () => {
  it('should successfully run a trivial passing command', () => {
    // Use a simple command that always succeeds
    const result = runCommand('echo test')

    expect(result.success).toBe(true)
    expect(result.output).toContain('test')
    expect(result.error).toBe('')
  })

  it('should handle a real failing command', () => {
    // Use a command that always fails
    const result = runCommand('node -e "process.exit(1)"')

    expect(result.success).toBe(false)
  })
})
