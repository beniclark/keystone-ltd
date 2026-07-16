/**
 * Label sync script — Phase 7: Label normalization and cutover
 * Synchronizes GitHub repository labels with .loop/labels.json
 * 
 * Features:
 * - Dry-run mode (default): reports proposed changes without applying
 * - Schema validation before sync
 * - Fail-closed policy compliance
 * - Deprecated label migration (with --apply flag)
 * - Idempotent: safe to run multiple times
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import { loadPolicy } from './core/policy.mjs'

/**
 * Load and validate label map
 * @param {string} repoRoot - Repository root path
 * @returns {Promise<object>} - Validated label map
 * @throws {Error} - If labels.json is missing, invalid, or fails schema validation
 */
export async function loadLabelMap(repoRoot = process.cwd()) {
  const labelPath = resolve(repoRoot, '.loop/labels.json')
  const schemaPath = resolve(repoRoot, '.loop/schemas/labels.schema.json')
  
  let labelData
  let schemaData
  
  try {
    labelData = await readFile(labelPath, 'utf-8')
  } catch (err) {
    throw new Error(`Failed to read label map: ${labelPath} (${err.message})`)
  }
  
  let labelMap
  try {
    labelMap = JSON.parse(labelData)
  } catch (err) {
    throw new Error(`Invalid JSON in label map: ${labelPath} (${err.message})`)
  }
  
  try {
    schemaData = await readFile(schemaPath, 'utf-8')
  } catch (err) {
    throw new Error(`Failed to read label schema: ${schemaPath} (${err.message})`)
  }
  
  let schema
  try {
    schema = JSON.parse(schemaData)
  } catch (err) {
    throw new Error(`Invalid JSON in label schema: ${schemaPath} (${err.message})`)
  }
  
  // Validate against schema
  const ajv = new Ajv({ strict: true, allErrors: true })
  const validate = ajv.compile(schema)
  const valid = validate(labelMap)
  
  if (!valid) {
    const errors = validate.errors.map(e => `  - ${e.instancePath} ${e.message}`).join('\n')
    throw new Error(`Label map validation failed:\n${errors}`)
  }
  
  return labelMap
}

/**
 * Generate sync report (dry-run)
 * Compares label map with repository labels and reports proposed changes
 * 
 * @param {object} labelMap - Validated label map from .loop/labels.json
 * @param {object} transport - HTTP transport with fetch(url, options) method
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<object>} - Sync report with proposed creates, updates, migrations
 */
export async function generateSyncReport(labelMap, transport, owner, repo) {
  // Fetch existing repository labels
  const url = `https://api.github.com/repos/${owner}/${repo}/labels?per_page=100`
  const response = await transport.fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  
  if (!response.ok) {
    throw new Error(`Failed to fetch repository labels: ${response.status} ${response.statusText}`)
  }
  
  const existingLabels = await response.json()
  const existingMap = new Map(existingLabels.map(l => [l.name, l]))
  
  const report = {
    version: labelMap.version,
    toCreate: [],
    toUpdate: [],
    toMigrate: [],
    unchanged: [],
    summary: {
      creates: 0,
      updates: 0,
      migrations: 0,
      unchanged: 0
    }
  }
  
  // Check canonical priority labels
  for (const [name, spec] of Object.entries(labelMap.labels.priority)) {
    const existing = existingMap.get(name)
    
    if (!existing) {
      report.toCreate.push({
        name,
        color: spec.color,
        description: spec.description,
        category: 'priority'
      })
      report.summary.creates++
    } else if (existing.color !== spec.color || existing.description !== spec.description) {
      report.toUpdate.push({
        name,
        currentColor: existing.color,
        newColor: spec.color,
        currentDescription: existing.description,
        newDescription: spec.description,
        category: 'priority'
      })
      report.summary.updates++
    } else {
      report.unchanged.push({ name, category: 'priority' })
      report.summary.unchanged++
    }
  }
  
  // Check loop-owned labels
  for (const [name, spec] of Object.entries(labelMap.labels.loop)) {
    const existing = existingMap.get(name)
    
    if (!existing) {
      report.toCreate.push({
        name,
        color: spec.color,
        description: spec.description,
        category: 'loop'
      })
      report.summary.creates++
    } else if (existing.color !== spec.color || existing.description !== spec.description) {
      report.toUpdate.push({
        name,
        currentColor: existing.color,
        newColor: spec.color,
        currentDescription: existing.description,
        newDescription: spec.description,
        category: 'loop'
      })
      report.summary.updates++
    } else {
      report.unchanged.push({ name, category: 'loop' })
      report.summary.unchanged++
    }
  }
  
  // Check for deprecated labels to migrate
  if (labelMap.deprecated) {
    for (const [oldName, migration] of Object.entries(labelMap.deprecated)) {
      const existing = existingMap.get(oldName)
      const canonical = existingMap.get(migration.canonical)
      
      if (existing) {
        report.toMigrate.push({
          oldName,
          newName: migration.canonical,
          reason: migration.reason,
          existsInRepo: true,
          canonicalExists: !!canonical
        })
        report.summary.migrations++
      }
    }
  }
  
  return report
}

/**
 * Apply sync changes to repository
 * Creates, updates, and migrates labels according to report
 * 
 * @param {object} report - Sync report from generateSyncReport
 * @param {object} transport - HTTP transport with fetch(url, options) method
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} policy - Loaded policy (for fail-closed enforcement)
 * @returns {Promise<object>} - Application results
 */
export async function applySyncChanges(report, transport, owner, repo, policy) {
  // Fail closed: verify we have a valid policy before applying
  if (!policy || !policy.allowedActions) {
    throw new Error('Policy not loaded or invalid — failing closed before label sync')
  }
  
  const results = {
    created: [],
    updated: [],
    migrated: [],
    errors: []
  }
  
  const baseUrl = `https://api.github.com/repos/${owner}/${repo}/labels`
  
  // Create new labels
  for (const label of report.toCreate) {
    try {
      const response = await transport.fetch(baseUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          name: label.name,
          color: label.color,
          description: label.description
        })
      })
      
      if (response.ok) {
        results.created.push(label.name)
      } else {
        const error = await response.json()
        results.errors.push({ label: label.name, action: 'create', error: error.message })
      }
    } catch (err) {
      results.errors.push({ label: label.name, action: 'create', error: err.message })
    }
  }
  
  // Update existing labels
  for (const label of report.toUpdate) {
    try {
      const response = await transport.fetch(`${baseUrl}/${encodeURIComponent(label.name)}`, {
        method: 'PATCH',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          color: label.newColor,
          description: label.newDescription
        })
      })
      
      if (response.ok) {
        results.updated.push(label.name)
      } else {
        const error = await response.json()
        results.errors.push({ label: label.name, action: 'update', error: error.message })
      }
    } catch (err) {
      results.errors.push({ label: label.name, action: 'update', error: err.message })
    }
  }
  
  // Migrate deprecated labels (note: actual issue/PR label replacement would happen separately)
  for (const migration of report.toMigrate) {
    // For now, just report that migration is needed — actual label replacement
    // on issues/PRs would require a separate workflow to avoid mass updates
    results.migrated.push({
      from: migration.oldName,
      to: migration.newName,
      note: 'Deprecated label exists in repo — migration requires separate issue/PR scan'
    })
  }
  
  return results
}

/**
 * Format sync report for console output
 * @param {object} report - Sync report
 * @returns {string} - Formatted report
 */
export function formatSyncReport(report) {
  const lines = []
  
  lines.push('=== Label Sync Report ===\n')
  lines.push(`Version: ${report.version}`)
  lines.push('')
  
  lines.push('Summary:')
  lines.push(`  Creates:   ${report.summary.creates}`)
  lines.push(`  Updates:   ${report.summary.updates}`)
  lines.push(`  Migrations: ${report.summary.migrations}`)
  lines.push(`  Unchanged: ${report.summary.unchanged}`)
  lines.push('')
  
  if (report.toCreate.length > 0) {
    lines.push('To Create:')
    for (const label of report.toCreate) {
      lines.push(`  + ${label.name} (#${label.color}) — ${label.description}`)
    }
    lines.push('')
  }
  
  if (report.toUpdate.length > 0) {
    lines.push('To Update:')
    for (const label of report.toUpdate) {
      lines.push(`  ~ ${label.name}`)
      lines.push(`    Color: #${label.currentColor} → #${label.newColor}`)
      lines.push(`    Description: "${label.currentDescription}" → "${label.newDescription}"`)
    }
    lines.push('')
  }
  
  if (report.toMigrate.length > 0) {
    lines.push('To Migrate (Deprecated):')
    for (const migration of report.toMigrate) {
      lines.push(`  → ${migration.oldName} → ${migration.newName}`)
      lines.push(`    Reason: ${migration.reason}`)
      lines.push(`    Canonical exists: ${migration.canonicalExists ? 'yes' : 'NO — will be created'}`)
    }
    lines.push('')
    lines.push('⚠️  Migration requires human verification before applying:')
    lines.push('    1. Review proposed changes above')
    lines.push('    2. Ensure no active workflows depend on deprecated labels')
    lines.push('    3. Run with --apply to create/update canonical labels')
    lines.push('    4. Manually update issues/PRs, or create a separate migration script')
    lines.push('')
  }
  
  return lines.join('\n')
}

/**
 * CLI entry point
 * Usage: node scripts/loop/labels-sync.mjs [--dry-run] [--apply]
 */
export async function main(argv = process.argv) {
  const repoRoot = process.cwd()
  const isDryRun = !argv.includes('--apply')
  
  console.log('=== Loop Label Sync ===\n')
  
  try {
    // Load label map and validate
    console.log('Loading label map...')
    const labelMap = await loadLabelMap(repoRoot)
    console.log(`✓ Label map loaded and validated (version ${labelMap.version})`)
    
    // Load policy for fail-closed enforcement
    console.log('Loading policy...')
    const policy = await loadPolicy(repoRoot)
    console.log('✓ Policy loaded')
    
    // Parse repo owner/name from environment or package.json
    const owner = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'OWNER'
    const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'REPO'
    
    // Check for GitHub token
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    if (!token && !isDryRun) {
      throw new Error('GITHUB_TOKEN not found in environment — required for --apply mode')
    }
    
    // Create transport
    const transport = {
      fetch: async (url, options = {}) => {
        if (token) {
          options.headers = options.headers || {}
          options.headers.Authorization = `Bearer ${token}`
        }
        return fetch(url, options)
      }
    }
    
    // Generate sync report
    console.log('\nGenerating sync report...')
    const report = await generateSyncReport(labelMap, transport, owner, repo)
    
    // Display report
    console.log('\n' + formatSyncReport(report))
    
    if (isDryRun) {
      console.log('=== DRY RUN — No changes applied ===')
      console.log('Run with --apply to apply changes (requires GITHUB_TOKEN)')
      return 0
    }
    
    // Apply changes
    console.log('=== Applying changes ===\n')
    const results = await applySyncChanges(report, transport, owner, repo, policy)
    
    console.log('Results:')
    console.log(`  Created: ${results.created.length}`)
    console.log(`  Updated: ${results.updated.length}`)
    console.log(`  Migrated: ${results.migrated.length}`)
    console.log(`  Errors: ${results.errors.length}`)
    
    if (results.errors.length > 0) {
      console.log('\nErrors:')
      for (const err of results.errors) {
        console.log(`  ✗ ${err.label} (${err.action}): ${err.error}`)
      }
    }
    
    console.log('\n✓ Label sync complete')
    return results.errors.length > 0 ? 1 : 0
    
  } catch (err) {
    console.error('\n✗ Label sync failed:', err.message)
    return 1
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const exitCode = await main()
  process.exit(exitCode)
}
