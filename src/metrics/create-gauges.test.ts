import { describe, test, expect, vi } from 'vitest'
import * as opentelemetry from '@opentelemetry/api'
import { createGauge, createJobGauges } from './create-gauges.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { WorkflowRun, WorkflowJob } from '../github/index.js'

interface InMemoryProvider {
  provider: MeterProvider
  exporter: InMemoryMetricExporter
}

const createMeterProvider = (): InMemoryProvider => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)
  const provider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter
      })
    ]
  })
  return { provider, exporter }
}

describe('createGauge', () => {
  test('should create a gauge and observe the value', async () => {
    const { provider, exporter } = createMeterProvider()
    const mockGetMeter = vi
      .spyOn(opentelemetry.metrics, 'getMeter')
      .mockImplementation(name => provider.getMeter(name))
    const attributes = { test1: 'test1', test2: 'test2' }

    createGauge('testGauge', 42, attributes)

    await provider.forceFlush()
    await provider.shutdown()

    expect(mockGetMeter).toHaveBeenCalledExactlyOnceWith(
      'github-actions-metrics'
    )
    expect(exporter.getMetrics()).toMatchObject([
      {
        scopeMetrics: [
          {
            scope: {
              version: '',
              schemaUrl: undefined
            },
            metrics: [
              {
                descriptor: {
                  name: 'testGauge',
                  type: 'GAUGE',
                  description: '',
                  unit: '',
                  valueType: 1,
                  advice: {}
                },
                aggregationTemporality: 0,
                dataPointType: 2,
                dataPoints: [
                  {
                    attributes: { test1: 'test1', test2: 'test2' },
                    value: 42
                  }
                ]
              }
            ]
          }
        ]
      }
    ])
  })
})

describe('createJobGauges', () => {
  const mockWorkflow: WorkflowRun = {
    id: 123,
    name: 'Test Workflow',
    conclusion: 'success',
    created_at: new Date('2023-01-01T00:00:00Z'),
    run_attempt: 1,
    html_url: 'https://github.com/test/repo/actions/runs/123',
    actor: null,
    event: null,
    head_branch: null,
    base_branch: null,
    repository: {
      full_name: 'test-owner/test-repo'
    }
  }

  test('should skip creating JOB_QUEUED_DURATION metric when jobQueuedDuration is negative', () => {
    const { provider, exporter } = createMeterProvider()
    const mockGetMeter = vi
      .spyOn(opentelemetry.metrics, 'getMeter')
      .mockImplementation(name => provider.getMeter(name))

    // Create a job where started_at is before created_at, causing negative duration
    const jobWithNegativeDuration: WorkflowJob = {
      id: 456,
      name: 'Test Job',
      status: 'completed',
      conclusion: 'success',
      created_at: new Date('2023-01-01T00:05:00Z'), // Later time
      started_at: new Date('2023-01-01T00:01:00Z'), // Earlier time - causes negative duration
      completed_at: new Date('2023-01-01T00:10:00Z'),
      workflow_name: 'Test Workflow',
      run_id: 123,
      runner_name: null,
      runner_group_name: null,
      steps: []
    }

    createJobGauges(mockWorkflow, [jobWithNegativeDuration])

    // expect no JOB_QUEUED_DURATION metric to be created
    expect(exporter.getMetrics()).toMatchObject([])

    mockGetMeter.mockRestore()
  })
})
