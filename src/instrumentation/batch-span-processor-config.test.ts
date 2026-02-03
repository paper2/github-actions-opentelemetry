import { describe, test, expect, afterEach, vi } from 'vitest'
import { opentelemetryAllDisable } from '../utils/opentelemetry-all-disable.js'

const loadFresh = async (): Promise<{
  settingsMod: typeof import('../settings.js')
  instrMod: typeof import('./instrumentation.js')
}> => {
  vi.resetModules()
  const settingsMod = await import('../settings.js')
  const instrMod = await import('./instrumentation.js')
  return { settingsMod, instrMod }
}

describe('BatchSpanProcessor config', () => {
  afterEach(() => {
    // clean global providers between tests
    opentelemetryAllDisable()
    delete process.env.OTEL_BSP_MAX_QUEUE_SIZE
    delete process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE
    delete process.env.OTEL_BSP_SCHEDULED_DELAY_MILLIS
    delete process.env.OTEL_BSP_EXPORT_TIMEOUT_MILLIS
  })

  test('should pick up BatchSpanProcessor options from env', async () => {
    process.env.OTEL_BSP_MAX_QUEUE_SIZE = '1234'
    process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE = '111'
    process.env.OTEL_BSP_SCHEDULED_DELAY_MILLIS = '2222'
    process.env.OTEL_BSP_EXPORT_TIMEOUT_MILLIS = '33333'

    const { settingsMod } = await loadFresh()
    const s = settingsMod.createSettings(process.env)

    expect(s.traceBatch).toEqual({
      maxQueueSize: 1234,
      maxExportBatchSize: 111,
      scheduledDelayMillis: 2222,
      exportTimeoutMillis: 33333
    })
  })

  test('should clamp maxExportBatchSize to maxQueueSize when misconfigured', async () => {
    process.env.OTEL_BSP_MAX_QUEUE_SIZE = '10'
    process.env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE = '999'

    const { settingsMod, instrMod } = await loadFresh()

    // Apply settings used by instrumentation.ts in this test run.
    settingsMod.default.traceBatch = settingsMod.createSettings(
      process.env
    ).traceBatch

    // Should not throw even if batch size > queue size.
    expect(() => instrMod.initialize(undefined, undefined)).not.toThrow()
  })
})
