import { describe, test, expect, vi, beforeEach } from 'vitest'
import { WorkflowRun, WorkflowRunJobs } from './github/index.js'
import { run } from './main.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base'
import * as instrumentation from './instrumentation/instrumentation.js'

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
      status: 'completed',
      steps: [
        {
          name: 'step1',
          started_at: '2024-09-01T00:05:10Z',
          completed_at: '2024-09-01T00:05:20Z',
          conclusion: 'success'
        },
        {
          name: 'step2',
          started_at: '2024-09-01T00:05:30Z',
          completed_at: '2024-09-01T00:05:35',
          conclusion: 'success'
        },
        {
          name: 'step3',
          started_at: '2024-09-01T00:05:40',
          completed_at: '2024-09-01T00:05:50',
          conclusion: 'success'
        }
      ]
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
    // TODO: create util
    // disable global providers for test
    opentelemetry.metrics.disable()
    opentelemetry.trace.disable()
    opentelemetry.diag.disable()
    opentelemetry.context.disable()
    opentelemetry.propagation.disable()
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
    const metrics = exporter.getMetrics()[0].scopeMetrics[0].metrics
    expect(metrics).toHaveLength(4)
    expect(metrics).toMatchObject([
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
    ])
  })

  // TODO: Separate by test perspective
  test('should run successfully by using in memory trace exporter', async () => {
    const exporter = new InMemorySpanExporter()
    // InMemorySpanExporter can not get data after shutdown.
    // therefor mocking shutdown.
    vi.spyOn(instrumentation, 'shutdown').mockResolvedValue(undefined)
    await expect(run(undefined, exporter)).rejects.toThrow(
      'process.exit unexpectedly called with "0"' // 0 is success
    )

    const spans = exporter.getFinishedSpans().map(span => ({
      attributes: span.attributes,
      endTime: span.endTime,
      _duration: span.duration,
      name: span.name,
      parentSpanId: span.parentSpanId,
      startTime: span.startTime,
      resource: {
        attributes: span.resource.attributes
      },
      instrumentationLibrary: {
        name: span.instrumentationLibrary.name
      }
    }))

    expect(spans).toHaveLength(7)
    expect(spans).toMatchObject([
      {
        attributes: {},
        endTime: [1725149400, 0],
        _duration: [600, 0],
        name: 'Send Telemetry after Other Workflow',
        // Check Root Span
        parentSpanId: undefined,
        startTime: [1725148800, 0],
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        }
      },
      {
        _duration: [480, 0],
        attributes: {},
        endTime: [1725149400, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'Run Github Actions OpenTelemetry with time of waiting runner',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        startTime: [1725148920, 0]
      },
      {
        _duration: [180, 0],
        attributes: {},
        endTime: [1725149100, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'Wait Runner',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        startTime: [1725148920, 0]
      },
      {
        _duration: [300, 0],
        attributes: {},
        endTime: [1725149400, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'Run Github Actions OpenTelemetry',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        startTime: [1725149100, 0]
      },
      {
        _duration: [10, 0],
        attributes: {},
        endTime: [1725149120, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'step1',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        startTime: [1725149110, 0]
      },
      {
        _duration: [5, 0],
        attributes: {},
        endTime: [1725149135, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'step2',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        },
        startTime: [1725149130, 0]
      },
      {
        _duration: [10, 0],
        attributes: {},
        startTime: [1725149140, 0],
        endTime: [1725149150, 0],
        instrumentationLibrary: {
          name: 'github-actions-opentelemetry-github'
        },
        name: 'step3',
        resource: {
          attributes: {
            'service.name': 'github-actions-opentelemetry',
            'telemetry.sdk.language': 'nodejs',
            'telemetry.sdk.name': 'opentelemetry'
          }
        }
      }
    ])
    vi.restoreAllMocks()
  })
})
