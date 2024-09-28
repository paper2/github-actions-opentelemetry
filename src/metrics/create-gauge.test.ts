import { describe, test, expect, vi } from 'vitest'
import * as opentelemetry from '@opentelemetry/api'
import { createGauge } from './create-gauge.js'
import {
  InMemoryMetricExporter,
  AggregationTemporality,
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import { calcDiffSec } from '../utils/calc-diff-sec.js'

interface InMemoryProvider {
  provider: MeterProvider
  exporter: InMemoryMetricExporter
}

const createMeterProvider = (): InMemoryProvider => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA)
  const provider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        // exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
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

describe('calcDiffSec', () => {
  test('should calculate the difference in seconds between two dates', () => {
    const date1 = new Date('2023-01-01T00:00:00Z')
    const date2 = new Date('2023-01-01T00:00:10Z')

    const diff = calcDiffSec(date2, date1)

    expect(diff).toBe(10)
  })

  test('should return a positive value if the first date is earlier', () => {
    const date1 = new Date('2023-01-01T00:00:00Z')
    const date2 = new Date('2023-01-01T00:00:10Z')

    const diff = calcDiffSec(date1, date2)

    expect(diff).toBe(10)
  })
})
