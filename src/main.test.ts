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
const shutdownSpy = vi.spyOn(instrumentation, 'shutdown')

describe('run function', () => {
  beforeEach(() => {
    // Ensure we don't attempt to export traces/metrics to a local collector during tests.
    opentelemetryAllDisable()
    process.env.FEATURE_METRICS = 'false'
    process.env.FEATURE_TRACE = 'false'
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = undefined
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = undefined

    // Default: avoid hitting the real GitHub API in unit/integration tests.
    // Individual tests can override with mockRejectedValueOnce, etc.
    fetchWorkflowResultsSpy.mockResolvedValue({
      workflow: {
        id: 12345,
        name: 'Test Workflow',
        conclusion: 'success',
        created_at: new Date('2023-01-01T00:00:00Z'),
        run_attempt: 1,
        html_url: 'https://github.com/test/repo/actions/runs/12345',
        repository: { full_name: 'test-owner/test-repo' }
      },
      workflowJobs: [
        {
          id: 1,
          name: 'Test Job',
          status: 'completed',
          conclusion: 'success',
          created_at: new Date('2023-01-01T00:00:00Z'),
          started_at: new Date('2023-01-01T00:01:00Z'),
          completed_at: new Date('2023-01-01T00:02:00Z'),
          workflow_name: 'Test Workflow',
          run_id: 12345,
          runner_name: null,
          runner_group_name: null,
          steps: []
        }
      ]
    } as never)

    // Avoid network I/O from OTel exporters during these tests.
    forceFlushSpy.mockResolvedValue(undefined)
    shutdownSpy.mockResolvedValue(undefined)
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
      forceFlushSpy.mockRejectedValueOnce(new Error('test'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
  })
})
