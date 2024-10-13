import { NodeSDK } from '@opentelemetry/sdk-node'
import { detectResourcesSync, envDetector } from '@opentelemetry/resources'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'

let sdk: NodeSDK
let meterProvider: MeterProvider

export const initialize = (
  exporter: PushMetricExporter = new OTLPMetricExporter()
): void => {
  // Setup Meter Provider
  // NOTE: NodeSDK and OTLP Exporter seemed not flushing metrics withoud forceflush().
  //       Please try integrate NodeSDK again in the future.
  meterProvider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        // Exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        // This settings prvents from generating duplicate metrics.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
      })
    ],
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
  const result = opentelemetry.metrics.setGlobalMeterProvider(meterProvider)
  if (!result) {
    throw new Error(
      'Global meter provider can not be set. Please check meter provider settings.'
    )
  }

  sdk = new NodeSDK({
    // omit this value for the tracing SDK to be initialized from environment variables
    traceExporter: undefined,
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
