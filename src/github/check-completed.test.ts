import { describe, expect, test } from 'vitest'
import { WorkflowResults, WorkflowRun, WorkflowRunJob } from './types.js'
import { checkCompleted } from './check-completed.js'

describe('checkCompleted', () => {
  const createMockWorkflowResults = ({
    workflowRun = {},
    workflowRunJob = {},
    step = {}
  }): WorkflowResults => ({
    workflowRun: {
      id: 111111111,
      status: 'completed',
      name: 'Test Workflow',
      ...workflowRun
    } as WorkflowRun,
    workflowRunJobs: [
      {
        id: 22222222,
        status: 'completed',
        conclusion: 'success',
        completed_at: '2024-11-30T12:00:00Z',
        steps: [
          {
            name: 'step-1',
            status: 'completed',
            started_at: '2024-11-30T11:00:00Z',
            completed_at: '2024-11-30T12:00:00Z'
          },
          {
            name: 'step-2',
            status: 'completed',
            started_at: '2024-11-30T11:00:00Z',
            completed_at: '2024-11-30T12:00:00Z'
          }
        ]
      } as WorkflowRunJob,
      {
        id: 33333333,
        status: 'completed',
        completed_at: '2024-11-30T12:00:00Z',
        conclusion: 'success',
        steps: [
          {
            name: 'step-1',
            status: 'completed',
            started_at: '2024-11-30T11:00:00Z',
            completed_at: '2024-11-30T12:00:00Z',
            ...step
          }
        ],
        ...workflowRunJob
      } as WorkflowRunJob
    ]
  })

  test('returns true when workflow, jobs, and steps are completed', () => {
    const mockData = createMockWorkflowResults({})
    expect(checkCompleted(mockData)).toBe(true)
  })

  describe('check workflow', () => {
    test('returns false when workflowRun.status is not "completed"', () => {
      const mockData = createMockWorkflowResults({
        workflowRun: { status: 'in_progress' }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when workflowRun.name is not defined', () => {
      const mockData = createMockWorkflowResults({
        workflowRun: { name: undefined }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })
  })

  describe('check jobs', () => {
    test('returns false when a job is not completed', () => {
      const mockData = createMockWorkflowResults({
        workflowRunJob: { status: 'in_progress' }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when a job has no completed_at', () => {
      const mockData = createMockWorkflowResults({
        workflowRunJob: { completed_at: undefined }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })
  })

  describe('check steps', () => {
    test('returns false when a job has no steps', () => {
      const mockData = createMockWorkflowResults({
        workflowRunJob: { steps: undefined }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when a step is not completed', () => {
      const mockData = createMockWorkflowResults({
        step: {
          status: 'in_progress'
        }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when a step does not have started_at', () => {
      const mockData = createMockWorkflowResults({
        step: {
          started_at: undefined
        }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when a step does not have completed_at', () => {
      const mockData = createMockWorkflowResults({
        step: {
          completed_at: undefined
        }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })

    test('returns false when a conclusion is not defined', () => {
      const mockData = createMockWorkflowResults({
        workflowRunJob: { conclusion: null }
      })
      expect(checkCompleted(mockData)).toBe(false)
    })
  })
})
