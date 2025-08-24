import { detectResources, envDetector } from '@opentelemetry/resources'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  PushMetricExporter
} from '@opentelemetry/sdk-metrics'
import * as opentelemetry from '@opentelemetry/api'
import {
  SpanExporter,
  BasicTracerProvider,
  BatchSpanProcessor
} from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import settings from '../settings.js'

let traceProvider: BasicTracerProvider
let meterProvider: MeterProvider

export const initialize = (
  meterExporter?: PushMetricExporter,
  spanExporter?: SpanExporter
): void => {
  if (settings.logeLevel === 'debug')
    opentelemetry.diag.setLogger(
      new opentelemetry.DiagConsoleLogger(),
      opentelemetry.DiagLogLevel.DEBUG
    )
  initializeMeter(meterExporter)
  initializeTracer(spanExporter)
}

const initializeMeter = (exporter?: PushMetricExporter): void => {
  if (settings.FeatureFlagMetrics) {
    meterProvider = new MeterProvider({
      readers: [
        new PeriodicExportingMetricReader({
          exporter: exporter ?? new OTLPMetricExporter(),
          // Exporter has not implemented the manual flush method yet.
          // High interval prevents from generating duplicate metrics.
          exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
        })
      ],
      resource: detectResources({ detectors: [envDetector] })
    })
  } else {
    meterProvider = new MeterProvider()
  }
  const result = opentelemetry.metrics.setGlobalMeterProvider(meterProvider)
  if (!result) {
    throw new Error(
      'setGlobalMeterProvider failed. please check settings or duplicate registration.'
    )
  }
}

const initializeTracer = (exporter?: SpanExporter): void => {
  if (settings.FeatureFlagTrace) {
    traceProvider = new BasicTracerProvider({
      resource: detectResources({ detectors: [envDetector] }),
      spanProcessors: [
        new BatchSpanProcessor(exporter || new OTLPTraceExporter({}))
      ]
    })
  } else {
    traceProvider = new BasicTracerProvider()
  }
  const result = opentelemetry.trace.setGlobalTracerProvider(traceProvider)
  if (!result) {
    throw new Error(
      'setGlobalTracerProvider failed. please check settings or duplicate registration.'
    )
  }
}

export const forceFlush = async (): Promise<void> => {
  await traceProvider.forceFlush()
}

// Note: The _forceFlushMeterProvider function below is specifically for testing purposes.
// This is necessary because in-memory exporters cannot be used properly after shutdown,
// so during testing we need to call forceFlush instead of shutdown.
// In production, this is not needed as metrics are exported when shutdown is called at the end.
// FYI: https://github.com/open-telemetry/opentelemetry-js/blob/main/CHANGELOG.md#rocket-enhancement-1
export const _forceFlushMeterProvider = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('This method is only available in test environment')
  }
  await meterProvider.forceFlush()
}

export const shutdown = async (): Promise<void> => {
  await meterProvider.shutdown()
  await traceProvider.shutdown()
}
