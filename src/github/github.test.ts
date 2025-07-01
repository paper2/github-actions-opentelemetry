import { describe, test, expect, vi } from 'vitest'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import {
  fetchWorkflowResults,
  getLatestCompletedAt,
  getWorkflowContext,
  createOctokitClient
} from './github.js'
import { toWorkflowJob, toWorkflowRun, WorkflowJob, Workflow } from './types.js'
import { ApplicationSettings, settings } from '../settings.js'

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

  test('should handle fetchWorkflowResults error and retry', async () => {
    // Create a mock Octokit that fails
    const mockOctokit = {
      rest: {
        actions: {
          getWorkflowRunAttempt: async () => {
            throw new Error('API Error')
          },
          listJobsForWorkflowRun: async () => {
            throw new Error('API Error')
          }
        }
      }
    } as unknown as Octokit

    const workflowContext = getWorkflowContext(github.context, settings)

    await expect(
      fetchWorkflowResults(mockOctokit, workflowContext, 0, 3)
    ).rejects.toThrow('API Error')
  })

  test('should handle no completed jobs found error', async () => {
    // Create a mock Octokit that returns workflow but no completed jobs
    const mockOctokit = {
      rest: {
        actions: {
          getWorkflowRunAttempt: async () => ({
            data: {
              id: 12345,
              name: 'Test Workflow',
              status: 'completed',
              conclusion: 'success',
              created_at: '2023-01-01T00:00:00Z',
              run_attempt: 1,
              html_url: 'https://github.com/test/repo/actions/runs/12345',
              repository: {
                full_name: 'test-owner/test-repo'
              },
              event: 'push'
            }
          }),
          listJobsForWorkflowRun: async () => ({
            data: {
              jobs: [
                // Return jobs that will be filtered out (not completed)
                {
                  id: 1,
                  name: 'test-job',
                  status: 'in_progress',
                  conclusion: null,
                  created_at: '2023-01-01T00:00:00Z',
                  started_at: '2023-01-01T00:01:00Z',
                  completed_at: null,
                  workflow_name: 'Test Workflow',
                  run_id: 12345,
                  steps: []
                }
              ]
            }
          })
        }
      }
    } as unknown as Octokit

    const workflowContext = getWorkflowContext(github.context, settings)

    await expect(
      fetchWorkflowResults(mockOctokit, workflowContext, 0, 1)
    ).rejects.toThrow('no completed jobs found for workflow run.')
  })

  test('should filter incomplete jobs and process completed ones for non-workflow_run events', async () => {
    // Create a mock Octokit that returns workflow with mixed job statuses
    const mockOctokit = {
      rest: {
        actions: {
          getWorkflowRunAttempt: async () => ({
            data: {
              id: 12345,
              name: 'Test Workflow',
              status: 'in_progress',
              conclusion: null,
              created_at: '2023-01-01T00:00:00Z',
              run_attempt: 1,
              html_url: 'https://github.com/test/repo/actions/runs/12345',
              repository: {
                full_name: 'test-owner/test-repo'
              },
              event: 'push'
            }
          }),
          listJobsForWorkflowRun: async () => ({
            data: {
              jobs: [
                // Completed job - should be included
                {
                  id: 1,
                  name: 'completed-job',
                  status: 'completed',
                  conclusion: 'success',
                  created_at: '2023-01-01T00:00:00Z',
                  started_at: '2023-01-01T00:01:00Z',
                  completed_at: '2023-01-01T00:05:00Z',
                  workflow_name: 'Test Workflow',
                  run_id: 12345,
                  steps: []
                },
                // In-progress job - should be filtered out
                {
                  id: 2,
                  name: 'in-progress-job',
                  status: 'in_progress',
                  conclusion: null,
                  created_at: '2023-01-01T00:00:00Z',
                  started_at: '2023-01-01T00:01:00Z',
                  completed_at: null,
                  workflow_name: 'Test Workflow',
                  run_id: 12345,
                  steps: []
                },
                // Queued job - should be filtered out
                {
                  id: 3,
                  name: 'queued-job',
                  status: 'queued',
                  conclusion: null,
                  created_at: '2023-01-01T00:00:00Z',
                  started_at: null,
                  completed_at: null,
                  workflow_name: 'Test Workflow',
                  run_id: 12345,
                  steps: []
                }
              ]
            }
          })
        }
      }
    } as unknown as Octokit

    const workflowContext = getWorkflowContext(github.context, settings)

    const result = await fetchWorkflowResults(
      mockOctokit,
      workflowContext,
      0,
      1
    )

    // Should only include the completed job
    expect(result.workflowJobs).toHaveLength(1)
    expect(result.workflowJobs[0].name).toBe('completed-job')
    expect(result.workflowJobs[0].status).toBe('completed')
    expect(result.workflow.name).toBe('Test Workflow')
  })
})

describe('getWorkflowContext', () => {
  test('should handle workflow_run event with payload', () => {
    const mockContext = {
      eventName: 'workflow_run',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      payload: {
        workflow_run: {
          id: 67890,
          run_attempt: 3
        }
      }
    }

    const mockSettings = {
      owner: null,
      repository: null,
      workflowRunId: null
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result).toEqual({
      owner: 'test-owner',
      repo: 'test-repo',
      attempt_number: 3,
      runId: 67890
    })
  })

  test('should handle workflow_run event with missing run_attempt', () => {
    const mockContext = {
      eventName: 'workflow_run',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      payload: {
        workflow_run: {
          id: 67890,
          run_attempt: undefined
        }
      }
    }

    const mockSettings = {
      owner: null,
      repository: null,
      workflowRunId: null
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result.attempt_number).toBe(1)
  })

  test('should handle workflow_run event with settings override', () => {
    const mockContext = {
      eventName: 'workflow_run',
      repo: {
        owner: 'original-owner',
        repo: 'original-repo'
      },
      payload: {
        workflow_run: {
          id: 67890,
          run_attempt: 2
        }
      }
    }

    const mockSettings = {
      owner: 'override-owner',
      repository: 'override-repo',
      workflowRunId: 99999
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result).toEqual({
      owner: 'override-owner',
      repo: 'override-repo',
      attempt_number: 2,
      runId: 99999
    })
  })

  test('should handle push event', () => {
    const mockContext = {
      eventName: 'push',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      runId: 12345,
      runAttempt: 2
    }

    const mockSettings = {
      owner: null,
      repository: null,
      workflowRunId: null
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result).toEqual({
      owner: 'test-owner',
      repo: 'test-repo',
      attempt_number: 2,
      runId: 12345
    })
  })

  test('should handle pull_request event', () => {
    const mockContext = {
      eventName: 'pull_request',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      runId: 54321,
      runAttempt: 3
    }

    const mockSettings = {
      owner: null,
      repository: null,
      workflowRunId: null
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result).toEqual({
      owner: 'test-owner',
      repo: 'test-repo',
      attempt_number: 3,
      runId: 54321
    })
  })

  test('should use default attempt_number for non-workflow_run events when runAttempt is missing', () => {
    const mockContext = {
      eventName: 'push',
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      runId: 12345,
      runAttempt: undefined
    }

    const mockSettings = {
      owner: null,
      repository: null,
      workflowRunId: null
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result.attempt_number).toBe(1)
  })

  test('should handle settings override for non-workflow_run events', () => {
    const mockContext = {
      eventName: 'push',
      repo: {
        owner: 'original-owner',
        repo: 'original-repo'
      },
      runId: 12345,
      runAttempt: 1
    }

    const mockSettings = {
      owner: 'override-owner',
      repository: 'override-repo',
      workflowRunId: 99999
    } as unknown as ApplicationSettings

    const result = getWorkflowContext(mockContext as never, mockSettings)

    expect(result).toEqual({
      owner: 'override-owner',
      repo: 'override-repo',
      attempt_number: 1,
      runId: 99999
    })
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

    test('should skip incomplete jobs for push events', () => {
      const incompleteJob = {
        ...mockJobResponse,
        status: 'in_progress',
        conclusion: null,
        completed_at: null
      }

      const result = toWorkflowJob(incompleteJob as never, 'push')
      expect(result).toBeNull()
    })

    test('should skip incomplete jobs for pull_request events', () => {
      const incompleteJob = {
        ...mockJobResponse,
        status: 'queued',
        conclusion: null,
        completed_at: null
      }

      const result = toWorkflowJob(incompleteJob as never, 'pull_request')
      expect(result).toBeNull()
    })

    test('should log warning for skipped incomplete jobs', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const incompleteJob = {
        ...mockJobResponse,
        status: 'in_progress',
        conclusion: null,
        completed_at: null
      }

      const result = toWorkflowJob(incompleteJob as never, 'push')

      expect(result).toBeNull()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Skipping incomplete job: test-job (status: in_progress)'
      )

      consoleLogSpy.mockRestore()
    })

    test('should process completed jobs for non-workflow_run events', () => {
      const result = toWorkflowJob(mockJobResponse as never, 'push')
      expect(result).not.toBeNull()
      expect(result).toEqual(mockJobResponse)
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

    test('should handle in-progress workflows for non-workflow_run events', () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})

      const inProgressWorkflow = {
        ...mockWorkflowResponse,
        status: 'in_progress',
        event: 'push'
      }

      const result = toWorkflowRun(inProgressWorkflow as never)

      expect(result).toEqual(expectedWorkflowBase)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Processing in-progress workflow: 12345'
      )

      consoleLogSpy.mockRestore()
    })

    test('should throw error for in-progress workflow_run events', () => {
      const inProgressWorkflowRun = {
        ...mockWorkflowResponse,
        status: 'in_progress',
        event: 'workflow_run'
      }

      expect(() => toWorkflowRun(inProgressWorkflowRun as never)).toThrow(
        'workflow status must be completed on workflow_run event'
      )
    })

    test('should handle completed workflows for non-workflow_run events', () => {
      const pushWorkflow = {
        ...mockWorkflowResponse,
        event: 'push'
      }

      const result = toWorkflowRun(pushWorkflow as never)
      expect(result).toEqual(expectedWorkflowBase)
    })

    test('should throw error when conclusion is null', () => {
      const workflowWithoutConclusion = {
        ...mockWorkflowResponse,
        conclusion: null,
        event: 'workflow_run'
      }

      expect(() => toWorkflowRun(workflowWithoutConclusion as never)).toThrow(
        `workflow status must be completed on workflow_run event`
      )
    })
  })
})
