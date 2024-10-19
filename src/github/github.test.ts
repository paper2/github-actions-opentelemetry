import { describe, test, expect, vi } from 'vitest'
import { getWorkflowRunContext } from './github.js'
import { GitHubContext } from './types.js'
import { settings } from '../settings.js'
settings.owner = undefined
settings.repository = undefined
settings.workflowRunId = undefined

vi.mock('@actions/github')
vi.mock('@octokit/rest')

describe('getWorkflowRunContext', () => {
  test('should return the workflow run context', () => {
    const context = {
      repo: { owner: 'mock-owner', repo: 'mock-repo' },
      payload: { workflow_run: { id: 456 } }
    } as unknown as GitHubContext

    const result = getWorkflowRunContext(context)
    expect(result).toEqual({
      owner: 'mock-owner',
      repo: 'mock-repo',
      runId: 456
    })
  })

  test('should throw an error if runId is undefined', () => {
    const context = {
      repo: { owner: 'mock-owner', repo: 'mock-repo' },
      payload: {}
    } as unknown as GitHubContext

    expect(() => getWorkflowRunContext(context)).toThrow(
      'Workflow run id is undefined.'
    )
  })
})
