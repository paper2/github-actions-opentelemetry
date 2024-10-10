import { describe, test, beforeEach, expect, vi, MockedFunction } from 'vitest'
import { createWorkflowGauges, createJobGauges } from './github.js'
import { WorkflowRun, WorkflowRunJobs } from '../github/index.js'
import { createGauge } from './create-gauge.js'

vi.mock('./create-gauge.js')

const workflowRun = {
  id: 10640837411,
  status: 'completed',
  name: 'Continuous Integration',
  repository: { full_name: 'paper2/github-actions-opentelemetry' },
  created_at: '2024-08-31T00:00:00'
} as WorkflowRun

const workflowFlowRunJobs = [
  {
    created_at: '2024-08-31T00:00:02Z',
    started_at: '2024-08-31T00:00:12Z',
    completed_at: '2024-08-31T00:00:22Z'
  },
  {
    created_at: '2024-08-31T00:00:03Z',
    started_at: '2024-08-31T00:00:13Z',
    completed_at: '2024-08-31T00:00:23Z'
  }
] as WorkflowRunJobs

const mockCreateGauge = createGauge as MockedFunction<typeof createGauge>

describe('createWorkflowGauges', () => {
  beforeEach(() => {
    mockCreateGauge.mockClear()
  })

  test('should create correct gauge', () => {
    createWorkflowGauges(workflowRun, workflowFlowRunJobs)
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      1,
      'cicd.pipeline.queued_duration',
      12,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      2,
      'cicd.pipeline.duration',
      23,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toBeCalledTimes(2)
  })
})

describe('createJobGauges', () => {
  beforeEach(() => {
    mockCreateGauge.mockClear()
  })

  test('should create correct gauge', () => {
    createJobGauges(workflowRun, workflowFlowRunJobs)
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      1,
      'cicd.pipeline.task.duration',
      10,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      2,
      'cicd.pipeline.task.queued_duration',
      10,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toBeCalledTimes(4)
  })

  test('should not create job_queued_duration', () => {
    const workflowFlowRunJobsBiggerCreatedAt = [
      {
        created_at: '2024-08-31T00:00:32Z',
        started_at: '2024-08-31T00:00:12Z',
        completed_at: '2024-08-31T00:00:22Z'
      },
      {
        created_at: '2024-08-31T00:00:33Z',
        started_at: '2024-08-31T00:00:13Z',
        completed_at: '2024-08-31T00:00:23Z'
      }
    ] as WorkflowRunJobs
    createJobGauges(workflowRun, workflowFlowRunJobsBiggerCreatedAt)
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      1,
      'cicd.pipeline.task.duration',
      10,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      2,
      'cicd.pipeline.task.duration',
      10,
      expect.anything(),
      { unit: 's' }
    )
    expect(mockCreateGauge).toBeCalledTimes(2)
  })
})
