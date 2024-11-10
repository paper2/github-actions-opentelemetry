/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect, afterEach, beforeEach } from 'vitest'
import { WorkflowResults } from '../github/index.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MetricData
} from '@opentelemetry/sdk-metrics'
import { initialize, forceFlush } from '../instrumentation/index.js'
import { calcDiffSec } from '../utils/calc-diff-sec.js'
import { createMetrics } from './create-metrics.js'
import { opentelemetryAllDisable } from '../utils/opentelemetry-all-disable.js'
import { descriptorNames as dn, attributeKeys as ak } from './constants.js'

const workflowRunResults = {
  workflowRun: {
    created_at: '2024-09-01T00:00:00Z',
    status: 'completed',
    id: 10000000000,
    name: 'Test Run',
    run_number: 14,
    repository: {
      full_name: 'paper2/github-actions-opentelemetry'
    }
  },
  workflowRunJobs: [
    {
      created_at: '2024-09-01T00:02:00Z',
      started_at: '2024-09-01T00:05:00Z',
      completed_at: '2024-09-01T00:10:00Z',
      id: 30000000000,
      name: 'job1',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step1_1',
          started_at: '2024-09-01T00:05:10Z',
          completed_at: '2024-09-01T00:05:20Z',
          conclusion: 'success'
        },
        {
          name: 'step1_2',
          started_at: '2024-09-01T00:05:30Z',
          completed_at: '2024-09-01T00:05:35',
          conclusion: 'success'
        },
        {
          name: 'step1_3',
          started_at: '2024-09-01T00:05:40',
          completed_at: '2024-09-01T00:05:50',
          conclusion: 'success'
        }
      ]
    },
    {
      created_at: '2024-09-01T00:12:00Z',
      started_at: '2024-09-01T00:15:00Z',
      completed_at: '2024-09-01T00:20:00Z',
      id: 30000000001,
      name: 'job2',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step2_1',
          started_at: '2024-09-01T00:15:10Z',
          completed_at: '2024-09-01T00:15:20Z',
          conclusion: 'success'
        },
        {
          name: 'step2_2',
          started_at: '2024-09-01T00:15:30Z',
          completed_at: '2024-09-01T00:15:35',
          conclusion: 'success'
        },
        {
          name: 'step2_3',
          started_at: '2024-09-01T00:15:40',
          completed_at: '2024-09-01T00:15:50',
          conclusion: 'success'
        }
      ]
    }
  ]
} as WorkflowResults
const { workflowRun, workflowRunJobs } = workflowRunResults

describe('should export expected metrics', () => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)

  beforeEach(() => {
    exporter.reset()
    initialize(exporter)
  })

  afterEach(async () => {
    opentelemetryAllDisable()
  })

  test(`should verify ${dn.TASK_DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.TASK_DURATION)
    const dataPoints = metric.dataPoints.map(dataPoint => ({
      taskName: dataPoint.attributes[ak.TASK_NAME],
      value: dataPoint.value
    }))

    expect(dataPoints).toHaveLength(workflowRunJobs.length)
    for (const job of workflowRunJobs) {
      expect(dataPoints).toContainEqual({
        taskName: job.name,
        value: calcDiffSec(
          new Date(job.started_at),
          new Date(job.completed_at!)
        )
      })
    }
  })

  test(`should verify ${dn.TASK_QUEUED_DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.TASK_QUEUED_DURATION)

    const dataPoints = metric.dataPoints.map(dataPoint => ({
      taskName: dataPoint.attributes[ak.TASK_NAME],
      value: dataPoint.value
    }))

    expect(dataPoints).toHaveLength(workflowRunJobs.length)
    for (const job of workflowRunJobs) {
      expect(dataPoints).toContainEqual({
        taskName: job.name,
        value: calcDiffSec(new Date(job.created_at), new Date(job.started_at))
      })
    }
  })

  test(`should verify ${dn.DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.DURATION)

    expect(metric.dataPoints).toHaveLength(1)
    expect(metric.dataPoints[0].value).toEqual(
      calcDiffSec(
        new Date(workflowRun.created_at),
        new Date(workflowRunJobs[1].completed_at!) // last job's complete_at
      )
    )
  })

  test(`should verify ${dn.QUEUED_DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.QUEUED_DURATION)

    expect(metric.dataPoints).toHaveLength(1)
    expect(metric.dataPoints[0].value).toEqual(
      calcDiffSec(
        new Date(workflowRun.created_at),
        new Date(workflowRunJobs[0].started_at)
      )
    )
  })
})

const findMetricByDescriptorName = (
  exporter: InMemoryMetricExporter,
  name: string
): MetricData => {
  expect(exporter.getMetrics()).toHaveLength(1)
  expect(exporter.getMetrics()[0].scopeMetrics).toHaveLength(1)
  const metric = exporter
    .getMetrics()[0]
    .scopeMetrics[0].metrics.find(v => v.descriptor.name === name)
  if (metric === undefined) {
    throw new Error(`${name} descriptor is not found`)
  }
  return metric
}
