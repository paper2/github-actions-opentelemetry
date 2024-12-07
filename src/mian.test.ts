import { describe, test, expect, vi, beforeEach } from 'vitest'
import * as github from './github/index.js'
import * as instrumentation from './instrumentation/index.js'
import { run } from './main.js'
import { opentelemetryAllDisable } from './utils/opentelemetry-all-disable.js'

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
      forceFlushSpy.mockRejectedValueOnce(new Error('test'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
  })
})
