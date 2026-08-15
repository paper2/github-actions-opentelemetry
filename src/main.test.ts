import { describe, test, expect, vi, beforeEach } from 'vitest'
import * as github from './github/index.js'
import * as instrumentation from './instrumentation/index.js'
import { run } from './main.js'
import { opentelemetryAllDisable } from './utils/opentelemetry-all-disable.js'

/**
 * Testing Philosophy for main.test.ts:
 *
 * This test file focuses only on high-level success/failure scenarios of the main workflow.
 * We test at a coarse granularity - whether the overall execution succeeds or fails.
 * Detailed testing of individual modules, functions, and edge cases is handled by
 * unit tests in their respective module test files.
 *
 * This approach keeps the main integration tests simple and focused on the overall
 * workflow behavior rather than implementation details.
 */

// For test error handle
const fetchWorkflowResultsSpy = vi.spyOn(github, 'fetchWorkflowResults')
const forceFlushSpy = vi.spyOn(instrumentation, 'forceFlush')

describe('run function', () => {
  beforeEach(() => {
    opentelemetryAllDisable()
  })
  describe('should exit with expected code', () => {
    test('should run successfully', async () => {
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "0"'
      )
    })
    test('should exit with 1 when fetching workflow results failed', async () => {
      fetchWorkflowResultsSpy.mockRejectedValueOnce(new Error('test'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
    test('should exit with 1 when forceFlush failed', async () => {
      // Avoid a second real GitHub API + export round-trip; this case only
      // needs the happy-path work to finish so forceFlush can fail.
      fetchWorkflowResultsSpy.mockResolvedValueOnce({
        workflow: {
          created_at: new Date('2024-09-01T00:00:00Z'),
          id: 1,
          name: 'Test Run',
          run_attempt: 1,
          conclusion: 'success',
          repository: { full_name: 'paper2/github-actions-opentelemetry' },
          html_url: 'http://example.com/workflow_run'
        },
        workflowJobs: [
          {
            created_at: new Date('2024-09-01T00:02:00Z'),
            started_at: new Date('2024-09-01T00:05:00Z'),
            completed_at: new Date('2024-09-01T00:10:00Z'),
            conclusion: 'success',
            id: 2,
            name: 'job1',
            run_id: 1,
            workflow_name: 'Test Run',
            status: 'completed',
            steps: [],
            runner_name: null,
            runner_group_name: null
          }
        ]
      })
      forceFlushSpy.mockRejectedValueOnce(new Error('test'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
  })
})
