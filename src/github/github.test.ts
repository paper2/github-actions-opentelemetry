import { describe, test, expect, vi, beforeEach } from 'vitest'
import { fetchWorkflowResults, getLatestCompletedAt } from './github.js'
import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import { toWorkflowStep, toWorkflowJob, toWorkflowRun } from './types.js'
import { WorkflowStep } from '@octokit/webhooks-types'

// Mock dependencies
vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {
      workflow_run: {
        id: 12345,
        run_attempt: 1
      }
    }
  }
}))
vi.mock('@actions/core')
vi.mock('@octokit/rest')
vi.mock('../settings.js', () => ({
  default: {
    workflowRunId: 12345,
    owner: 'test-owner',
    repository: 'test-repo'
  }
}))

const mockOctokit = {
  rest: {
    actions: {
      getWorkflowRunAttempt: vi.fn(),
      listJobsForWorkflowRun: vi.fn()
    }
  }
}

const mockWorkflowResponse = {
  id: 12345,
  name: 'Test Workflow',
  status: 'completed' as const,
  conclusion: 'success',
  created_at: '2023-01-01T00:00:00Z',
  run_attempt: 1,
  html_url: 'https://github.com/test/repo/actions/runs/12345',
  repository: {
    full_name: 'test-owner/test-repo'
  }
}

const mockJobResponse = {
  id: 1,
  name: 'test-job',
  status: 'completed' as const,
  conclusion: 'success',
  created_at: '2023-01-01T00:00:00Z',
  started_at: '2023-01-01T00:01:00Z',
  completed_at: '2023-01-01T00:05:00Z',
  workflow_name: 'Test Workflow',
  run_id: 12345,
  runner_name: 'test-runner',
  runner_group_name: 'test-group',
  steps: [
    {
      name: 'test-step',
      conclusion: 'success',
      started_at: '2023-01-01T00:01:00Z',
      completed_at: '2023-01-01T00:02:00Z'
    }
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(Octokit).mockImplementation(() => mockOctokit as unknown as Octokit)
  vi.mocked(core.getInput).mockReturnValue('test-token')
})

describe('fetchWorkflowResults', () => {
  test('should fetch results successfully', async () => {
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockResolvedValue({
      data: mockWorkflowResponse
    })
    mockOctokit.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
      data: { jobs: [mockJobResponse] }
    })

    const result = await fetchWorkflowResults(0, 1)

    expect(result.workflow.id).toBe(12345)
    expect(result.workflowJobs).toHaveLength(1)
    expect(result.workflowJobs[0].name).toBe('test-job')
  })

  test('should handle retry on failure', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockRejectedValueOnce(
      new Error('API Error')
    )
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockResolvedValueOnce({
      data: mockWorkflowResponse
    })
    mockOctokit.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
      data: { jobs: [mockJobResponse] }
    })

    const result = await fetchWorkflowResults(100, 3)

    expect(result.workflow.id).toBe(12345)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'current try: 1',
      expect.any(Error)
    )
    consoleErrorSpy.mockRestore()
  })

  test('should throw error when max retries exceeded', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const coreErrorSpy = vi.spyOn(core, 'error').mockImplementation(() => {})
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockRejectedValue(
      new Error('API Error')
    )

    await expect(fetchWorkflowResults(100, 2)).rejects.toThrow()
    expect(coreErrorSpy).toHaveBeenCalledWith(
      'failed to get results of workflow run'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'current try: 1',
      expect.any(Error)
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error))

    consoleErrorSpy.mockRestore()
    coreErrorSpy.mockRestore()
  })

  test('should use environment GITHUB_TOKEN when input is not provided', async () => {
    vi.mocked(core.getInput).mockReturnValue('')
    process.env.GITHUB_TOKEN = 'env-token'
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockResolvedValue({
      data: mockWorkflowResponse
    })
    mockOctokit.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
      data: { jobs: [mockJobResponse] }
    })

    await fetchWorkflowResults(0, 1)

    expect(Octokit).toHaveBeenCalledWith({
      baseUrl: 'https://api.github.com',
      auth: 'env-token'
    })

    delete process.env.GITHUB_TOKEN
  })

  test('should use custom GitHub API URL from environment', async () => {
    process.env.GITHUB_API_URL = 'https://api.github.enterprise.com'
    mockOctokit.rest.actions.getWorkflowRunAttempt.mockResolvedValue({
      data: mockWorkflowResponse
    })
    mockOctokit.rest.actions.listJobsForWorkflowRun.mockResolvedValue({
      data: { jobs: [mockJobResponse] }
    })

    await fetchWorkflowResults(0, 1)

    expect(Octokit).toHaveBeenCalledWith({
      baseUrl: 'https://api.github.enterprise.com',
      auth: 'test-token'
    })

    delete process.env.GITHUB_API_URL
  })
})

describe('getLatestCompletedAt', () => {
  test('should return latest completion time', () => {
    const jobs = [
      { completed_at: '2023-01-01T00:05:00Z' },
      { completed_at: '2023-01-01T00:03:00Z' },
      { completed_at: '2023-01-01T00:07:00Z' }
    ] as { completed_at: string }[]

    const result = getLatestCompletedAt(jobs as never)
    expect(result).toBe('2023-01-01T00:07:00.000Z')
  })

  test('should handle single job', () => {
    const jobs = [{ completed_at: '2023-01-01T00:05:00Z' }] as {
      completed_at: string
    }[]

    const result = getLatestCompletedAt(jobs as never)
    expect(result).toBe('2023-01-01T00:05:00.000Z')
  })
})

describe('Type converters', () => {
  describe('toWorkflowStep', () => {
    test('should convert valid step response', () => {
      const stepResponse: WorkflowStep = {
        name: 'test-step',
        status: 'completed',
        number: 1,
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      }

      const result = toWorkflowStep(stepResponse)
      expect(result).toEqual(stepResponse)
    })

    test('should throw error when conclusion is missing', () => {
      const stepResponse = {
        name: 'test-step',
        conclusion: null,
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      }

      expect(() => toWorkflowStep(stepResponse as never)).toThrow(
        'Step conclusion is required'
      )
    })

    test('should throw error when started_at is missing', () => {
      const stepResponse = {
        name: 'test-step',
        conclusion: 'success',
        started_at: null,
        completed_at: '2023-01-01T00:02:00Z'
      }

      expect(() => toWorkflowStep(stepResponse as never)).toThrow(
        'Step started_at is required'
      )
    })

    test('should throw error when completed_at is missing', () => {
      const stepResponse = {
        name: 'test-step',
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: null
      }

      expect(() => toWorkflowStep(stepResponse as never)).toThrow(
        'Step completed_at is required'
      )
    })
  })

  describe('toWorkflowJob', () => {
    test('should convert valid job response', () => {
      const result = toWorkflowJob(mockJobResponse as never)

      expect(result.id).toBe(1)
      expect(result.name).toBe('test-job')
      expect(result.status).toBe('completed')
      expect(result.steps).toHaveLength(1)
    })

    test('should handle job without steps', () => {
      const jobWithoutSteps = { ...mockJobResponse, steps: null }

      const result = toWorkflowJob(jobWithoutSteps as never)
      expect(result.steps).toEqual([])
    })

    test('should throw error when job is not completed', () => {
      const incompleteJob = { ...mockJobResponse, status: 'in_progress' }

      expect(() => toWorkflowJob(incompleteJob as never)).toThrow(
        'This job is not completed. id: 1'
      )
    })

    test('should throw error when conclusion is missing', () => {
      const jobWithoutConclusion = { ...mockJobResponse, conclusion: null }

      expect(() => toWorkflowJob(jobWithoutConclusion as never)).toThrow(
        'Job conclusion is required'
      )
    })

    test('should throw error when completed_at is missing', () => {
      const jobWithoutCompletedAt = { ...mockJobResponse, completed_at: null }

      expect(() => toWorkflowJob(jobWithoutCompletedAt as never)).toThrow(
        'Job completed_at is required'
      )
    })

    test('should throw error when workflow_name is missing', () => {
      const jobWithoutWorkflowName = { ...mockJobResponse, workflow_name: null }

      expect(() => toWorkflowJob(jobWithoutWorkflowName as never)).toThrow(
        'Job workflow_name is required'
      )
    })
  })

  describe('toWorkflowRun', () => {
    test('should convert valid workflow response', () => {
      const result = toWorkflowRun(mockWorkflowResponse as never)

      expect(result.id).toBe(12345)
      expect(result.name).toBe('Test Workflow')
      expect(result.status).toBe('completed')
    })

    test('should throw error when workflow is not completed', () => {
      const incompleteWorkflow = {
        ...mockWorkflowResponse,
        status: 'in_progress'
      }

      expect(() => toWorkflowRun(incompleteWorkflow as never)).toThrow(
        'This workflow is not completed. id: 12345'
      )
    })

    test('should throw error when name is missing', () => {
      const workflowWithoutName = { ...mockWorkflowResponse, name: null }

      expect(() => toWorkflowRun(workflowWithoutName as never)).toThrow(
        'Workflow run name is required'
      )
    })

    test('should throw error when conclusion is missing', () => {
      const workflowWithoutConclusion = {
        ...mockWorkflowResponse,
        conclusion: null
      }

      expect(() => toWorkflowRun(workflowWithoutConclusion as never)).toThrow(
        'Workflow run conclusion is required'
      )
    })

    test('should throw error when run_attempt is missing', () => {
      const workflowWithoutAttempt = {
        ...mockWorkflowResponse,
        run_attempt: null
      }

      expect(() => toWorkflowRun(workflowWithoutAttempt as never)).toThrow(
        'Workflow run attempt is required'
      )
    })
  })
})
