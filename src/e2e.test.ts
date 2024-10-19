import { describe, test, expect, vi, beforeEach } from 'vitest'
import { run } from './main.js'
import * as githubModule from './github/index.js'
import * as opentelemetry from '@opentelemetry/api'

describe('e2e', () => {
  beforeEach(() => {
    // disable global providers for test
    opentelemetry.metrics.disable()
    opentelemetry.trace.disable()
    opentelemetry.diag.disable()
    opentelemetry.context.disable()
    opentelemetry.propagation.disable()
  })

  test('should run successfully by using real api', async () => {
    await expect(run()).rejects.toThrow(
      'process.exit unexpectedly called with "0"' // 0 is success
    )
  })
  test('should handle errors correctly', async () => {
    const errorMessage = 'Fetch failed'
    vi.spyOn(githubModule, 'fetchWorkflowResults').mockRejectedValueOnce(
      new Error(errorMessage)
    )
    await expect(run()).rejects.toThrow(
      'process.exit unexpectedly called with "1"'
    )
  })
})
