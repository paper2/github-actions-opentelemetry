import { describe, test, expect } from 'vitest'
import { fetchWorkflowResults } from './github.js'

describe('fetchWorkflowResults', () => {
  // Tips: If API limit exceed, authenticate by using below command
  //       $ export GITHUB_TOKEN=`gh auth token`
  test('should fetch results using real api', async () => {
    // not test retry because it needs mock of checkCompleted but it affects correct test case.
    await expect(fetchWorkflowResults(0, 1)).resolves.not.toThrow()
  })
})
