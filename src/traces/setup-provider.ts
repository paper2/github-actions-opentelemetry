import * as opentelemetry from '@opentelemetry/api'
import { createExporter, createProvider } from './create-provider.js'
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base'

export const setupTracerProvider = (): BasicTracerProvider => {
  const exporter = createExporter()
  const provider = createProvider(exporter)
  const result = opentelemetry.trace.setGlobalTracerProvider(provider)
  if (!result) {
    throw new Error('Global tracer provider can not be set.')
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
    console.error('Error terminating TraceProvider', error)
    // Not Recaverable
    process.exit(1)
  }
  console.log('Success to shutdown traceProvider')
}
