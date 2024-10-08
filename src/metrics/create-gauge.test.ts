import { describe, test, expect, vi } from 'vitest'
import * as opentelemetry from '@opentelemetry/api'
import { createGauge } from './create-gauge.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'

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

    expect(mockGetMeter).toHaveBeenCalledOnce()
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
                  type: 'OBSERVABLE_GAUGE',
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
