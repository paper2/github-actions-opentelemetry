import { describe, test, expect } from 'vitest'
import * as github from '@actions/github'
import {
  fetchWorkflowResults,
  getLatestCompletedAt,
  getWorkflowContext,
  createOctokitClient
} from './github.js'
import { toWorkflowJob, toWorkflowRun, WorkflowJob, Workflow } from './types.js'
import { settings } from '../settings.js'

describe('fetchWorkflowResults', () => {
  // Tips: If API limit exceed, authenticate by using below command
  //       $ export GITHUB_TOKEN=`gh auth token`
  test('should fetch results using real api', async () => {
    // not test retry because it needs mock of checkCompleted but it affects correct test case.
    const octokit = createOctokitClient()
    const workflowContext = getWorkflowContext(github.context, settings)
    await expect(
      fetchWorkflowResults(octokit, workflowContext, 0, 1)
    ).resolves.not.toThrow()
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
      const result = toWorkflowJob(mockJobResponse as never, 'workflow_run')
      const expected: WorkflowJob = { ...mockJobResponse }

      expect(result).toEqual(expected)
    })

    test('should handle job without steps', () => {
      const jobWithoutSteps = { ...mockJobResponse, steps: null }

      const result = toWorkflowJob(jobWithoutSteps as never, 'workflow_run')
      expect(result).not.toBeNull()
      if (result) {
        expect(result.steps).toEqual([])
      }
    })

    test('should return null when job is not completed', () => {
      const incompleteJob = { ...mockJobResponse, status: 'in_progress' }

      expect(() =>
        toWorkflowJob(incompleteJob as never, 'workflow_run')
      ).toThrow('job.status must be completed on workflow_run event')
    })

    test('should throw error when conclusion is missing', () => {
      const jobWithoutConclusion = { ...mockJobResponse, conclusion: null }

      expect(() =>
        toWorkflowJob(jobWithoutConclusion as never, 'workflow_run')
      ).toThrow('Job conclusion is required')
    })

    test('should throw error when completed_at is missing', () => {
      const jobWithoutCompletedAt = { ...mockJobResponse, completed_at: null }

      expect(() =>
        toWorkflowJob(jobWithoutCompletedAt as never, 'workflow_run')
      ).toThrow('Job completed_at is required')
    })

    test('should throw error when workflow_name is missing', () => {
      const jobWithoutWorkflowName = { ...mockJobResponse, workflow_name: null }

      expect(() =>
        toWorkflowJob(jobWithoutWorkflowName as never, 'workflow_run')
      ).toThrow('Job workflow_name is required for job: test-job (id: 1)')
    })

    test('should handle jobs with different statuses correctly', () => {
      const inProgressJob = { ...mockJobResponse, status: 'in_progress' }
      const queuedJob = { ...mockJobResponse, status: 'queued' }
      const failedJob = {
        ...mockJobResponse,
        status: 'completed',
        conclusion: 'failure'
      }

      expect(toWorkflowJob(inProgressJob as never, 'push')).toBeNull()
      expect(toWorkflowJob(queuedJob as never, 'push')).toBeNull()
      expect(toWorkflowJob(failedJob as never, 'workflow_run')).not.toBeNull()
    })

    test('should include runner information when available', () => {
      const jobWithRunner = {
        ...mockJobResponse,
        runner_name: 'ubuntu-latest-runner',
        runner_group_name: 'github-hosted'
      }

      const result = toWorkflowJob(jobWithRunner as never, 'workflow_run')
      expect(result).not.toBeNull()
      if (result) {
        expect(result.runner_name).toBe('ubuntu-latest-runner')
        expect(result.runner_group_name).toBe('github-hosted')
      }
    })

    test('should handle null runner information', () => {
      const jobWithNullRunner = {
        ...mockJobResponse,
        runner_name: null,
        runner_group_name: null
      }

      const result = toWorkflowJob(jobWithNullRunner as never, 'workflow_run')
      expect(result).not.toBeNull()
      if (result) {
        expect(result.runner_name).toBeNull()
        expect(result.runner_group_name).toBeNull()
      }
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
    const expectedWorkflowBase: Workflow = {
      id: 12345,
      name: 'Test Workflow',
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

      expect(result).toEqual(expectedWorkflowBase)
    })

    test('should throw error when name is missing', () => {
      const workflowWithoutName = { ...mockWorkflowResponse, name: null }

      expect(() => toWorkflowRun(workflowWithoutName as never)).toThrow(
        'Workflow run name is required'
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
