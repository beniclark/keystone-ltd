import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorktreeManager, createWorktreeManager } from '../../../scripts/loop/isolation/worktree.mjs'

describe('WorktreeManager', () => {
  let mockExec
  let mockFs
  let manager

  beforeEach(() => {
    mockExec = vi.fn()
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
    }
    manager = new WorktreeManager({
      repoRoot: '/test/repo',
      execImpl: mockExec,
      fsImpl: mockFs,
    })
  })

  describe('constructor', () => {
    it('should require repoRoot', () => {
      expect(() => new WorktreeManager({ execImpl: mockExec }))
        .toThrow('requires repoRoot')
    })

    it('should use default exec when not provided', () => {
      const mgr = new WorktreeManager({ repoRoot: '/test/repo' })
      expect(mgr.execImpl).toBeDefined()
    })

    it('should set manifest path', () => {
      expect(manager.manifestPath).toContain('.loop')
      expect(manager.manifestPath).toContain('worktrees.json')
    })
  })

  describe('generateBranchName', () => {
    it('should generate correct branch name format', () => {
      const branch = manager.generateBranchName('issue-intake', 'issue-123', 'run-456')
      expect(branch).toBe('loop/issue-intake/issue-123-run-456')
    })

    it('should handle different patterns', () => {
      const branch = manager.generateBranchName('ci-fix', 'workflow-789', 'abc123')
      expect(branch).toBe('loop/ci-fix/workflow-789-abc123')
    })
  })

  describe('create', () => {
    it('should throw when required params are missing', async () => {
      await expect(manager.create({ pattern: 'test', source: 'src' }))
        .rejects.toThrow('requires pattern, source, and runId')
    })

    it('should create worktree successfully', async () => {
      // Mock git worktree list (no existing worktrees)
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      
      // Mock git worktree add
      mockExec.mockResolvedValueOnce({ stdout: 'Created worktree', stderr: '' })

      // Mock empty manifest
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' })
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      const info = await manager.create({
        pattern: 'issue-intake',
        source: 'issue-123',
        runId: 'run-456',
      })

      expect(info.branch).toBe('loop/issue-intake/issue-123-run-456')
      expect(info.pattern).toBe('issue-intake')
      expect(info.source).toBe('issue-123')
      expect(info.runId).toBe('run-456')
      expect(info.status).toBe('active')
      expect(info.createdAt).toBeDefined()

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('git worktree add'),
        expect.any(Object)
      )
    })

    it('should detect collision with existing git worktrees', async () => {
      // Mock git worktree list with existing worktree
      mockExec.mockResolvedValueOnce({
        stdout: 'worktree /existing/path\nbranch refs/heads/loop/issue-intake/issue-123-run-456\n',
        stderr: '',
      })

      await expect(manager.create({
        pattern: 'issue-intake',
        source: 'issue-123',
        runId: 'run-456',
      })).rejects.toThrow('Worktree collision')
    })

    it('should use custom base branch', async () => {
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      mockExec.mockResolvedValueOnce({ stdout: 'Created', stderr: '' })

      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' })
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      await manager.create({
        pattern: 'ci-fix',
        source: 'workflow-789',
        runId: 'abc123',
        baseBranch: 'develop',
      })

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('develop'),
        expect.any(Object)
      )
    })
  })

  describe('list', () => {
    it('should return empty array when no manifest', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' })

      const worktrees = await manager.list()
      expect(worktrees).toEqual([])
    })

    it('should parse and return manifest', async () => {
      const mockManifest = [
        {
          path: '/test/worktree1',
          branch: 'loop/test/src-1',
          pattern: 'test',
          source: 'src',
          runId: '1',
          createdAt: '2024-01-01T00:00:00Z',
          status: 'active',
        },
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))

      const worktrees = await manager.list()
      expect(worktrees).toEqual(mockManifest)
    })
  })

  describe('get', () => {
    it('should find worktree by branch', async () => {
      const mockManifest = [
        {
          path: '/test/worktree1',
          branch: 'loop/test/src-1',
          pattern: 'test',
          source: 'src',
          runId: '1',
          createdAt: '2024-01-01T00:00:00Z',
          status: 'active',
        },
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))

      const info = await manager.get('loop/test/src-1')
      expect(info).toEqual(mockManifest[0])
    })

    it('should find worktree by path', async () => {
      const mockManifest = [
        {
          path: '/test/worktree1',
          branch: 'loop/test/src-1',
          pattern: 'test',
          source: 'src',
          runId: '1',
          createdAt: '2024-01-01T00:00:00Z',
          status: 'active',
        },
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))

      const info = await manager.get('/test/worktree1')
      expect(info).toEqual(mockManifest[0])
    })

    it('should return null when not found', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' })

      const info = await manager.get('nonexistent')
      expect(info).toBeNull()
    })
  })

  describe('isClean', () => {
    it('should return true for clean worktree', async () => {
      mockExec.mockResolvedValue({ stdout: '', stderr: '' })

      const clean = await manager.isClean('/test/worktree')
      expect(clean).toBe(true)
    })

    it('should return false for dirty worktree', async () => {
      mockExec.mockResolvedValue({ stdout: 'M file.txt\n', stderr: '' })

      const clean = await manager.isClean('/test/worktree')
      expect(clean).toBe(false)
    })

    it('should return false on error', async () => {
      mockExec.mockRejectedValue(new Error('Git error'))

      const clean = await manager.isClean('/test/worktree')
      expect(clean).toBe(false)
    })
  })

  describe('isMerged', () => {
    it('should return true when branch is merged', async () => {
      mockExec.mockResolvedValue({ stdout: '  loop/test/src-1\n  other-branch\n', stderr: '' })

      const merged = await manager.isMerged('loop/test/src-1')
      expect(merged).toBe(true)
    })

    it('should return false when branch is not merged', async () => {
      mockExec.mockResolvedValue({ stdout: '  other-branch\n', stderr: '' })

      const merged = await manager.isMerged('loop/test/src-1')
      expect(merged).toBe(false)
    })

    it('should return false on error', async () => {
      mockExec.mockRejectedValue(new Error('Git error'))

      const merged = await manager.isMerged('loop/test/src-1')
      expect(merged).toBe(false)
    })
  })

  describe('remove', () => {
    it('should throw when worktree not found', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' })

      await expect(manager.remove('nonexistent'))
        .rejects.toThrow('Worktree not found')
    })

    it('should refuse to remove dirty worktree', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))

      // Mock dirty worktree
      mockExec.mockResolvedValueOnce({ stdout: 'M file.txt\n', stderr: '' })

      // Mock not merged
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })

      await expect(manager.remove('loop/test/src-1'))
        .rejects.toThrow('has uncommitted changes')
    })

    it('should remove clean worktree', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      // Mock clean worktree
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      
      // Mock not merged (doesn't matter since it's clean)
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      
      // Mock git worktree remove
      mockExec.mockResolvedValueOnce({ stdout: 'Removed worktree', stderr: '' })

      const result = await manager.remove('loop/test/src-1')
      expect(result).toBe(true)
    })

    it('should remove merged worktree even if dirty', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      // Mock dirty worktree
      mockExec.mockResolvedValueOnce({ stdout: 'M file.txt\n', stderr: '' })
      
      // Mock merged branch
      mockExec.mockResolvedValueOnce({ stdout: '  loop/test/src-1\n', stderr: '' })
      
      // Mock git worktree remove
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' })

      const result = await manager.remove('loop/test/src-1')
      expect(result).toBe(true)
    })

    it('should remove abandoned worktree with force', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'abandoned',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      // Mock dirty worktree (doesn't matter since abandoned)
      mockExec.mockResolvedValueOnce({ stdout: 'M file.txt\n', stderr: '' })
      
      // Mock not merged
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      
      // Mock git worktree remove with force
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' })

      const result = await manager.remove('loop/test/src-1')
      expect(result).toBe(true)
    })

    it('should allow force removal', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      // Mock dirty worktree
      mockExec.mockResolvedValueOnce({ stdout: 'M file.txt\n', stderr: '' })
      
      // Mock not merged
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' })
      
      // Mock git worktree remove with force
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' })

      const result = await manager.remove('loop/test/src-1', { force: true })
      expect(result).toBe(true)
    })
  })

  describe('markAbandoned', () => {
    it('should mark worktree as abandoned', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      await manager.markAbandoned('loop/test/src-1')

      expect(mockFs.writeFile).toHaveBeenCalled()
      const writeCall = mockFs.writeFile.mock.calls[0]
      const writtenData = JSON.parse(writeCall[1])
      expect(writtenData[0].status).toBe('abandoned')
    })
  })

  describe('markMerged', () => {
    it('should mark worktree as merged', async () => {
      const mockManifest = [{
        path: '/test/worktree1',
        branch: 'loop/test/src-1',
        status: 'active',
      }]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      await manager.markMerged('loop/test/src-1')

      expect(mockFs.writeFile).toHaveBeenCalled()
      const writeCall = mockFs.writeFile.mock.calls[0]
      const writtenData = JSON.parse(writeCall[1])
      expect(writtenData[0].status).toBe('merged')
    })
  })

  describe('cleanup', () => {
    it('should cleanup eligible worktrees', async () => {
      const mockManifest = [
        { path: '/test/wt1', branch: 'loop/test/clean-1', status: 'active' },
        { path: '/test/wt2', branch: 'loop/test/dirty-1', status: 'active' },
        { path: '/test/wt3', branch: 'loop/test/merged-1', status: 'active' },
        { path: '/test/wt4', branch: 'loop/test/abandoned-1', status: 'abandoned' },
      ]

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockManifest))
      mockFs.mkdir.mockResolvedValue()
      mockFs.writeFile.mockResolvedValue()

      // Sequence of mock calls for cleanup logic
      // First readFile call in cleanup to get manifest
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest))
      
      // For each worktree: isClean, isMerged, then remove if eligible
      
      // wt1: clean, not merged -> remove
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isClean
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isMerged
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest)) // _loadManifest for remove
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isClean in remove
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isMerged in remove
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' }) // git worktree remove
      
      // wt2: dirty, not merged -> skip
      mockExec.mockResolvedValueOnce({ stdout: 'M file\n', stderr: '' }) // isClean
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isMerged
      
      // wt3: dirty, merged -> remove
      mockExec.mockResolvedValueOnce({ stdout: 'M file\n', stderr: '' }) // isClean
      mockExec.mockResolvedValueOnce({ stdout: '  loop/test/merged-1\n', stderr: '' }) // isMerged
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest)) // _loadManifest for remove
      mockExec.mockResolvedValueOnce({ stdout: 'M file\n', stderr: '' }) // isClean in remove
      mockExec.mockResolvedValueOnce({ stdout: '  loop/test/merged-1\n', stderr: '' }) // isMerged in remove
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' }) // git worktree remove
      
      // wt4: dirty, not merged, abandoned -> remove
      mockExec.mockResolvedValueOnce({ stdout: 'M file\n', stderr: '' }) // isClean
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isMerged
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockManifest)) // _loadManifest for remove
      mockExec.mockResolvedValueOnce({ stdout: 'M file\n', stderr: '' }) // isClean in remove
      mockExec.mockResolvedValueOnce({ stdout: '', stderr: '' }) // isMerged in remove
      mockExec.mockResolvedValueOnce({ stdout: 'Removed', stderr: '' }) // git worktree remove --force

      const removed = await manager.cleanup()

      expect(removed).toHaveLength(3)
      expect(removed).toContain('loop/test/clean-1')
      expect(removed).toContain('loop/test/merged-1')
      expect(removed).toContain('loop/test/abandoned-1')
      expect(removed).not.toContain('loop/test/dirty-1')
    })
  })

  describe('refuseBranchSwitch', () => {
    it('should always throw', () => {
      expect(() => manager.refuseBranchSwitch('/test/worktree', 'new-branch'))
        .toThrow('Branch switching inside a worktree is not allowed')
    })
  })

  describe('createWorktreeManager', () => {
    it('should create a manager instance', () => {
      const mgr = createWorktreeManager({ repoRoot: '/test/repo' })
      expect(mgr).toBeInstanceOf(WorktreeManager)
    })
  })
})
