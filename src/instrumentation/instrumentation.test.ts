import { describe, test, expect, beforeEach } from 'vitest'
import { initialize, shutdown } from './instrumentation.js'
import * as opentelemetry from '@opentelemetry/api'

describe('initialize', () => {
  beforeEach(() => {
    // disable global providers for test
    opentelemetry.metrics.disable()
    opentelemetry.trace.disable()
    opentelemetry.diag.disable()
    opentelemetry.context.disable()
    opentelemetry.propagation.disable()
  })
  test('should initialize successfully', () => {
    expect(() => initialize()).not.toThrow()
  })
})
describe('shutdown', () => {
  test('should shutdown be success', async () => {
    await expect(shutdown()).resolves.not.toThrow()
  })
})
