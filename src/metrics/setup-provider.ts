import * as opentelemetry from '@opentelemetry/api'
import { createExporter, createProvider } from './create-provider.js'
import { MeterProvider } from '@opentelemetry/sdk-metrics'

export const setupMeterProvider = (): MeterProvider => {
  const exporter = createExporter()
  const provider = createProvider(exporter)
  const result = opentelemetry.metrics.setGlobalMeterProvider(provider)
  if (!result) {
    throw new Error('Global meter provider can not be set.')
  }
  return provider
}

export const shutdown = async (provider: MeterProvider): Promise<void> => {
  try {
    await provider.forceFlush()
    await provider.shutdown()
  } catch (error) {
    console.log('Error terminating MetricProvider', error)
    // Not Recaverable
    process.exit(1)
  }
  console.log('Success to shutdown meterProvider')
}
