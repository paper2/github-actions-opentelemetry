import * as opentelemetry from '@opentelemetry/api'
import { createExporter, createProvider } from './create-provider.js'
import { MeterProvider } from '@opentelemetry/sdk-metrics'
import settings from '../settings.js'

if (settings.logLevel === 'debug') {
  opentelemetry.diag.setLogger(
    new opentelemetry.DiagConsoleLogger(),
    opentelemetry.DiagLogLevel.DEBUG
  )
}

export const setupMeterProvider = (): MeterProvider => {
  const exporter = createExporter()
  const provider = createProvider(exporter)
  const result = opentelemetry.metrics.setGlobalMeterProvider(provider)
  if (!result) {
    console.warn('Global meter provider can not be set.')
  }
  return provider
}

export const shutdown = async (provider: MeterProvider): Promise<void> => {
  try {
    await provider.forceFlush()
    await provider.shutdown()
  } catch (error) {
    console.log('Error terminating MetricProvider', error)
    process.exit(1)
  }
  process.exit(0)
}
