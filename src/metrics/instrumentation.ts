import * as opentelemetry from '@opentelemetry/api'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'

const exporter = new OTLPMetricExporter({
  //   url: '<your-otlp-endpoint>/v1/metrics', // url is optional and can be omitted - default is http://localhost:4318/v1/metrics
  headers: {} // an optional object containing custom headers to be sent with each request
})
const periodicExportingMetricReader = new PeriodicExportingMetricReader({
  exporter,
  // exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
  exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
})
const provider = new MeterProvider({
  readers: [periodicExportingMetricReader]
})
opentelemetry.metrics.setGlobalMeterProvider(provider)

export const shutdown = async (): Promise<void> => {
  try {
    await provider.forceFlush()
    await provider.shutdown()
  } catch (error) {
    console.log('Error terminating MetricProvider', error)
    process.exit(1)
  }
  process.exit(0)
}
