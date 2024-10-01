import * as opentelemetry from '@opentelemetry/api'
import { createExporter, createProvider } from './create-provider.js'
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base'

export const setupTracerProvider = (): BasicTracerProvider => {
  const exporter = createExporter()
  const provider = createProvider(exporter)
  const result = opentelemetry.trace.setGlobalTracerProvider(provider)
  if (!result) {
    console.warn('Global meter provider can not be set.')
  }
  return provider
}

export const shutdown = async (
  provider: BasicTracerProvider
): Promise<void> => {
  try {
    await provider.forceFlush()
    await provider.shutdown()
  } catch (error) {
    console.log('Error terminating TraceProvider', error)
    process.exit(1)
  }
  process.exit(0)
}
