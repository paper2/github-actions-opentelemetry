import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'
import settings from '../settings.js'

export const createExporter = (): PushMetricExporter =>
  new OTLPMetricExporter({
    url: settings.isCi ? undefined : settings.localOtlpMetricsEndpoint
  })

export const createProvider = (exporter: PushMetricExporter): MeterProvider =>
  new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        // exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
      })
    ]
  })
