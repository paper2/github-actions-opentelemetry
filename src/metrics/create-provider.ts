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
        exporter
      })
    ],
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
