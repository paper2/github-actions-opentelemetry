import {
  describe,
  test,
  expect,
  vi,
  afterEach,
  beforeEach,
  MockInstance
} from 'vitest'
import { WorkflowRun, WorkflowRunJobs } from './github/index.js'
import { run } from './main.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
import {
  InMemorySpanExporter,
  ReadableSpan
} from '@opentelemetry/sdk-trace-base'
import * as instrumentation from './instrumentation/instrumentation.js'

const { workflowRun, workflowRunJobs } = vi.hoisted(() => {
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
    } as WorkflowRun,

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
    ] as WorkflowRunJobs
  }
})

vi.mock(import('./github/index.js'), async importOriginal => {
  const mod = await importOriginal()
  return {
    ...mod,
    fetchWorkflowRun: vi.fn().mockResolvedValue(workflowRun),
    fetchWorkflowRunJobs: vi.fn().mockResolvedValue(workflowRunJobs)
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

  // describe('should export expected metrics', () => {
  //   test('should run successfully by using in memory metric exporter', async () => {
  //     const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)
  //     await expect(run(exporter)).rejects.toThrow(
  //       'process.exit unexpectedly called with "0"' // 0 is success
  //     )
  //     const genMetric = (
  //       descriptorName: string,
  //       value: number,
  //       taskName?: string
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     ): any => {
  //       const attributes = {
  //         'cicd.pipeline.name': 'Test Run',
  //         'cicd.pipeline.repository': 'paper2/github-actions-opentelemetry',
  //         ...(taskName !== undefined && { 'cicd.pipeline.task.name': taskName })
  //       }
  //       const descriptor = {
  //         name: descriptorName,
  //         type: 'GAUGE',
  //         unit: 's',
  //         valueType: 1
  //       }
  //       return {
  //         dataPointType: 2,
  //         dataPoints: [
  //           {
  //             attributes,
  //             value
  //           }
  //         ],
  //         descriptor
  //       }
  //     }
  //     const metrics = exporter.getMetrics()[0].scopeMetrics[0].metrics
  //     expect(metrics).toHaveLength(4)
  //     expect(metrics).toMatchObject([
  //       genMetric('cicd.pipeline.task.duration', 300, 'job1'),
  //       genMetric('cicd.pipeline.task.queued_duration', 180, 'job1'),
  //       genMetric('cicd.pipeline.queued_duration', 300),
  //       genMetric('cicd.pipeline.duration', 600)
  //     ])
  //   })
  // })

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
