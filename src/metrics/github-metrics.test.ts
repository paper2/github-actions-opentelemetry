import { describe, test, beforeEach, expect, vi, MockedFunction } from 'vitest'
import { createWorkflowGauges, createJobGauges } from './github-metrics.js'
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
      'workflow_queued_duration',
      12,
      expect.anything()
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      2,
      'workflow_duration',
      23,
      expect.anything()
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
      'job_queued_duration',
      10,
      expect.anything()
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      2,
      'job_duration',
      10,
      expect.anything()
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      3,
      'job_queued_duration',
      10,
      expect.anything()
    )
    expect(mockCreateGauge).toHaveBeenNthCalledWith(
      4,
      'job_duration',
      10,
      expect.anything()
    )
    expect(mockCreateGauge).toBeCalledTimes(4)
  })
})
