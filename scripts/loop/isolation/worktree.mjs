/**
 * Git worktree isolation manager
 * Manages local git worktrees with collision detection and safe cleanup
 * Uses injected exec and fs for testability
 */

import * as fs from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { exec as nodeExec } from 'node:child_process'
import { promisify } from 'node:util'

const defaultExec = promisify(nodeExec)
const defaultFs = {
  readFile: fs.readFile,
  writeFile: fs.writeFile,
  mkdir: fs.mkdir,
}

/**
 * @typedef {object} WorktreeInfo
 * @property {string} path - Absolute path to worktree
 * @property {string} branch - Branch name
 * @property {string} pattern - Pattern (e.g., 'issue-intake', 'ci-fix')
 * @property {string} source - Source identifier (e.g., 'issue-123')
 * @property {string} runId - Unique run ID
 * @property {string} createdAt - ISO timestamp
 * @property {string} status - 'active' | 'abandoned' | 'merged'
 */

export class WorktreeManager {
  /**
   * @param {object} options
   * @param {string} options.repoRoot - Repository root path
   * @param {Function} [options.execImpl] - Exec function (for testing)
   * @param {object} [options.fsImpl] - Filesystem operations (for testing)
   */
  constructor({ repoRoot, execImpl = defaultExec, fsImpl = defaultFs }) {
    if (!repoRoot) {
      throw new Error('WorktreeManager requires repoRoot')
    }
    
    this.repoRoot = repoRoot
    this.execImpl = execImpl
    this.fsImpl = fsImpl
    this.manifestPath = resolve(repoRoot, '.loop', 'worktrees.json')
  }

  /**
   * Load worktree manifest
   * @returns {Promise<Array<WorktreeInfo>>}
   * @private
   */
  async _loadManifest() {
    try {
      const data = await this.fsImpl.readFile(this.manifestPath, 'utf-8')
      return JSON.parse(data)
    } catch (err) {
      if (err.code === 'ENOENT') {
        return []
      }
      throw new Error(`Failed to load worktree manifest: ${err.message}`)
    }
  }

  /**
   * Save worktree manifest
   * @param {Array<WorktreeInfo>} worktrees
   * @private
   */
  async _saveManifest(worktrees) {
    await this.fsImpl.mkdir(resolve(this.repoRoot, '.loop'), { recursive: true })
    await this.fsImpl.writeFile(this.manifestPath, JSON.stringify(worktrees, null, 2), 'utf-8')
  }

  /**
   * Execute git command in repo root
   * @param {string} command
   * @returns {Promise<string>}
   * @private
   */
  async _git(command) {
    try {
      const { stdout, stderr } = await this.execImpl(command, { cwd: this.repoRoot })
      if (stderr && !stderr.includes('Switched to a new branch')) {
        // Git often uses stderr for informational messages
        // Only throw if it's a real error (non-zero exit handled by promisify)
      }
      return stdout.trim()
    } catch (err) {
      throw new Error(`Git command failed: ${err.message}`)
    }
  }

  /**
   * List existing worktrees from git
   * @returns {Promise<Array<{path: string, branch: string}>>}
   * @private
   */
  async _listGitWorktrees() {
    const output = await this._git('git worktree list --porcelain')
    const worktrees = []
    const lines = output.split('\n')
    
    let currentWorktree = {}
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push(currentWorktree)
        }
        currentWorktree = { path: line.substring(9).trim() }
      } else if (line.startsWith('branch ')) {
        currentWorktree.branch = line.substring(7).trim().replace('refs/heads/', '')
      }
    }
    
    if (currentWorktree.path) {
      worktrees.push(currentWorktree)
    }
    
    return worktrees
  }

  /**
   * Generate branch name
   * @param {string} pattern - Pattern (e.g., 'issue-intake', 'ci-fix')
   * @param {string} source - Source identifier
   * @param {string} runId - Unique run ID
   * @returns {string}
   */
  generateBranchName(pattern, source, runId) {
    return `loop/${pattern}/${source}-${runId}`
  }

  /**
   * Create a new worktree
   * @param {object} options
   * @param {string} options.pattern - Pattern (e.g., 'issue-intake')
   * @param {string} options.source - Source identifier (e.g., 'issue-123')
   * @param {string} options.runId - Unique run ID
   * @param {string} [options.baseBranch='main'] - Base branch to branch from
   * @returns {Promise<WorktreeInfo>}
   */
  async create({ pattern, source, runId, baseBranch = 'main' }) {
    if (!pattern || !source || !runId) {
      throw new Error('create() requires pattern, source, and runId')
    }

    const branch = this.generateBranchName(pattern, source, runId)
    const worktreePath = resolve(this.repoRoot, '..', `worktree-${pattern}-${source}-${runId}`)

    // Check for collision with existing git worktrees
    const existingWorktrees = await this._listGitWorktrees()
    const collision = existingWorktrees.find(w => w.branch === branch || w.path === worktreePath)
    
    if (collision) {
      throw new Error(
        `Worktree collision: branch "${branch}" or path "${worktreePath}" already exists`
      )
    }

    // Check manifest for collision
    const manifest = await this._loadManifest()
    const manifestCollision = manifest.find(w => w.branch === branch || w.path === worktreePath)
    
    if (manifestCollision) {
      throw new Error(
        `Worktree collision in manifest: branch "${branch}" or path "${worktreePath}" already tracked`
      )
    }

    // Create worktree
    await this._git(`git worktree add -b ${branch} "${worktreePath}" ${baseBranch}`)

    // Record in manifest
    const info = {
      path: worktreePath,
      branch,
      pattern,
      source,
      runId,
      createdAt: new Date().toISOString(),
      status: 'active',
    }
    
    manifest.push(info)
    await this._saveManifest(manifest)

    return info
  }

  /**
   * Get worktree info by branch or path
   * @param {string} branchOrPath
   * @returns {Promise<WorktreeInfo|null>}
   */
  async get(branchOrPath) {
    const manifest = await this._loadManifest()
    return manifest.find(w => w.branch === branchOrPath || w.path === branchOrPath) || null
  }

  /**
   * List all tracked worktrees
   * @returns {Promise<Array<WorktreeInfo>>}
   */
  async list() {
    return this._loadManifest()
  }

  /**
   * Check if a worktree is clean (no uncommitted changes)
   * @param {string} worktreePath
   * @returns {Promise<boolean>}
   */
  async isClean(worktreePath) {
    try {
      const status = await this.execImpl('git status --porcelain', { cwd: worktreePath })
      return status.stdout.trim() === ''
    } catch {
      return false
    }
  }

  /**
   * Check if a branch is merged into main
   * @param {string} branch
   * @param {string} [targetBranch='main']
   * @returns {Promise<boolean>}
   */
  async isMerged(branch, targetBranch = 'main') {
    try {
      const merged = await this._git(`git branch --merged ${targetBranch}`)
      return merged.split('\n').some(line => line.trim() === branch || line.trim() === `* ${branch}`)
    } catch {
      return false
    }
  }

  /**
   * Remove a worktree
   * Only removes if clean, merged, or explicitly marked abandoned
   * @param {string} branchOrPath
   * @param {object} [options]
   * @param {boolean} [options.force=false] - Force removal even if dirty
   * @returns {Promise<boolean>} - True if removed, false if skipped
   */
  async remove(branchOrPath, { force = false } = {}) {
    const info = await this.get(branchOrPath)
    if (!info) {
      throw new Error(`Worktree not found: ${branchOrPath}`)
    }

    // Check if clean
    const clean = await this.isClean(info.path)
    const merged = await this.isMerged(info.branch)
    const abandoned = info.status === 'abandoned'

    // Refuse to remove dirty worktrees unless forced or abandoned
    if (!clean && !force && !abandoned && !merged) {
      throw new Error(
        `Worktree has uncommitted changes: ${info.path}. ` +
        `Mark as abandoned, merge the branch, or use force=true to remove.`
      )
    }

    // Remove worktree
    try {
      await this._git(`git worktree remove "${info.path}" ${force ? '--force' : ''}`)
    } catch (err) {
      // Worktree might already be gone; that's okay
      if (!err.message.includes('not a working tree')) {
        throw err
      }
    }

    // Remove from manifest
    const manifest = await this._loadManifest()
    const filtered = manifest.filter(w => w.branch !== info.branch && w.path !== info.path)
    await this._saveManifest(filtered)

    return true
  }

  /**
   * Mark a worktree as abandoned (allows cleanup even if dirty)
   * @param {string} branchOrPath
   * @returns {Promise<void>}
   */
  async markAbandoned(branchOrPath) {
    const manifest = await this._loadManifest()
    const info = manifest.find(w => w.branch === branchOrPath || w.path === branchOrPath)
    
    if (!info) {
      throw new Error(`Worktree not found: ${branchOrPath}`)
    }
    
    info.status = 'abandoned'
    await this._saveManifest(manifest)
  }

  /**
   * Mark a worktree as merged
   * @param {string} branchOrPath
   * @returns {Promise<void>}
   */
  async markMerged(branchOrPath) {
    const manifest = await this._loadManifest()
    const info = manifest.find(w => w.branch === branchOrPath || w.path === branchOrPath)
    
    if (!info) {
      throw new Error(`Worktree not found: ${branchOrPath}`)
    }
    
    info.status = 'merged'
    await this._saveManifest(manifest)
  }

  /**
   * Cleanup eligible worktrees (clean, merged, or abandoned)
   * @returns {Promise<Array<string>>} - Removed worktree branches
   */
  async cleanup() {
    const manifest = await this._loadManifest()
    const removed = []

    for (const info of manifest) {
      const clean = await this.isClean(info.path)
      const merged = await this.isMerged(info.branch)
      const abandoned = info.status === 'abandoned'

      if (clean || merged || abandoned) {
        try {
          await this.remove(info.branch, { force: abandoned })
          removed.push(info.branch)
        } catch {
          // Continue cleanup even if one fails
        }
      }
    }

    return removed
  }

  /**
   * Refuse to switch branches inside a worktree
   * This is a safety check; worktrees are meant to be isolated
   * @param {string} worktreePath
   * @param {string} newBranch
   * @throws {Error} - Always throws; branch switching is not allowed
   */
  refuseBranchSwitch(worktreePath, newBranch) {
    throw new Error(
      `Branch switching inside a worktree is not allowed. ` +
      `Worktree ${worktreePath} should remain on its original branch. ` +
      `To work on ${newBranch}, create a new worktree.`
    )
  }
}

/**
 * Create a worktree manager instance
 * @param {object} options
 * @returns {WorktreeManager}
 */
export function createWorktreeManager(options) {
  return new WorktreeManager(options)
}
