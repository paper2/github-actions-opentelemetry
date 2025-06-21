import { describe, test, expect } from 'vitest'
import { fetchWorkflowResults, getLatestCompletedAt } from './github.js'
import {
  toWorkflowStep,
  toWorkflowJob,
  toWorkflowRun,
  WorkflowStep,
  WorkflowStepResponse
} from './types.js'

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
})

describe('Type converters', () => {
  describe('toWorkflowStep', () => {
    test('should convert valid step response', () => {
      const stepResponse: WorkflowStepResponse = {
        name: 'test-step',
        status: 'completed',
        number: 1,
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      }
      const expected: WorkflowStep = {
        name: 'test-step',
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      }

      const result = toWorkflowStep(stepResponse)
      expect(result).toEqual(expected)
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
