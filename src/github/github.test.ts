import { describe, test, expect } from 'vitest'
import { fetchWorkflowResults } from './github.js'

describe('fetchWorkflowResults', () => {
  // Tips: API limit is higher than non-authentication.
  //       Authentication Command: $ export GITHUB_TOKEN=`gh auth token`
  test('should fetch results using real api', async () => {
    await expect(fetchWorkflowResults(0, 1)).resolves.not.toThrow()
  })

  // not test retry because it needs mock of checkCompleted but it affects correct test case.
})
