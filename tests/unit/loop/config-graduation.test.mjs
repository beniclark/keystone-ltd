/**
 * Unit tests for config.mjs per-loop mode resolution (Phase 6)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  loadConfig,
  resetConfigCache,
  getMode,
  getEffectiveMode,
  allowsLiveDelegation
} from '../../../scripts/loop/core/config.mjs'

describe('config.mjs - Phase 6 per-loop mode resolution', () => {
  let config, configL2PerLoop
  
  beforeEach(async () => {
    resetConfigCache()
    config = await loadConfig()
    
    // Load fixture with per-loop overrides
    const fixtureData = await readFile(
      resolve(process.cwd(), '.loop/fixtures/config-l2-per-loop.json'),
      'utf-8'
    )
    configL2PerLoop = JSON.parse(fixtureData)
  })
  
  afterEach(() => {
    resetConfigCache()
  })

  describe('getMode (global mode, deprecated)', () => {
    it('should return global mode from config', () => {
      expect(getMode(config)).toBe('L1')
      expect(getMode(configL2PerLoop)).toBe('L2')
    })
  })

  describe('getEffectiveMode (per-loop resolution)', () => {
    it('should return L1 for missing config (fail closed)', () => {
      expect(getEffectiveMode(null, 'ciSweeper')).toBe('L1')
      expect(getEffectiveMode(undefined, 'ciSweeper')).toBe('L1')
    })

    it('should return L1 for missing loop name (fail closed)', () => {
      expect(getEffectiveMode(config, null)).toBe('L1')
      expect(getEffectiveMode(config, undefined)).toBe('L1')
      expect(getEffectiveMode(config, '')).toBe('L1')
    })

    it('should return global mode when no per-loop override', () => {
      const globalL1Config = { mode: 'L1', loops: {} }
      expect(getEffectiveMode(globalL1Config, 'ciSweeper')).toBe('L1')
      expect(getEffectiveMode(globalL1Config, 'issueIntake')).toBe('L1')
      
      const globalL2Config = { mode: 'L2', loops: {} }
      expect(getEffectiveMode(globalL2Config, 'ciSweeper')).toBe('L2')
      expect(getEffectiveMode(globalL2Config, 'prBabysitter')).toBe('L2')
    })

    it('should return per-loop override when present', () => {
      // configL2PerLoop: global=L2, issueIntake=L1, ciSweeper=L2, prBabysitter=L1
      expect(getEffectiveMode(configL2PerLoop, 'issueIntake')).toBe('L1')
      expect(getEffectiveMode(configL2PerLoop, 'ciSweeper')).toBe('L2')
      expect(getEffectiveMode(configL2PerLoop, 'prBabysitter')).toBe('L1')
    })

    it('should prioritize per-loop over global', () => {
      const testConfig = {
        mode: 'L2',
        loops: {
          issueIntake: { mode: 'L1' },
          ciSweeper: { mode: 'L2' }
        }
      }
      
      // Override present: use it
      expect(getEffectiveMode(testConfig, 'issueIntake')).toBe('L1')
      expect(getEffectiveMode(testConfig, 'ciSweeper')).toBe('L2')
      
      // No override: fall back to global
      expect(getEffectiveMode(testConfig, 'prBabysitter')).toBe('L2')
    })

    it('should default to L1 when config has no mode field', () => {
      const noModeConfig = { loops: {} }
      expect(getEffectiveMode(noModeConfig, 'ciSweeper')).toBe('L1')
    })

    it('should handle config with loops but no specific loop entry', () => {
      const testConfig = {
        mode: 'L2',
        loops: {
          issueIntake: { mode: 'L1' }
        }
      }
      
      // ciSweeper not in loops: fall back to global L2
      expect(getEffectiveMode(testConfig, 'ciSweeper')).toBe('L2')
    })

    it('should be backward compatible with Phase 2-5 configs', () => {
      // Old config: no `loops` field at all
      const legacyConfig = { mode: 'L1' }
      
      expect(getEffectiveMode(legacyConfig, 'issueIntake')).toBe('L1')
      expect(getEffectiveMode(legacyConfig, 'ciSweeper')).toBe('L1')
      expect(getEffectiveMode(legacyConfig, 'prBabysitter')).toBe('L1')
    })

    it('should handle empty loops object', () => {
      const emptyLoopsConfig = {
        mode: 'L2',
        loops: {}
      }
      
      expect(getEffectiveMode(emptyLoopsConfig, 'ciSweeper')).toBe('L2')
    })
  })

  describe('allowsLiveDelegation', () => {
    it('should return false when allowLiveDelegation is false', () => {
      expect(allowsLiveDelegation(config)).toBe(false)
      expect(allowsLiveDelegation(configL2PerLoop)).toBe(false)
    })

    it('should return true when allowLiveDelegation is true', () => {
      const liveConfig = {
        ...config,
        allowLiveDelegation: true
      }
      expect(allowsLiveDelegation(liveConfig)).toBe(true)
    })

    it('should return false when allowLiveDelegation is missing (default)', () => {
      const noFieldConfig = { mode: 'L1' }
      expect(allowsLiveDelegation(noFieldConfig)).toBe(false)
    })

    it('should return false for non-boolean truthy values (strict)', () => {
      const stringConfig = { allowLiveDelegation: 'true' }
      expect(allowsLiveDelegation(stringConfig)).toBe(false)
      
      const numberConfig = { allowLiveDelegation: 1 }
      expect(allowsLiveDelegation(numberConfig)).toBe(false)
    })
  })

  describe('Phase 6 default config validation', () => {
    it('should have all loops defaulted to L1 in production config', () => {
      expect(config.mode).toBe('L1')
      expect(config.allowLiveDelegation).toBe(false)
      expect(config.loops.issueIntake.mode).toBe('L1')
      expect(config.loops.ciSweeper.mode).toBe('L1')
      expect(config.loops.prBabysitter.mode).toBe('L1')
    })

    it('should maintain backward compatibility (loops field optional)', async () => {
      // If a Phase 2-5 config is still in use (no loops field),
      // getEffectiveMode should fall back to global mode gracefully
      const legacyStyleConfig = {
        ...config,
        loops: undefined
      }
      
      expect(getEffectiveMode(legacyStyleConfig, 'ciSweeper')).toBe('L1')
    })
  })
})
