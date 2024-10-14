import { NodeSDK } from '@opentelemetry/sdk-node'
import { detectResourcesSync, envDetector } from '@opentelemetry/resources'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
import { SpanExporter } from '@opentelemetry/sdk-trace-base'

let sdk: NodeSDK
let meterProvider: MeterProvider

export const initialize = (
  meterExporter?: PushMetricExporter,
  traceExporter?: SpanExporter
): void => {
  // NOTE: NodeSDK and OTLP Exporter seemed not flushing metrics without forceflush().
  //       Please try integrate NodeSDK again in the future.
  meterProvider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: meterExporter ?? new OTLPMetricExporter(),
        // Exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        // This settings prevents from generating duplicate metrics.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
      })
    ],
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
  const result = opentelemetry.metrics.setGlobalMeterProvider(meterProvider)
  if (!result) {
    console.warn(
      'setGlobalMeterProvider failed. pease check settings or duplicate registration.'
    )
  }

  sdk = new NodeSDK({
    // omit this value for the tracing SDK to be initialized from environment variables
    traceExporter,
    // if omitted, will not be initialized
    metricReader: undefined,
    // Need for using OTEL_XXX environment variable
    resourceDetectors: [envDetector]
  })

  sdk.start()
}

export const shutdown = async (): Promise<void> => {
  try {
    await meterProvider.forceFlush()
    await meterProvider.shutdown()
    await sdk.shutdown()
    console.log('success providers shutdown.')
  } catch (error) {
    console.log('fail providers shutdown.', error)
    process.exit(1)
  }
}
