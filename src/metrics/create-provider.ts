import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'

export const createExporter = (): PushMetricExporter =>
  new OTLPMetricExporter({
    //   url: '<your-otlp-endpoint>/v1/metrics', // url is optional and can be omitted - default is http://localhost:4318/v1/metrics
    headers: {} // an optional object containing custom headers to be sent with each request
  })

export const createProvider = (exporter: PushMetricExporter): MeterProvider =>
  new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        // exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        exportIntervalMills: 24 * 60 * 60 * 1000 // 24 hours
      })
    ]
  })
