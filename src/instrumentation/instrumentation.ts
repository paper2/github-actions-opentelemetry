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
  BatchSpanProcessor,
  SpanProcessor
} from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import settings from '../settings.js'
import { SerializedSpanExporter } from './serialized-span-exporter.js'
import {
  CountingSpanProcessor,
  SpanCounter,
  wrapExporterWithCounting
} from './span-counter.js'

let traceProvider: BasicTracerProvider
let meterProvider: MeterProvider
let spanCounter: SpanCounter | undefined

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
    const traceBatch = settings.traceBatch

    // Guard against misconfiguration that can cause unexpected behavior.
    // In OpenTelemetry JS, maxExportBatchSize must be <= maxQueueSize.
    const maxQueueSize = Number.isFinite(traceBatch.maxQueueSize)
      ? traceBatch.maxQueueSize
      : 100000
    const maxExportBatchSize = Number.isFinite(traceBatch.maxExportBatchSize)
      ? traceBatch.maxExportBatchSize
      : 512

    const safeMaxQueueSize = maxQueueSize > 0 ? maxQueueSize : 100000
    const safeMaxExportBatchSize =
      maxExportBatchSize > 0
        ? Math.min(maxExportBatchSize, safeMaxQueueSize)
        : Math.min(512, safeMaxQueueSize)

    const scheduledDelayMillis =
      Number.isFinite(traceBatch.scheduledDelayMillis) &&
      traceBatch.scheduledDelayMillis > 0
        ? Math.max(traceBatch.scheduledDelayMillis, 30000)
        : 30000
    const exportTimeoutMillis =
      Number.isFinite(traceBatch.exportTimeoutMillis) &&
      traceBatch.exportTimeoutMillis > 0
        ? traceBatch.exportTimeoutMillis
        : 120000

    const configuredConcurrencyLimit =
      Number.isFinite(settings.otlp?.tracesConcurrencyLimit) &&
      settings.otlp.tracesConcurrencyLimit > 0
        ? settings.otlp.tracesConcurrencyLimit
        : 1

    const baseTraceExporterRaw =
      exporter ||
      new OTLPTraceExporter({
        concurrencyLimit: configuredConcurrencyLimit
      })

    if (settings.FeatureFlagExactSpanCount) {
      spanCounter = new SpanCounter()
    }

    const baseTraceExporter =
      spanCounter != null
        ? wrapExporterWithCounting(baseTraceExporterRaw, spanCounter)
        : baseTraceExporterRaw

    const traceExporter = new SerializedSpanExporter(baseTraceExporter)

    opentelemetry.diag.info(
      `Trace exporter config: OTLPTraceExporter(concurrencyLimit=${configuredConcurrencyLimit}) + SerializedSpanExporter`
    )
    opentelemetry.diag.info(
      `BatchSpanProcessor config: maxQueueSize=${safeMaxQueueSize}, maxExportBatchSize=${safeMaxExportBatchSize}, scheduledDelayMillis=${scheduledDelayMillis}, exportTimeoutMillis=${exportTimeoutMillis}`
    )

    const spanProcessors: SpanProcessor[] = [
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: safeMaxQueueSize,
        maxExportBatchSize: safeMaxExportBatchSize,
        scheduledDelayMillis,
        exportTimeoutMillis
      })
    ]

    if (spanCounter != null) {
      spanProcessors.unshift(new CountingSpanProcessor(spanCounter))
      opentelemetry.diag.info(
        'Exact span counting is ENABLED (OTEL_EXACT_SPAN_COUNT=true)'
      )
    }

    traceProvider = new BasicTracerProvider({
      resource: detectResources({ detectors: [envDetector] }),
      spanProcessors
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

export const getSpanCountSnapshot = ():
  | ReturnType<SpanCounter['snapshot']>
  | undefined => spanCounter?.snapshot()
