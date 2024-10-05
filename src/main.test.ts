import { describe, test, expect, vi, beforeEach } from 'vitest'
import { run } from './main.js'
import * as githubModule from './github/index.js'
import * as metricsModule from './metrics/index.js'

vi.mock('./metrics/index.js')
vi.mock('./github/index.js')

describe('run', () => {
  const mockOctokit = {}
  const mockWorkflowRunContext: githubModule.WorkflowRunContext = {
    owner: 'test-owner',
    repo: 'test-repo',
    runId: 10856659171
  }
  const mockWorkflowRun = {
    created_at: '2024-09-01T00:00:00Z',
    status: 'completed',
    id: 10856659171,
    name: 'Send Telemetry after Other Workflow',
    run_number: 14
  } as githubModule.WorkflowRun
  const mockWorkflowRunJobs = [
    {
      created_at: '2024-09-01T00:02:00Z',
      started_at: '2024-09-01T00:05:00Z',
      completed_at: '2024-09-01T00:10:00Z',
      id: 30131735230,
      name: 'Run Github Actions OpenTelemetry',
      run_id: 10856659171,
      workflow_name: 'Send Telemetry after Other Workflow'
    }
  ] as githubModule.WorkflowRunJobs
  const mockExit = vi
    .spyOn(process, 'exit')
    .mockImplementation((code?: number | string | null | undefined): never => {
      throw new Error(`process.exit called with code: ${code}`)
    })

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

    await expect(run()).rejects.toThrow('process.exit called with code: 0')

    expect(githubModule.createOctokit).toHaveBeenCalledOnce()
    expect(githubModule.fetchWorkflowRun).toHaveBeenCalledWith(
      mockOctokit,
      mockWorkflowRunContext
    )
    expect(githubModule.fetchWorkflowRunJobs).toHaveBeenCalledWith(
      mockOctokit,
      mockWorkflowRunContext
    )
    expect(metricsModule.createJobGauges).toHaveBeenCalledWith(
      mockWorkflowRun,
      mockWorkflowRunJobs
    )
    expect(metricsModule.createWorkflowGauges).toHaveBeenCalledWith(
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

    await expect(run()).rejects.toThrow('process.exit called with code: 1')
    expect(mockExit).toHaveBeenCalledWith(1)
  })
})
