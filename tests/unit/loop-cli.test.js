import { describe, it, expect } from 'vitest'
import { parseArgs } from '../../scripts/loop/cli.mjs'

describe('CLI argument parsing', () => {
  it('parses help command', () => {
    const result = parseArgs(['node', 'cli.mjs', 'help'])
    expect(result.command).toBe('help')
  })

  it('parses doctor command', () => {
    const result = parseArgs(['node', 'cli.mjs', 'doctor'])
    expect(result.command).toBe('doctor')
  })

  it('parses run command with pattern', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--pattern', 'issue-intake'])
    expect(result.command).toBe('run')
    expect(result.pattern).toBe('issue-intake')
  })

  it('parses run command with all options', () => {
    const result = parseArgs([
      'node',
      'cli.mjs',
      'run',
      '--pattern',
      'ci-sweeper',
      '--mode',
      'L2',
      '--dry-run',
      'false',
      '--source',
      'issue-123',
    ])

    expect(result.command).toBe('run')
    expect(result.pattern).toBe('ci-sweeper')
    expect(result.mode).toBe('l2')
    expect(result.dryRun).toBe(false)
    expect(result.source).toBe('issue-123')
  })

  it('defaults to help when no command provided', () => {
    const result = parseArgs(['node', 'cli.mjs'])
    expect(result.command).toBe('help')
  })

  it('defaults mode to l1', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run'])
    expect(result.mode).toBe('l1')
  })

  it('defaults dry-run to true', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run'])
    expect(result.dryRun).toBe(true)
  })

  it('defaults pattern to null', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run'])
    expect(result.pattern).toBe(null)
  })

  it('defaults source to null', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run'])
    expect(result.source).toBe(null)
  })

  it('parses dry-run as boolean from string "true"', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--dry-run', 'true'])
    expect(result.dryRun).toBe(true)
  })

  it('parses dry-run as boolean from string "1"', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--dry-run', '1'])
    expect(result.dryRun).toBe(true)
  })

  it('parses dry-run as boolean from string "false"', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--dry-run', 'false'])
    expect(result.dryRun).toBe(false)
  })

  it('does not swallow the next flag as --dry-run value when no value given', () => {
    // Regression test: --dry-run followed by another flag (not true/false/1/0)
    // must not consume that flag as its own value.
    const result = parseArgs([
      'node',
      'cli.mjs',
      'run',
      '--pattern',
      'issue-intake',
      '--dry-run',
      '--fixture',
      '.loop/fixtures/issue-opened.json',
    ])
    expect(result.dryRun).toBe(true)
    expect(result.fixture).toBe('.loop/fixtures/issue-opened.json')
  })

  it('parses --fixture flag', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--fixture', '.loop/fixtures/issue-opened.json'])
    expect(result.fixture).toBe('.loop/fixtures/issue-opened.json')
  })

  it('defaults fixture to null', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run'])
    expect(result.fixture).toBe(null)
  })

  it('lowercases mode for consistency', () => {
    const result = parseArgs(['node', 'cli.mjs', 'run', '--mode', 'L2'])
    expect(result.mode).toBe('l2')
  })

  it('handles multiple patterns correctly', () => {
    const result = parseArgs([
      'node',
      'cli.mjs',
      'run',
      '--pattern',
      'pr-babysitter',
    ])
    expect(result.pattern).toBe('pr-babysitter')
  })

  it('handles source with special characters', () => {
    const result = parseArgs([
      'node',
      'cli.mjs',
      'run',
      '--source',
      'workflow-run-12345',
    ])
    expect(result.source).toBe('workflow-run-12345')
  })

  it('ignores unknown flags', () => {
    const result = parseArgs([
      'node',
      'cli.mjs',
      'run',
      '--pattern',
      'issue-intake',
      '--unknown-flag',
      'value',
    ])
    expect(result.command).toBe('run')
    expect(result.pattern).toBe('issue-intake')
    // Should not throw, just ignore unknown flags
  })
})
