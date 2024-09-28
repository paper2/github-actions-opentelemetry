import { describe, test, expect } from 'vitest'
import settings from './settings.js'
settings.owner = 'paper2'
settings.repository = 'github-actions-opentelemetry'
// NOTE: maybe sometimes change this value because deleting this job in GitHub.
settings.workflowRunId = 10640837411

// import after change setting for test
// eslint-disable-next-line import/first
import { run } from './main.js'

describe('e2e', () => {
  test('run by using real api', async () => {
    await expect(run()).rejects.toThrow(
      'process.exit unexpectedly called with "0"' // 0 is success
    )
  })
})
