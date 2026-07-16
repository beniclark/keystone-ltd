#!/usr/bin/env node

/**
 * Validate all loop workflow YAML files
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as yaml from 'js-yaml'

const workflowFiles = [
  '.github/workflows/loop-run.yml',
  '.github/workflows/loop-issue-intake.yml',
  '.github/workflows/loop-ci-sweeper.yml',
  '.github/workflows/loop-pr-babysitter.yml',
]

async function validateYaml(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8')
    const parsed = yaml.load(content)
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed content is not an object')
    }
    
    return { valid: true, parsed }
  } catch (err) {
    return { valid: false, error: err.message }
  }
}

async function main() {
  console.log('=== Validating Loop Workflow YAML Files ===\n')
  
  let allValid = true
  
  for (const file of workflowFiles) {
    const filePath = resolve(process.cwd(), file)
    const result = await validateYaml(filePath)
    
    if (result.valid) {
      console.log(`✓ ${file}`)
      console.log(`  Name: ${result.parsed.name || 'N/A'}`)
      console.log(`  Triggers: ${Object.keys(result.parsed.on || {}).join(', ')}`)
    } else {
      console.error(`✗ ${file}`)
      console.error(`  Error: ${result.error}`)
      allValid = false
    }
    console.log()
  }
  
  if (allValid) {
    console.log('All workflow files are valid YAML.')
    process.exit(0)
  } else {
    console.error('Some workflow files have YAML errors.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
