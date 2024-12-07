import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { initialize, forceFlush, shutdown } from './instrumentation.js'
import { opentelemetryAllDisable } from '../utils/opentelemetry-all-disable.js'
import * as opentelemetry from '@opentelemetry/api'
import settings from '../settings.js'
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base'
import {
  InMemoryMetricExporter,
  AggregationTemporality
} from '@opentelemetry/sdk-metrics'

settings.logeLevel = 'debug' // For testing

describe('initialize', () => {
  beforeEach(() => {
    opentelemetryAllDisable()
  })

  test('should initialize successfully', () => {
    expect(() => initialize()).not.toThrow()
  })
  test('should throw error when multiple initialize', () => {
    expect(() => initialize()).not.toThrow()
    expect(() => initialize()).toThrow(
      'setGlobalMeterProvider failed. please check settings or duplicate registration.'
    )
    opentelemetry.metrics.disable()
    expect(() => initialize()).toThrow(
      'setGlobalTracerProvider failed. please check settings or duplicate registration.'
    )
  })

  describe('initializeMeter', () => {
    const metricsExporter = new InMemoryMetricExporter(
      AggregationTemporality.DELTA
    )
    afterEach(() => {
      settings.FeatureFlagMetrics = true
      metricsExporter.reset()
    })
    test('should export metrics', async () => {
      expect(() => initialize(metricsExporter, undefined)).not.toThrow()
      const meter = opentelemetry.metrics.getMeter('test')
      meter.createCounter('test')
      await expect(forceFlush()).resolves.not.toThrow()
      expect(metricsExporter.getMetrics()).toHaveLength(1)
    })
    test('should not export metrics when disable FeatureFlagMetrics', async () => {
      settings.FeatureFlagMetrics = false
      expect(() => initialize(metricsExporter, undefined)).not.toThrow()
      const meter = opentelemetry.metrics.getMeter('test')
      meter.createCounter('test')
      await expect(forceFlush()).resolves.not.toThrow()
      expect(metricsExporter.getMetrics()).toHaveLength(0)
    })
  })

  describe('initializeTracer', () => {
    const spanExporter = new InMemorySpanExporter()
    afterEach(() => {
      settings.FeatureFlagTrace = true
      spanExporter.reset()
    })

    test('should export trace', async () => {
      expect(() => initialize(undefined, spanExporter)).not.toThrow()
      const tracer = opentelemetry.trace.getTracer('test')
      tracer.startSpan('test').end()
      await expect(forceFlush()).resolves.not.toThrow()
      expect(spanExporter.getFinishedSpans()).toHaveLength(1)
    })
    test('should not export trace when disabled FeatureFlagTrace', async () => {
      settings.FeatureFlagTrace = false
      expect(() => initialize(undefined, spanExporter)).not.toThrow()
      const tracer = opentelemetry.trace.getTracer('test')
      tracer.startSpan('test').end()
      await expect(forceFlush()).resolves.not.toThrow()
      expect(spanExporter.getFinishedSpans()).toHaveLength(0)
    })
  })
})

describe('shutdown', () => {
  beforeEach(() => {
    opentelemetryAllDisable()
  })
  test('forceFlush and shutdown should be success', async () => {
    initialize()
    await expect(forceFlush()).resolves.not.toThrow()
    await expect(shutdown()).resolves.not.toThrow()
  })
})
