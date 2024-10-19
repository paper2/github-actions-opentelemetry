import { describe, test, expect, beforeEach } from 'vitest'
import { initialize, forceFlush } from './instrumentation.js'
import { opentelemetryAllDisable } from '../utils/opentelemetry-all-disable.js'

describe('initialize', () => {
  beforeEach(() => {
    opentelemetryAllDisable()
  })
  test('should initialize successfully', () => {
    expect(() => initialize()).not.toThrow()
  })
})
describe('shutdown', () => {
  test('should shutdown be success', async () => {
    await expect(forceFlush()).resolves.not.toThrow()
  })
})
