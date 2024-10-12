import { detectResourcesSync, envDetector } from '@opentelemetry/resources'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'

export const createExporter = (): PushMetricExporter =>
  new OTLPMetricExporter({})

export const createProvider = (exporter: PushMetricExporter): MeterProvider =>
  new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        // Exporter has not implemented the manual flush method yet, so we need to set the interval to a value that is not too high.
        // This settings prvents from generating duplicate metrics.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
      })
    ],
    // TODO: Detectorについて再度調査する。
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
