import { describe, test, expect } from 'vitest'
import { createExporter } from './create-provider.js'
import { PushMetricExporter } from '@opentelemetry/sdk-metrics'

describe('createExporter', () => {
  test('should conform to an PushMetricExporter', () => {
    const exporter: PushMetricExporter = createExporter()
    expect(exporter).toBeDefined()
  })
})
