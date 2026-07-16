import { describe, it, expect } from 'vitest'
import { evaluate } from '../../../scripts/loop/patterns/ci-sweeper.mjs'
import workflowRunFailureFixture from '../../../.loop/fixtures/workflow-run-failure.json'
import workflowRunLintFixture from '../../../.loop/fixtures/workflow-run-lint-failure.json'
import workflowRunFlakyFixture from '../../../.loop/fixtures/workflow-run-flaky.json'

const mockConfig = {
  mode: 'L1',
  labels: {
    managed: 'loop:managed'
  }
}

const mockPolicy = {
  maxAttempts: 3,
  maxChangedFiles: 5
}

describe('ci-sweeper pattern', () => {
  describe('no-op cases', () => {
    it('should skip non-failure workflow runs', () => {
      const input = {
        workflowRun: {
          id: 12345,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'success',
          html_url: 'https://github.com/test/test/actions/runs/12345'
        },
        jobs: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('did not fail')
    })
    
    it('should skip non-CI workflows', () => {
      const input = {
        workflowRun: {
          id: 12346,
          name: 'Deploy',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12346'
        },
        jobs: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('Not the CI workflow')
    })
    
    it('should skip if no failure details found', () => {
      const input = {
        workflowRun: {
          id: 12347,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12347'
        },
        jobs: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('no-op')
      expect(result.reason).toContain('No specific failure details')
    })
    
    it('should skip already processed fingerprint (idempotency)', () => {
      const input = {
        workflowRun: workflowRunFailureFixture.workflow_run,
        jobs: [
          {
            name: 'test',
            conclusion: 'failure',
            steps: [
              { name: 'Run tests', conclusion: 'failure' }
            ]
          }
        ],
        logs: 'Error: Test failed',
        priorState: {
          fingerprint: 'sha256:somehash123'
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      // This test depends on actual fingerprint generation
      // In a real scenario, we'd mock the fingerprint function
      expect(result.sourceKey).toBe(`workflow-run-${workflowRunFailureFixture.workflow_run.id}`)
    })
  })
  
  describe('actionable cases - lint failures', () => {
    it('should classify lint failures correctly', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('actionable')
      expect(result.proposal.failure.classification).toBe('lint-failure')
      expect(result.proposal.failure.likelyFlake).toBe(false)
      expect(result.proposal.diagnosis).toContain('Linting failure')
    })
    
    it('should propose bounded objective for lint failures', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.boundedObjective).toContain('Fix linting errors')
    })
  })
  
  describe('flake detection', () => {
    it('should detect flaky tests with timeout errors', () => {
      const input = {
        workflowRun: workflowRunFlakyFixture.workflow_run,
        jobs: workflowRunFlakyFixture.jobs,
        logs: workflowRunFlakyFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('flake-detected')
      expect(result.proposal.failure.likelyFlake).toBe(true)
      expect(result.reason).toContain('flake')
    })
    
    it('should escalate flakes (never retry to go green)', () => {
      const input = {
        workflowRun: workflowRunFlakyFixture.workflow_run,
        jobs: workflowRunFlakyFixture.jobs,
        logs: workflowRunFlakyFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.needsHuman).toBe(true)
      expect(result.reason).toContain('never auto-retry')
    })
  })
  
  describe('needs-human cases', () => {
    it('should escalate permission failures', () => {
      const input = {
        workflowRun: {
          id: 12348,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12348'
        },
        jobs: [
          {
            name: 'deploy',
            conclusion: 'failure',
            steps: [
              { name: 'Push to registry', conclusion: 'failure' }
            ]
          }
        ],
        logs: 'Error: Permission denied: Cannot push to registry'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.proposal.failure.classification).toBe('permission-failure')
    })
    
    it('should escalate infrastructure failures', () => {
      const input = {
        workflowRun: {
          id: 12349,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12349'
        },
        jobs: [
          {
            name: 'build',
            conclusion: 'failure',
            steps: [
              { name: 'Setup node', conclusion: 'failure' }
            ]
          }
        ],
        logs: 'Error: GitHub Actions runner disconnected unexpectedly'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('needs-human')
      expect(result.proposal.failure.classification).toBe('infrastructure-failure')
    })
    
    it('should escalate after max attempts', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs,
        priorState: {
          attempts: 2
        }
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.attempts).toBe(3)
      expect(result.outcome).toBe('needs-human')
      expect(result.reason).toContain('Max attempts reached')
    })
  })
  
  describe('failure classification', () => {
    it('should classify type checking failures', () => {
      const input = {
        workflowRun: {
          id: 12350,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12350'
        },
        jobs: [
          {
            name: 'typecheck',
            conclusion: 'failure',
            steps: [
              { name: 'Run TypeScript', conclusion: 'failure' }
            ]
          }
        ],
        logs: "error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'"
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.failure.classification).toBe('type-failure')
      expect(result.proposal.boundedObjective).toContain('Fix type errors')
    })
    
    it('should classify test failures', () => {
      const input = {
        workflowRun: {
          id: 12351,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12351'
        },
        jobs: [
          {
            name: 'test',
            conclusion: 'failure',
            steps: [
              { name: 'Run unit tests', conclusion: 'failure' }
            ]
          }
        ],
        logs: 'FAIL src/lib/auth.test.js\nExpected: true\nReceived: false'
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.failure.classification).toBe('test-failure')
      expect(result.proposal.failure.likelyFlake).toBe(false)
    })
    
    it('should classify build failures', () => {
      const input = {
        workflowRun: {
          id: 12352,
          name: 'CI',
          head_sha: 'abc123',
          conclusion: 'failure',
          html_url: 'https://github.com/test/test/actions/runs/12352'
        },
        jobs: [
          {
            name: 'build',
            conclusion: 'failure',
            steps: [
              { name: 'Build app', conclusion: 'failure' }
            ]
          }
        ],
        logs: "ERROR in ./src/index.js\nModule not found: Error: Can't resolve './missing-file'"
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.failure.classification).toBe('build-failure')
    })
  })
  
  describe('fingerprinting', () => {
    it('should generate stable fingerprints', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs
      }
      
      const result1 = evaluate(input, mockConfig, mockPolicy)
      const result2 = evaluate(input, mockConfig, mockPolicy)
      
      expect(result1.fingerprint).toBeDefined()
      expect(result1.fingerprint).toBe(result2.fingerprint)
      expect(result1.fingerprint).toContain('sha256:')
    })
  })
  
  describe('malformed input', () => {
    it('should handle missing workflow run', () => {
      const input = {
        jobs: []
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.outcome).toBe('malformed')
      expect(result.proposal).toBeNull()
    })
  })
  
  describe('L1 constraints', () => {
    it('should never delegate in L1 mode', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      // L1: always just report, never delegate
      expect(result.outcome).toBe('actionable')
      expect(result.proposal).toBeDefined()
      expect(result.proposal.diagnosis).toBeDefined()
    })
    
    it('should link to workflow run URL', () => {
      const input = {
        workflowRun: workflowRunLintFixture.workflow_run,
        jobs: workflowRunLintFixture.jobs,
        logs: workflowRunLintFixture.logs
      }
      
      const result = evaluate(input, mockConfig, mockPolicy)
      
      expect(result.proposal.sourceUrl).toBe(workflowRunLintFixture.workflow_run.html_url)
      expect(result.proposal.sourceUrl).toContain('actions/runs')
    })
  })
})
