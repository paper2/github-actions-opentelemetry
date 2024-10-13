import { describe, test, expect, vi, beforeEach } from 'vitest'
import { WorkflowRun, WorkflowRunJobs } from './github/index.js'
import { run } from './main.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
// import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base'

vi.mock(import('./github/index.js'), async importOriginal => {
  // TODO: hoistedしてテストのコードで以下を利用してexpectedを作りたい
  const workflowRun = {
    created_at: '2024-09-01T00:00:00Z',
    status: 'completed',
    id: 10856659171,
    name: 'Send Telemetry after Other Workflow',
    run_number: 14,
    repository: {
      full_name: 'paper2/github-actions-opentelemetry'
    }
  } as WorkflowRun

  const workflowRunJobs = [
    {
      created_at: '2024-09-01T00:02:00Z',
      started_at: '2024-09-01T00:05:00Z',
      completed_at: '2024-09-01T00:10:00Z',
      id: 30131735230,
      name: 'Run Github Actions OpenTelemetry',
      run_id: 10856659171,
      workflow_name: 'Send Telemetry after Other Workflow',
      status: 'completed'
    }
  ] as WorkflowRunJobs

  const mod = await importOriginal()
  return {
    ...mod,
    fetchWorkflowRun: vi.fn().mockResolvedValue(workflowRun),
    fetchWorkflowRunJobs: vi.fn().mockResolvedValue(workflowRunJobs)
  }
})

describe('run', () => {
  beforeEach(() => {
    // disable global providers for test
    opentelemetry.metrics.disable()
    opentelemetry.trace.disable()
  })

  test('should run successfully by using in memory metric exporter', async () => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)
    await expect(run(exporter)).rejects.toThrow(
      'process.exit unexpectedly called with "0"' // 0 is success
    )
    const genMetric = (
      descriptorName: string,
      value: number,
      taskName?: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any => {
      const attributes = {
        'cicd.pipeline.name': 'Send Telemetry after Other Workflow',
        'cicd.pipeline.repository': 'paper2/github-actions-opentelemetry',
        ...(taskName !== undefined && { 'cicd.pipeline.task.name': taskName })
      }

      const descriptor = {
        name: descriptorName,
        type: 'GAUGE',
        unit: 's',
        valueType: 1
      }
      return {
        dataPointType: 2,
        dataPoints: [
          {
            attributes,
            value
          }
        ],
        descriptor
      }
    }
    expect(exporter.getMetrics()).toMatchObject([
      {
        scopeMetrics: [
          {
            metrics: [
              genMetric(
                'cicd.pipeline.task.duration',
                300,
                'Run Github Actions OpenTelemetry'
              ),
              genMetric(
                'cicd.pipeline.task.queued_duration',
                180,
                'Run Github Actions OpenTelemetry'
              ),
              genMetric('cicd.pipeline.queued_duration', 300),
              genMetric('cicd.pipeline.duration', 600)
            ]
          }
        ]
      }
    ])
  })

  // TODO: add trace test
  // test('should run successfully by using in memory trace exporter', async () => {
  //   const exporter = new InMemorySpanExporter()
  //   await expect(run(undefined, exporter)).rejects.toThrow(
  //     'process.exit unexpectedly called with "0"' // 0 is success
  //   )

  //   expect(exporter.getFinishedSpans()).toMatchObject([{}])
  // })
})
