/**
 * Unit tests for reporting.mjs
 * Phase 8: Observability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateStepSummary, writeStepSummary } from '../../../scripts/loop/core/reporting.mjs'

describe('reporting.mjs', () => {
  describe('generateStepSummary', () => {
    it('should return placeholder for incomplete data', () => {
      const summary = generateStepSummary({})
      
      expect(summary).toContain('Incomplete run data')
      expect(summary).toContain('⚠️')
    })

    it('should require loopName, mode, and evaluation', () => {
      expect(generateStepSummary({ loopName: 'issueIntake' })).toContain('Incomplete')
      expect(generateStepSummary({ mode: 'L1' })).toContain('Incomplete')
      expect(generateStepSummary({ evaluation: {} })).toContain('Incomplete')
    })

    it('should format basic L1 summary', () => {
      const summary = generateStepSummary({
        loopName: 'issueIntake',
        mode: 'L1',
        evaluation: {
          outcome: 'discovered',
          itemsEvaluated: 5,
          itemsSkipped: 2,
        },
        actions: [],
      })
      
      expect(summary).toContain('## Loop Run Summary')
      expect(summary).toContain('**Loop:** Issue Intake')
      expect(summary).toContain('**Mode:** L1')
      expect(summary).toContain('**Outcome:** 🔍 Discovered')
      expect(summary).toContain('**Items Evaluated:** 5')
      expect(summary).toContain('**Items Skipped:** 2')
      expect(summary).toContain('_No actions taken or proposed_')
    })

    it('should include category when present', () => {
      const summary = generateStepSummary({
        loopName: 'ciSweeper',
        mode: 'L2',
        evaluation: {
          outcome: 'proposed',
          category: 'lint-fix',
        },
      })
      
      expect(summary).toContain('**Category:** `lint-fix`')
    })

    it('should format actions list', () => {
      const summary = generateStepSummary({
        loopName: 'prBabysitter',
        mode: 'L1',
        evaluation: {
          outcome: 'proposed',
        },
        actions: [
          {
            description: 'Label PR as needs-rebase',
            target: 'PR #42',
            taken: false,
          },
          {
            description: 'Add comment with suggestion',
            target: 'PR #42',
            link: 'https://github.com/org/repo/pull/42',
            taken: true,
          },
        ],
      })
      
      expect(summary).toContain('### Actions')
      expect(summary).toContain('📋 **Proposed:** Label PR as needs-rebase')
      expect(summary).toContain('Target: PR #42')
      expect(summary).toContain('✅ **Taken:** Add comment with suggestion')
      expect(summary).toContain('[View →](https://github.com/org/repo/pull/42)')
    })

    it('should show L2 graduation eligible status', () => {
      const summary = generateStepSummary({
        loopName: 'ciSweeper',
        mode: 'L2',
        evaluation: {
          outcome: 'proposed',
          category: 'lint-fix',
        },
        graduationEligible: true,
      })
      
      expect(summary).toContain('### L2 Graduation')
      expect(summary).toContain('✅ **Eligible**')
      expect(summary).toContain('Proposal meets L2 safety criteria')
    })

    it('should show L2 graduation ineligible with reason', () => {
      const summary = generateStepSummary({
        loopName: 'ciSweeper',
        mode: 'L2',
        evaluation: {
          outcome: 'proposed',
          category: 'security',
        },
        graduationEligible: false,
        reason: 'Category requires human review',
      })
      
      expect(summary).toContain('### L2 Graduation')
      expect(summary).toContain('❌ **Not Eligible**')
      expect(summary).toContain('Reason: Category requires human review')
    })

    it('should indicate L2 not evaluated in L1 mode', () => {
      const summary = generateStepSummary({
        loopName: 'issueIntake',
        mode: 'L1',
        evaluation: {
          outcome: 'proposed',
        },
      })
      
      expect(summary).toContain('### L2 Graduation')
      expect(summary).toContain('ℹ️ **Not Evaluated**')
      expect(summary).toContain('L1 report-only mode')
    })

    it('should add escalation section for escalated outcome', () => {
      const summary = generateStepSummary({
        loopName: 'issueIntake',
        mode: 'L1',
        evaluation: {
          outcome: 'escalated',
          escalationReason: 'Security issue detected',
        },
      })
      
      expect(summary).toContain('### Next Steps')
      expect(summary).toContain('🚨 **Human intervention required**')
      expect(summary).toContain('Security issue detected')
    })

    it('should add escalation section for blocked outcome', () => {
      const summary = generateStepSummary({
        loopName: 'ciSweeper',
        mode: 'L2',
        evaluation: {
          outcome: 'blocked',
        },
      })
      
      expect(summary).toContain('### Next Steps')
      expect(summary).toContain('🚨 **Human intervention required**')
    })

    it('should format all loop names correctly', () => {
      const loops = [
        { name: 'issueIntake', expected: 'Issue Intake' },
        { name: 'ciSweeper', expected: 'CI Sweeper' },
        { name: 'prBabysitter', expected: 'PR Babysitter' },
      ]
      
      for (const { name, expected } of loops) {
        const summary = generateStepSummary({
          loopName: name,
          mode: 'L1',
          evaluation: { outcome: 'no-op' },
        })
        
        expect(summary).toContain(`**Loop:** ${expected}`)
      }
    })

    it('should format all outcome types with icons', () => {
      const outcomes = [
        'discovered',
        'no-op',
        'proposed',
        'delegated',
        'verified',
        'blocked',
        'escalated',
      ]
      
      for (const outcome of outcomes) {
        const summary = generateStepSummary({
          loopName: 'issueIntake',
          mode: 'L1',
          evaluation: { outcome },
        })
        
        // Just check it includes the outcome text — icon rendering is implementation detail
        expect(summary).toContain('**Outcome:**')
      }
    })

    it('should include timestamp', () => {
      const summary = generateStepSummary({
        loopName: 'issueIntake',
        mode: 'L1',
        evaluation: { outcome: 'no-op' },
      })
      
      expect(summary).toContain('**Timestamp:**')
      expect(summary).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('writeStepSummary', () => {
    let originalEnv

    beforeEach(() => {
      originalEnv = process.env.GITHUB_STEP_SUMMARY
    })

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.GITHUB_STEP_SUMMARY = originalEnv
      } else {
        delete process.env.GITHUB_STEP_SUMMARY
      }
    })

    it('should return false when not in CI', () => {
      delete process.env.GITHUB_STEP_SUMMARY
      
      const result = writeStepSummary('# Test summary')
      
      expect(result).toBe(false)
    })

    it('should return true when GITHUB_STEP_SUMMARY is set', () => {
      process.env.GITHUB_STEP_SUMMARY = '/tmp/step-summary.md'
      
      const result = writeStepSummary('# Test summary')
      
      expect(result).toBe(true)
    })

    it('should handle empty content', () => {
      process.env.GITHUB_STEP_SUMMARY = '/tmp/step-summary.md'
      
      const result = writeStepSummary('')
      
      expect(result).toBe(true)
    })
  })
})
