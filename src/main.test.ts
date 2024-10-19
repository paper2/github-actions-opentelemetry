/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  describe,
  test,
  expect,
  vi,
  afterEach,
  beforeEach,
  MockInstance
} from 'vitest'
import { fetchWorkflowResults, WorkflowResults } from './github/index.js'
import { run } from './main.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MetricData
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
import {
  InMemorySpanExporter,
  ReadableSpan
} from '@opentelemetry/sdk-trace-base'
import * as instrumentation from './instrumentation/index.js'
import { calcDiffSec } from './utils/calc-diff-sec.js'

const workflowRunResults = vi.hoisted(() => {
  return {
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
})
const { workflowRun, workflowRunJobs } = workflowRunResults

vi.mock(import('./github/index.js'), async importOriginal => {
  const mod = await importOriginal()
  return {
    ...mod,
    fetchWorkflowResults: vi
      .fn<typeof fetchWorkflowResults>()
      .mockResolvedValue(workflowRunResults)
  }
})

describe('run', () => {
  beforeEach(() => {
    // TODO: create util
    // disable global providers for test
    opentelemetry.metrics.disable()
    opentelemetry.trace.disable()
    opentelemetry.diag.disable()
    opentelemetry.context.disable()
    opentelemetry.propagation.disable()
  })

  describe('should export expected metrics', () => {
    let exporter: InMemoryMetricExporter
    // TODO: testじゃなくてコード上で定義したい
    const descriptorNames = {
      TASK_DURATION: 'cicd.pipeline.task.duration',
      TASK_QUEUED_DURATION: 'cicd.pipeline.task.queued_duration',
      PIPELINE_DURATION: 'cicd.pipeline.duration',
      PIPELINE_QUEUED_DURATION: 'cicd.pipeline.queued_duration'
    }

    beforeEach(() => {
      // new instance because exporter.reset() is not work well.
      exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)
    })

    test('should export expected descriptor name only', async () => {
      await expect(run(exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const expectedDescriptorNames = Object.values(descriptorNames)

      const metrics = exporter.getMetrics()[0].scopeMetrics[0].metrics
      for (const metric of metrics) {
        expect(expectedDescriptorNames).toContain(metric.descriptor.name)
      }
    })

    test('should verify cicd.pipeline.task.duration', async () => {
      await expect(run(exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const metric = findMetricByDescriptorName(
        exporter,
        descriptorNames.TASK_DURATION
      )
      const dataPoints = metric.dataPoints.map(dataPoint => ({
        taskName: dataPoint.attributes['cicd.pipeline.task.name'],
        value: dataPoint.value
      }))

      for (const job of workflowRunJobs) {
        expect(dataPoints).toContainEqual({
          taskName: job.name,
          value: calcDiffSec(
            new Date(job.started_at),
            new Date(job.completed_at!)
          )
        })
      }
      expect(dataPoints).toHaveLength(workflowRunJobs.length)
    })

    test('should verify cicd.pipeline.task.queued_duration', async () => {
      await expect(run(exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const metric = findMetricByDescriptorName(
        exporter,
        descriptorNames.TASK_QUEUED_DURATION
      )

      const dataPoints = metric.dataPoints.map(dataPoint => ({
        taskName: dataPoint.attributes['cicd.pipeline.task.name'],
        value: dataPoint.value
      }))

      for (const job of workflowRunJobs) {
        expect(dataPoints).toContainEqual({
          taskName: job.name,
          value: calcDiffSec(new Date(job.created_at), new Date(job.started_at))
        })
      }
      expect(dataPoints).toHaveLength(workflowRunJobs.length)
    })

    test('should verify cicd.pipeline.duration', async () => {
      await expect(run(exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const metric = findMetricByDescriptorName(
        exporter,
        descriptorNames.PIPELINE_DURATION
      )

      expect(metric.dataPoints).toHaveLength(1)
      expect(metric.dataPoints[0].value).toEqual(
        calcDiffSec(
          new Date(workflowRun.created_at),
          new Date(workflowRunJobs[1].completed_at!) // last job's complete_at
        )
      )
    })

    test('should verify cicd.pipeline.queued_duration', async () => {
      await expect(run(exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const metric = findMetricByDescriptorName(
        exporter,
        descriptorNames.PIPELINE_QUEUED_DURATION
      )

      expect(metric.dataPoints).toHaveLength(1)
      expect(metric.dataPoints[0].value).toEqual(
        calcDiffSec(
          new Date(workflowRun.created_at),
          new Date(workflowRunJobs[0].started_at)
        )
      )
    })
  })

  describe('should export expected spans', () => {
    const exporter = new InMemorySpanExporter()

    // InMemorySpanExporter can not get data after shutdown.
    // therefor mocking shutdown.
    let mockShutdown: MockInstance

    beforeEach(() => {
      exporter.reset()
      mockShutdown = vi.spyOn(instrumentation, 'shutdown')
      mockShutdown.mockResolvedValue(undefined)
    })

    afterEach(() => {
      mockShutdown.mockRestore()
    })

    test('should verify startTime and endTime', async () => {
      await expect(run(undefined, exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const spans = exporter.getFinishedSpans().map(span => ({
        name: span.name,
        startTime: span.startTime,
        endTime: span.endTime
      }))

      let testedSpanCount = 0

      // workflow span
      expect(spans).toContainEqual({
        name: workflowRun.name,
        startTime: [toEpochSec(workflowRun.created_at), 0],
        endTime: [
          toEpochSec(workflowRunJobs[1].completed_at!), // last job's completed_at
          0
        ]
      })
      testedSpanCount++

      // jobs span
      workflowRunJobs.map(job => {
        expect(spans).toContainEqual({
          name: job.name,
          startTime: [toEpochSec(job.started_at), 0],
          endTime: [toEpochSec(job.completed_at!), 0]
        })
        testedSpanCount++
      })

      // with waiting for a job span
      workflowRunJobs.map(job => {
        expect(spans).toContainEqual({
          name: `${job.name} with time of waiting runner`,
          startTime: [toEpochSec(job.created_at), 0],
          endTime: [toEpochSec(job.completed_at!), 0]
        })
        testedSpanCount++
      })

      // waiting for a job span
      workflowRunJobs.map(job => {
        expect(spans).toContainEqual({
          name: `waiting runner for ${job.name}`,
          startTime: [toEpochSec(job.created_at), 0],
          endTime: [toEpochSec(job.started_at), 0]
        })
        testedSpanCount++
      })

      // steps span
      workflowRunJobs.map(job => {
        job.steps?.map(step => {
          expect(spans).toContainEqual({
            name: step.name,
            startTime: [toEpochSec(step.started_at!), 0],
            endTime: [toEpochSec(step.completed_at!), 0]
          })
          testedSpanCount++
        })
      })

      expect(spans).toHaveLength(testedSpanCount)
      expect(mockShutdown).toHaveBeenCalledOnce()
    })

    test('should export only one root span', async () => {
      await expect(run(undefined, exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )

      const spans = exporter.getFinishedSpans().map(span => ({
        parentSpanId: span.parentSpanId
      }))

      const rootSpanCount = spans.filter(v => {
        return v.parentSpanId === undefined
      })

      expect(rootSpanCount).toHaveLength(1)
      expect(mockShutdown).toHaveBeenCalledOnce()
    })

    test('should verify resource attributes', async () => {
      await expect(run(undefined, exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )

      const spans = exporter.getFinishedSpans().map(span => ({
        resourceAttributes: span.resource.attributes
      }))

      spans.map(span => {
        expect(span.resourceAttributes).toMatchObject({
          'service.name': 'github-actions-opentelemetry'
        })
      })

      expect(mockShutdown).toHaveBeenCalledOnce()
    })

    test('should verify span hierarchy', async () => {
      await expect(run(undefined, exporter)).rejects.toThrow(
        'process.exit unexpectedly called with "0"' // 0 is success
      )
      const spans = exporter.getFinishedSpans()

      const rootSpan = findSpanByName(spans, workflowRun.name!)
      const child1 = findSpanByName(
        spans,
        `${workflowRunJobs[0].name} with time of waiting runner`
      )
      const child1_1 = findSpanByName(
        spans,
        `waiting runner for ${workflowRunJobs[0].name}`
      )
      const child1_2 = findSpanByName(spans, 'job1')
      const child1_2_1 = findSpanByName(spans, 'step1_1')
      const child1_2_2 = findSpanByName(spans, 'step1_2')
      const child1_2_3 = findSpanByName(spans, 'step1_3')
      const child2 = findSpanByName(spans, 'job2 with time of waiting runner')
      const child2_1 = findSpanByName(spans, 'waiting runner for job2')
      const child2_2 = findSpanByName(spans, 'job2')
      const child2_2_1 = findSpanByName(spans, 'step2_1')
      const child2_2_2 = findSpanByName(spans, 'step2_2')
      const child2_2_3 = findSpanByName(spans, 'step2_3')

      const assertionCount =
        [
          assertParentChildRelationship(rootSpan, child1),
          assertParentChildRelationship(child1, child1_1),
          assertParentChildRelationship(child1, child1_2),
          assertParentChildRelationship(child1_2, child1_2_1),
          assertParentChildRelationship(child1_2, child1_2_2),
          assertParentChildRelationship(child1_2, child1_2_3),
          assertParentChildRelationship(rootSpan, child2),
          assertParentChildRelationship(child2, child2_1),
          assertParentChildRelationship(child2, child2_2),
          assertParentChildRelationship(child2_2, child2_2_1),
          assertParentChildRelationship(child2_2, child2_2_2),
          assertParentChildRelationship(child2_2, child2_2_3)
        ].length + 1 // add 1 because rootSpan assertion is not existed.

      expect(spans).toHaveLength(assertionCount)
    })
  })
})

const findMetricByDescriptorName = (
  exporter: InMemoryMetricExporter,
  name: string
): MetricData => {
  const metric = exporter
    .getMetrics()[0]
    .scopeMetrics[0].metrics.find(v => v.descriptor.name === name)
  if (metric === undefined) {
    throw new Error(`${name} descriptor is not found`)
  }
  return metric
}

const toEpochSec = (date: string): number => {
  return Math.floor(new Date(date).getTime() / 1000)
}

const findSpanByName = (spans: ReadableSpan[], name: string): ReadableSpan => {
  const span = spans.find(s => s.name === name)
  if (!span) throw new Error(`${name} is not find in spans.`)
  return span
}

const assertParentChildRelationship = (
  parent: ReadableSpan,
  child: ReadableSpan
): void => {
  expect(child.parentSpanId).toBe(parent.spanContext().spanId)
  expect(child.spanContext().traceId).toBe(parent.spanContext().traceId)
}
