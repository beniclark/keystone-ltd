import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv from 'ajv'

/**
 * State ledger parsing, serialization, and management
 * Pure functions for working with the live ledger state block
 */

const STATE_BEGIN_MARKER = '<!-- LOOP_STATE_BEGIN -->'
const STATE_END_MARKER = '<!-- LOOP_STATE_END -->'

/**
 * Parse state from issue body containing marker-delimited JSON
 * @param {string} issueBody - GitHub issue body text
 * @returns {{ state: object, narrative: string }} - Parsed state and narrative
 * @throws {Error} - If markers are missing or JSON is invalid
 */
export function parseState(issueBody) {
  if (!issueBody || typeof issueBody !== 'string') {
    throw new Error('Issue body is required')
  }
  
  const beginIndex = issueBody.indexOf(STATE_BEGIN_MARKER)
  const endIndex = issueBody.indexOf(STATE_END_MARKER)
  
  if (beginIndex === -1 || endIndex === -1) {
    throw new Error('State markers not found in issue body')
  }
  
  if (endIndex <= beginIndex) {
    throw new Error('Invalid state marker order')
  }
  
  const narrative = issueBody.substring(0, beginIndex).trim()
  const stateBlock = issueBody.substring(beginIndex + STATE_BEGIN_MARKER.length, endIndex).trim()
  
  // Extract JSON from code fence if present
  const jsonMatch = stateBlock.match(/```json\s*([\s\S]*?)\s*```/)
  const jsonText = jsonMatch ? jsonMatch[1] : stateBlock
  
  let state
  try {
    state = JSON.parse(jsonText)
  } catch (err) {
    throw new Error(`Failed to parse state JSON: ${err.message}`)
  }
  
  return { state, narrative }
}

/**
 * Serialize state to issue body format with markers
 * @param {object} state - State object to serialize
 * @param {string} narrative - Human-readable narrative section
 * @returns {string} - Issue body with embedded state
 */
export function serializeState(state, narrative) {
  if (!state || typeof state !== 'object') {
    throw new Error('State object is required')
  }
  
  if (!narrative || typeof narrative !== 'string') {
    throw new Error('Narrative is required')
  }
  
  const stateJson = JSON.stringify(state, null, 2)
  
  return `${narrative.trim()}

---

${STATE_BEGIN_MARKER}
\`\`\`json
${stateJson}
\`\`\`
${STATE_END_MARKER}
`
}

/**
 * Update state with optimistic concurrency (version check)
 * @param {object} currentState - Current state
 * @param {function} updateFn - Function that takes state and returns updated state
 * @returns {object} - Updated state with incremented version
 */
export function updateState(currentState, updateFn) {
  if (!currentState || typeof currentState.version !== 'number') {
    throw new Error('Current state must have a version number')
  }
  
  if (typeof updateFn !== 'function') {
    throw new Error('Update function is required')
  }
  
  const updatedState = updateFn({ ...currentState })
  
  // Increment version for optimistic concurrency
  updatedState.version = currentState.version + 1
  updatedState.lastUpdated = new Date().toISOString()
  
  return updatedState
}

/**
 * Format a run comment with structured information
 * @param {object} run - Run details
 * @param {string} run.runId - Unique run identifier
 * @param {string} run.timestamp - ISO timestamp
 * @param {string} run.trigger - Trigger description
 * @param {string} run.mode - Loop mode (L1/L2)
 * @param {Array<string>} run.discoveries - Discovery messages
 * @param {Array<string>} run.actions - Action messages
 * @param {Array<string>} run.deferrals - Deferral messages
 * @param {object} run.links - Links to source, workflow, PRs
 * @returns {string} - Formatted run comment
 */
export function formatRunComment(run) {
  if (!run || !run.runId || !run.timestamp) {
    throw new Error('Run must include runId and timestamp')
  }
  
  const sections = [
    `## Run: ${run.runId} | ${run.timestamp}`,
    '',
    `**Trigger:** ${run.trigger || 'unknown'}`,
    `**Mode:** ${run.mode || 'L1'}`
  ]
  
  if (run.discoveries && run.discoveries.length > 0) {
    sections.push('', '### Discoveries')
    run.discoveries.forEach(d => sections.push(`- ${d}`))
  }
  
  if (run.actions && run.actions.length > 0) {
    sections.push('', '### Actions')
    run.actions.forEach(a => sections.push(`- ${a}`))
  }
  
  if (run.deferrals && run.deferrals.length > 0) {
    sections.push('', '### Deferrals')
    run.deferrals.forEach(d => sections.push(`- ${d}`))
  }
  
  if (run.links && Object.keys(run.links).length > 0) {
    sections.push('', '### Links')
    Object.entries(run.links).forEach(([key, url]) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1)
      sections.push(`- ${label}: ${url}`)
    })
  }
  
  return sections.join('\n')
}

/**
 * Prune old run comments (simulate - actual pruning would be done by transport layer)
 * @param {Array<object>} comments - Array of comment objects
 * @param {number} maxAge - Max age in days
 * @param {number} maxCount - Max number of comments to keep
 * @returns {{ keep: Array<object>, prune: Array<object> }} - Comments to keep and prune
 */
export function pruneComments(comments, maxAge = 30, maxCount = 100) {
  if (!Array.isArray(comments)) {
    throw new Error('Comments must be an array')
  }
  
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - maxAge * 24 * 60 * 60 * 1000)
  
  // Sort by creation date descending (newest first)
  const sorted = [...comments].sort((a, b) => {
    const aDate = new Date(a.created_at || 0)
    const bDate = new Date(b.created_at || 0)
    return bDate - aDate
  })
  
  // Keep comments that are either:
  // 1. Within the most recent maxCount, OR
  // 2. Within maxAge days
  const keep = []
  const prune = []
  
  sorted.forEach((comment, index) => {
    const commentDate = new Date(comment.created_at || 0)
    const isRecent = index < maxCount
    const isWithinAge = commentDate >= cutoffDate
    
    if (isRecent || isWithinAge) {
      keep.push(comment)
    } else {
      prune.push(comment)
    }
  })
  
  return { keep, prune }
}

/**
 * Validate state against schema
 * @param {object} state - State to validate
 * @param {string} [repoRoot] - Repository root (for schema loading)
 * @returns {Promise<{ valid: boolean, errors: Array<string> }>} - Validation result
 */
export async function validateState(state, repoRoot = process.cwd()) {
  const schemaPath = resolve(repoRoot, '.loop/schemas/state.schema.json')
  
  let schemaData
  try {
    schemaData = await readFile(schemaPath, 'utf-8')
  } catch (err) {
    return { valid: false, errors: [`Failed to load schema: ${err.message}`] }
  }
  
  let schema
  try {
    schema = JSON.parse(schemaData)
  } catch (err) {
    return { valid: false, errors: [`Invalid schema JSON: ${err.message}`] }
  }
  
  const ajv = new Ajv({ allErrors: true, strict: false })
  // Skip addFormats to avoid compatibility issues
  const validate = ajv.compile(schema)
  
  const valid = validate(state)
  const errors = valid ? [] : (validate.errors || []).map(err => {
    return `${err.instancePath || '/'}: ${err.message}`
  })
  
  return { valid, errors }
}

/**
 * Create initial empty state
 * @returns {object} - Initial state object
 */
export function createInitialState() {
  return {
    version: 1,
    lastUpdated: new Date().toISOString(),
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
    },
    openPRs: [],
    cooldowns: {}
  }
}
