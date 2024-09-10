import { describe, test, expect, vi, beforeEach } from 'vitest'
import { run } from './main.js'
import * as core from '@actions/core'
import * as githubModule from './github/index.js'
import * as metricsModule from './metrics/index.js'

vi.mock('@actions/core')
vi.mock('./metrics/index.js')
vi.mock('./github/index.js')

describe('run', () => {
  const mockOctokit = {}
  const mockWorkflowRunContext: githubModule.WorkflowRunContext = {
    owner: 'test-owner',
    repo: 'test-repo',
    runId: 10786665607
  }
  const mockWorkflowRun: githubModule.WorkflowRun = {
    created_at: new Date(),
    status: 'completed',
    id: 10786665607,
    name: 'test-workflow',
    run_number: 1
  }
  const mockWorkflowRunJobs: githubModule.WorkflowRunJobs = [
    {
      created_at: new Date(),
      started_at: new Date(),
      completed_at: new Date(),
      id: 1,
      name: 'test-job',
      run_id: 10786665607,
      workflow_name: 'test-workflow'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should run successfully', async () => {
    vi.spyOn(githubModule, 'createOctokit').mockReturnValueOnce(
      mockOctokit as unknown as ReturnType<typeof githubModule.createOctokit>
    )
    vi.spyOn(githubModule, 'getWorkflowRunContext').mockReturnValueOnce(
      mockWorkflowRunContext
    )
    vi.spyOn(githubModule, 'fetchWorkflowRun').mockResolvedValueOnce(
      mockWorkflowRun
    )
    vi.spyOn(githubModule, 'fetchWorkflowRunJobs').mockResolvedValueOnce(
      mockWorkflowRunJobs
    )

    await run()

    expect(githubModule.createOctokit).toHaveBeenCalledOnce()
    expect(githubModule.fetchWorkflowRun).toHaveBeenCalledWith(
      mockOctokit,
      mockWorkflowRunContext
    )
    expect(githubModule.fetchWorkflowRunJobs).toHaveBeenCalledWith(
      mockOctokit,
      mockWorkflowRunContext
    )
    expect(metricsModule.createJobGuages).toHaveBeenCalledWith(
      mockWorkflowRunJobs
    )
    expect(metricsModule.createWorkflowGuages).toHaveBeenCalledWith(
      mockWorkflowRun,
      mockWorkflowRunJobs
    )
    expect(metricsModule.shutdown).toHaveBeenCalled()
  })

  test('should handle errors correctly', async () => {
    const errorMessage = 'Fetch failed'
    vi.spyOn(githubModule, 'fetchWorkflowRun').mockRejectedValueOnce(
      new Error(errorMessage)
    )

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
    expect(metricsModule.shutdown).toHaveBeenCalled()
  })
})
