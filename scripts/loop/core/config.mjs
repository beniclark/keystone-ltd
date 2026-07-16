import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Ajv from 'ajv'

/**
 * Config loader with JSON Schema validation
 * Loads and validates .loop/config.json against config.schema.json
 */

let cachedConfig = null

/**
 * Load and validate loop configuration
 * @param {string} [repoRoot] - Repository root path (defaults to cwd)
 * @returns {Promise<object>} - Validated configuration object
 * @throws {Error} - If config is missing, invalid JSON, or fails schema validation
 */
export async function loadConfig(repoRoot = process.cwd()) {
  if (cachedConfig) {
    return cachedConfig
  }
  
  const configPath = resolve(repoRoot, '.loop/config.json')
  const schemaPath = resolve(repoRoot, '.loop/schemas/config.schema.json')
  
  let configData
  let schemaData
  
  try {
    configData = await readFile(configPath, 'utf-8')
  } catch (err) {
    throw new Error(`Failed to read config file: ${configPath} (${err.message})`)
  }
  
  let config
  try {
    config = JSON.parse(configData)
  } catch (err) {
    throw new Error(`Invalid JSON in config file: ${configPath} (${err.message})`)
  }
  
  try {
    schemaData = await readFile(schemaPath, 'utf-8')
  } catch (err) {
    throw new Error(`Failed to read schema file: ${schemaPath} (${err.message})`)
  }
  
  let schema
  try {
    schema = JSON.parse(schemaData)
  } catch (err) {
    throw new Error(`Invalid JSON in schema file: ${schemaPath} (${err.message})`)
  }
  
  const ajv = new Ajv({ allErrors: true, strict: false })
  // Skip addFormats to avoid compatibility issues
  const validate = ajv.compile(schema)
  
  if (!validate(config)) {
    const errors = validate.errors.map(err => {
      return `  ${err.instancePath || '/'}: ${err.message}`
    }).join('\n')
    throw new Error(`Config validation failed:\n${errors}`)
  }
  
  cachedConfig = config
  return config
}

/**
 * Reset cached config (for testing)
 */
export function resetConfigCache() {
  cachedConfig = null
}

/**
 * Get current loop mode (L1 or L2)
 * @param {object} config - Validated config object
 * @returns {string} - Loop mode
 */
export function getMode(config) {
  return config.mode
}

/**
 * Check if a branch is watched
 * @param {object} config - Validated config object
 * @param {string} branch - Branch name to check
 * @returns {boolean} - True if branch is watched
 */
export function isWatchedBranch(config, branch) {
  return config.watchedBranches.includes(branch)
}

/**
 * Get label name for a loop state
 * @param {object} config - Validated config object
 * @param {string} state - State name (state, paused, managed, etc.)
 * @returns {string} - Label name
 */
export function getLabel(config, state) {
  return config.labels[state] || null
}

/**
 * Check if adapter is in dry-run mode
 * @param {object} config - Validated config object
 * @returns {boolean} - True if dry-run is enabled
 */
export function isDryRun(config) {
  return config.adapter.dryRun === true
}

/**
 * Get action cap for a specific loop and action type
 * @param {object} config - Validated config object
 * @param {string} loop - Loop name (issueIntake, ciSweeper, prBabysitter)
 * @param {string} action - Action name (maxLabelsPerRun, etc.)
 * @returns {number|boolean} - Cap value or boolean setting
 */
export function getActionCap(config, loop, action) {
  return config.actionCaps?.[loop]?.[action] ?? null
}
