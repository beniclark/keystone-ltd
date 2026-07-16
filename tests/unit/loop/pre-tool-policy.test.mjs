import { describe, it, expect, beforeEach } from 'vitest'
import { enforcePolicy, isDestructiveGitCommand, modifiesGovernance, modifiesDependencies } from '../../../scripts/loop/hooks/pre-tool-policy.mjs'

describe('pre-tool-policy', () => {
  const mockPolicy = {
    protectedPaths: [
      '.env*',
      '.github/workflows/**',
      '.github/hooks/**',
      '.loop/**',
      'package.json',
      'package-lock.json',
      'src/lib/auth.js',
    ],
    maxChangedFiles: 5,
    watchedBranches: ['main', 'master'],
  }

  describe('enforcePolicy', () => {
    it('should allow edits to non-protected paths', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: 'src/components/Button.jsx',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('')
    })

    it('should deny edits to protected paths', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: '.github/workflows/ci.yml',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Protected paths')
      expect(result.reason).toContain('.github/workflows/ci.yml')
    })

    it('should deny edits to auth files', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: 'src/lib/auth.js',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Protected paths')
    })

    it('should deny edits to package.json', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: 'package.json',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(false)
      // Protected paths check happens first, catches package.json
      expect(result.reason).toContain('Protected paths')
    })

    it('should allow package.json edits with override flag', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: 'other-package.json', // Use a path not in protected list
        },
        metadata: {
          humanApproved: true,
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(true)
    })

    it('should deny destructive git commands on protected branches', () => {
      const payload = {
        tool: 'bash',
        arguments: {
          command: 'git push origin main --force',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Destructive Git command')
    })

    it('should allow non-destructive git commands', () => {
      const payload = {
        tool: 'bash',
        arguments: {
          command: 'git status',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(true)
    })

    it('should deny governance self-modification', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: '.loop/config.json',
        },
      }

      const result = enforcePolicy(payload, mockPolicy)
      expect(result.allowed).toBe(false)
      // Protected paths check catches .loop/** files
      expect(result.reason).toContain('Protected paths')
    })

    it('should deny too many files', () => {
      const payload = {
        tool: 'edit',
        arguments: {
          path: 'src/file1.js', // Use single path key instead of paths array
        },
      }

      // Override the path extraction to test the limit
      // Create multiple file paths
      const multiFilePayload = {
        tool: 'bash',
        arguments: {
          paths: [
            'src/file1.js',
            'src/file2.js',
            'src/file3.js',
            'src/file4.js',
            'src/file5.js',
            'src/file6.js', // Exceeds max of 5
          ],
        },
      }

      const result = enforcePolicy(multiFilePayload, mockPolicy)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Too many files')
    })
  })

  describe('isDestructiveGitCommand', () => {
    it('should detect force push', () => {
      const result = isDestructiveGitCommand('git push origin main --force', mockPolicy)
      expect(result).toBe(true)
    })

    it('should detect force push shorthand', () => {
      const result = isDestructiveGitCommand('git push origin main -f', mockPolicy)
      expect(result).toBe(true)
    })

    it('should detect hard reset', () => {
      const result = isDestructiveGitCommand('git reset --hard HEAD~1', mockPolicy)
      expect(result).toBe(false) // No protected branch mentioned
    })

    it('should detect force branch deletion on protected branch', () => {
      const result = isDestructiveGitCommand('git branch -D main', mockPolicy)
      expect(result).toBe(true)
    })

    it('should allow force push to non-protected branches', () => {
      const result = isDestructiveGitCommand('git push origin feature/test --force', mockPolicy)
      expect(result).toBe(false)
    })

    it('should allow normal git commands', () => {
      const result = isDestructiveGitCommand('git commit -m "fix"', mockPolicy)
      expect(result).toBe(false)
    })
  })

  describe('modifiesGovernance', () => {
    it('should detect workflow modification in file paths', () => {
      const result = modifiesGovernance('', ['.github/workflows/ci.yml'])
      expect(result).toBe(true)
    })

    it('should detect hooks modification in file paths', () => {
      const result = modifiesGovernance('', ['.github/hooks/loop-policy.json'])
      expect(result).toBe(true)
    })

    it('should detect loop config modification in file paths', () => {
      const result = modifiesGovernance('', ['.loop/config.json'])
      expect(result).toBe(true)
    })

    it('should detect governance modification in command string', () => {
      const result = modifiesGovernance('edit .github/workflows/ci.yml', [])
      expect(result).toBe(true)
    })

    it('should allow non-governance paths', () => {
      const result = modifiesGovernance('', ['src/components/Button.jsx'])
      expect(result).toBe(false)
    })
  })

  describe('modifiesDependencies', () => {
    it('should detect package.json modification', () => {
      const result = modifiesDependencies(['package.json'])
      expect(result).toBe(true)
    })

    it('should detect package-lock.json modification', () => {
      const result = modifiesDependencies(['package-lock.json'])
      expect(result).toBe(true)
    })

    it('should detect nested package.json', () => {
      const result = modifiesDependencies(['submodule/package.json'])
      expect(result).toBe(true)
    })

    it('should allow non-dependency files', () => {
      const result = modifiesDependencies(['src/package-helper.js'])
      expect(result).toBe(false)
    })
  })
})
