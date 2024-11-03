import { vi, describe, test, expect, beforeEach, MockedFunction } from 'vitest'
import { run } from './main.js'
import { forceFlush } from './instrumentation/index.js'
import { createMetrics } from './metrics/index.js'
import { createTrace } from './traces/index.js'

// These mocked modules should be tested on each modules.
vi.mock('./github/index.js')
vi.mock('./traces/index.js')
vi.mock('./instrumentation/index.js')
vi.mock('./metrics/index.js')

describe('run function', () => {
  const createMetricsMock = createMetrics as MockedFunction<
    typeof createMetrics
  >
  const forceFlushMock = forceFlush as MockedFunction<typeof forceFlush>
  const createTraceMock = createTrace as MockedFunction<typeof createTrace>

  beforeEach(() => {
    createMetricsMock.mockClear()
    createTraceMock.mockClear()
    forceFlushMock.mockClear()
  })

  describe('should exit with expected code', () => {
    test('should exit with 0 when succeed', async () => {
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "0"'
      )
    })
    test('should exit with 1 when createTrace failed', async () => {
      createTraceMock.mockRejectedValueOnce(new Error('createTrace failed'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
    test('should exit with 1 when createMetrics failed', async () => {
      createMetricsMock.mockRejectedValueOnce(new Error('createMetrics failed'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
    test('should exit with 1 when forceFlush failed', async () => {
      forceFlushMock.mockRejectedValueOnce(new Error('forceFlush failed'))
      await expect(run()).rejects.toThrowError(
        'process.exit unexpectedly called with "1"'
      )
    })
  })

  describe('should call forceFlush once', () => {
    test('should call forceFlush once successfully', async () => {
      await expect(run()).rejects.toThrow()
      expect(forceFlushMock).toHaveBeenCalledOnce()
    })
    test('should call forceFlush once when createMetrics fails', async () => {
      createMetricsMock.mockRejectedValueOnce(new Error('createMetrics failed'))
      await expect(run()).rejects.toThrow()

      expect(createMetricsMock).toHaveBeenCalledOnce()
      expect(forceFlushMock).toHaveBeenCalledOnce()
    })
    test('should call forceFlush once when createTrace fails', async () => {
      createTraceMock.mockRejectedValueOnce(new Error('createTrace failed'))
      await expect(run()).rejects.toThrow()

      expect(createTraceMock).toHaveBeenCalledOnce()
      expect(forceFlushMock).toHaveBeenCalledOnce()
    })
  })
})
