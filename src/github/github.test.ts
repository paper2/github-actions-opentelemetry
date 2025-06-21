import { describe, test, expect } from 'vitest'
import { fetchWorkflowResults, getLatestCompletedAt } from './github.js'
import { toWorkflowJob, toWorkflowRun, WorkflowJob, Workflow } from './types.js'

describe('fetchWorkflowResults', () => {
  // Tips: If API limit exceed, authenticate by using below command
  //       $ export GITHUB_TOKEN=`gh auth token`
  test('should fetch results using real api', async () => {
    // not test retry because it needs mock of checkCompleted but it affects correct test case.
    await expect(fetchWorkflowResults(0, 1)).resolves.not.toThrow()
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

  test('should handle empty jobs array', () => {
    const result = getLatestCompletedAt([])

    // Should return current time, just check it's a valid ISO string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  test('should handle jobs with null completed_at', () => {
    const completedJob1 = {
      id: 1,
      name: 'job1',
      status: 'completed' as const,
      conclusion: 'success',
      created_at: '2023-01-01T09:00:00Z',
      started_at: '2023-01-01T09:30:00Z',
      completed_at: '2023-01-01T10:00:00Z',
      workflow_name: 'Test Workflow',
      run_id: 12345,
      runner_name: null,
      runner_group_name: null,
      steps: []
    } as WorkflowJob

    const completedJob2 = {
      id: 2,
      name: 'job2',
      status: 'completed' as const,
      conclusion: 'success',
      created_at: '2023-01-01T11:00:00Z',
      started_at: '2023-01-01T11:30:00Z',
      completed_at: '2023-01-01T12:00:00Z',
      workflow_name: 'Test Workflow',
      run_id: 12345,
      runner_name: null,
      runner_group_name: null,
      steps: []
    } as WorkflowJob

    // Create incomplete job that would be filtered out
    const incompleteJob = {
      id: 3,
      name: 'job3',
      status: 'in_progress' as const,
      conclusion: null,
      created_at: '2023-01-01T08:00:00Z',
      started_at: '2023-01-01T08:30:00Z',
      completed_at: null,
      workflow_name: 'Test Workflow',
      run_id: 12345,
      runner_name: null,
      runner_group_name: null,
      steps: []
    }

    // Mix completed jobs with incomplete one (simulating real scenario)
    const mixedJobs = [completedJob1, incompleteJob, completedJob2].filter(
      (job): job is WorkflowJob => job.status === 'completed'
    )

    const result = getLatestCompletedAt(mixedJobs)
    expect(result).toBe('2023-01-01T12:00:00.000Z')
  })
})

describe('Type converters', () => {
  describe('toWorkflowJob', () => {
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

    test('should convert valid job response', () => {
      const result = toWorkflowJob(mockJobResponse as never)
      const expected: WorkflowJob = { ...mockJobResponse }

      expect(result).toEqual(expected)
    })

    test('should handle job without steps', () => {
      const jobWithoutSteps = { ...mockJobResponse, steps: null }

      const result = toWorkflowJob(jobWithoutSteps as never)
      expect(result).not.toBeNull()
      if (result) {
        expect(result.steps).toEqual([])
      }
    })

    test('should return null when job is not completed', () => {
      const incompleteJob = { ...mockJobResponse, status: 'in_progress' }

      const result = toWorkflowJob(incompleteJob as never)
      expect(result).toBeNull()
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
    test('should convert valid workflow response', () => {
      const result = toWorkflowRun(mockWorkflowResponse as never)
      const expected: Workflow = { ...mockWorkflowResponse }

      expect(result).toEqual(expected)
    })

    test('should handle in_progress workflow', () => {
      const incompleteWorkflow = {
        ...mockWorkflowResponse,
        status: 'in_progress',
        conclusion: null
      }

      const result = toWorkflowRun(incompleteWorkflow as never)
      expect(result.status).toBe('in_progress')
      expect(result.conclusion).toBeNull()
    })

    test('should throw error for unsupported workflow status', () => {
      const failedWorkflow = {
        ...mockWorkflowResponse,
        status: 'failed'
      }

      expect(() => toWorkflowRun(failedWorkflow as never)).toThrow(
        'Unsupported workflow status: failed for workflow id: 12345'
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
