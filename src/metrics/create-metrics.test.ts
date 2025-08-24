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
import { fail } from 'assert'
import settings from '../settings.js'

const workflowRunResults: WorkflowResults = {
  workflow: {
    created_at: new Date('2024-09-01T00:00:00Z'),
    id: 10000000000,
    name: 'Test Run',
    run_attempt: 14,
    conclusion: 'success',
    repository: {
      full_name: 'paper2/github-actions-opentelemetry'
    },
    html_url: 'http://example.com/workflow_run'
  },
  workflowJobs: [
    {
      created_at: new Date('2024-09-01T00:02:00Z'),
      started_at: new Date('2024-09-01T00:05:00Z'),
      completed_at: new Date('2024-09-01T00:10:00Z'),
      conclusion: 'success',
      id: 30000000000,
      name: 'job1',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step1_1',
          started_at: new Date('2024-09-01T00:05:10Z'),
          completed_at: new Date('2024-09-01T00:05:20Z'),
          conclusion: 'success'
        },
        {
          name: 'step1_2',
          started_at: new Date('2024-09-01T00:05:30Z'),
          completed_at: new Date('2024-09-01T00:05:35Z'),
          conclusion: 'success'
        },
        {
          name: 'step1_3',
          started_at: new Date('2024-09-01T00:05:40Z'),
          completed_at: new Date('2024-09-01T00:05:50Z'),
          conclusion: 'success'
        }
      ],
      runner_name: null,
      runner_group_name: null
    },
    {
      created_at: new Date('2024-09-01T00:12:00Z'),
      started_at: new Date('2024-09-01T00:15:00Z'),
      completed_at: new Date('2024-09-01T00:20:00Z'),
      conclusion: 'failure',
      id: 30000000001,
      name: 'job2',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step2_1',
          started_at: new Date('2024-09-01T00:15:10Z'),
          completed_at: new Date('2024-09-01T00:15:20Z'),
          conclusion: 'success'
        },
        {
          name: 'step2_2',
          started_at: new Date('2024-09-01T00:15:30Z'),
          completed_at: new Date('2024-09-01T00:15:35Z'),
          conclusion: 'success'
        },
        {
          name: 'step2_3',
          started_at: new Date('2024-09-01T00:15:40Z'),
          completed_at: new Date('2024-09-01T00:15:50Z'),
          conclusion: 'failure'
        }
      ],
      runner_name: null,
      runner_group_name: null
    }
  ]
}
const { workflow: workflowRun, workflowJobs: workflowRunJobs } =
  workflowRunResults

describe('should export expected metrics', () => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)

  beforeEach(() => {
    exporter.reset()
    settings.FeatureFlagMetrics = true
    initialize(exporter)
  })

  afterEach(async () => {
    opentelemetryAllDisable()
  })

  test(`should verify ${dn.JOB_DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.JOB_DURATION)
    const dataPoints = metric.dataPoints.map(dataPoint => ({
      taskName: dataPoint.attributes[ak.JOB_NAME],
      value: dataPoint.value
    }))

    expect(dataPoints).toHaveLength(workflowRunJobs.length)
    for (const job of workflowRunJobs) {
      if (!job.completed_at) fail()
      expect(dataPoints).toContainEqual({
        taskName: job.name,
        value: calcDiffSec(job.started_at, job.completed_at)
      })
    }
  })

  test(`should verify ${dn.WORKFLOW_DURATION}`, async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.WORKFLOW_DURATION)

    expect(metric.dataPoints).toHaveLength(1)
    if (!workflowRunJobs[1].completed_at) fail()
    expect(metric.dataPoints[0].value).toEqual(
      calcDiffSec(
        workflowRun.created_at,
        workflowRunJobs[1].completed_at // last job's complete_at
      )
    )
  })

  test('should not export metrics when disable FeatureFlagMetrics', async () => {
    settings.FeatureFlagMetrics = false
    await createMetrics(workflowRunResults)
    await forceFlush()
    expect(exporter.getMetrics()).toHaveLength(0)
    settings.FeatureFlagMetrics = true
  })

  test(`should throw error when createMetrics fails`, async () => {
    settings.FeatureFlagMetrics = true
    const brokenResults = {} as WorkflowResults
    await expect(createMetrics(brokenResults)).rejects.toThrow()
  })
})

describe('should export expected attributes', () => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)

  beforeEach(() => {
    exporter.reset()
    settings.FeatureFlagMetrics = true
    initialize(exporter)
  })

  afterEach(async () => {
    opentelemetryAllDisable()
  })

  test('should export workflow name', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metricWorkflow = findMetricByDescriptorName(
      exporter,
      dn.WORKFLOW_DURATION
    )
    const metricJob = findMetricByDescriptorName(exporter, dn.JOB_DURATION)

    expect(metricWorkflow.dataPoints).toHaveLength(1)
    expect(metricWorkflow.dataPoints[0].attributes[ak.WORKFLOW_NAME]).toEqual(
      workflowRun.name
    )
    expect(metricJob.dataPoints).toHaveLength(2)
    for (const point of metricJob.dataPoints) {
      expect(point.attributes[ak.WORKFLOW_NAME]).toEqual(workflowRun.name)
    }
  })

  test('should export repository name', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metricWorkflow = findMetricByDescriptorName(
      exporter,
      dn.WORKFLOW_DURATION
    )
    const metricJob = findMetricByDescriptorName(exporter, dn.JOB_DURATION)

    expect(metricWorkflow.dataPoints).toHaveLength(1)
    expect(metricWorkflow.dataPoints[0].attributes[ak.REPOSITORY]).toEqual(
      workflowRun.repository.full_name
    )
    expect(metricJob.dataPoints).toHaveLength(2)
    for (const point of metricJob.dataPoints) {
      expect(point.attributes[ak.REPOSITORY]).toEqual(
        workflowRun.repository.full_name
      )
    }
  })

  test('should export job name in job metrics', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.JOB_DURATION)

    expect(metric.dataPoints).toHaveLength(2)
    for (const point of metric.dataPoints) {
      expect(point.attributes[ak.JOB_NAME]).toMatch(/job[1-2]/)
    }
  })

  test('should not export job name in workflow metrics', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.WORKFLOW_DURATION)

    expect(metric.dataPoints).toHaveLength(1)
    expect(metric.dataPoints[0].attributes[ak.JOB_NAME]).toBeUndefined()
  })

  test('should export job conclusion in job metrics', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.JOB_DURATION)

    expect(metric.dataPoints).toHaveLength(2)
    expect(metric.dataPoints[0].attributes[ak.JOB_CONCLUSION]).toEqual(
      'success'
    )
    expect(metric.dataPoints[1].attributes[ak.JOB_CONCLUSION]).toEqual(
      'failure'
    )
  })

  test('should not export job conclusion in workflow metrics', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()
    const metric = findMetricByDescriptorName(exporter, dn.WORKFLOW_DURATION)

    expect(metric.dataPoints).toHaveLength(1)
    expect(metric.dataPoints[0].attributes[ak.JOB_CONCLUSION]).toBeUndefined()
  })

  test('should verify resource attributes', async () => {
    await createMetrics(workflowRunResults)
    await forceFlush()

    const metrics = exporter.getMetrics()
    expect(metrics).toHaveLength(1)

    const resourceAttributes = metrics[0].resource.attributes
    // NOTE: Resource attributes are defined in vitest.config.ts
    expect(resourceAttributes).toMatchObject({
      'service.name': 'github-actions-opentelemetry',
      'test.attribute': 'example',
      'test.attribute2': 'example2'
    })
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
