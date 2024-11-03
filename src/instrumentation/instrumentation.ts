import { detectResourcesSync, envDetector } from '@opentelemetry/resources'
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

let traceProvider: BasicTracerProvider
let meterProvider: MeterProvider

export const initialize = (
  meterExporter?: PushMetricExporter,
  spanExporter?: SpanExporter
): void => {
  initializeMeter(meterExporter)
  initializeTracer(spanExporter)
}

const initializeMeter = (exporter?: PushMetricExporter): void => {
  meterProvider = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: exporter ?? new OTLPMetricExporter(),
        // Exporter has not implemented the manual flush method yet.
        // High interval prevents from generating duplicate metrics.
        exportIntervalMillis: 24 * 60 * 60 * 1000 // 24 hours
      })
    ],
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
  const result = opentelemetry.metrics.setGlobalMeterProvider(meterProvider)
  if (!result) {
    throw new Error(
      'setGlobalMeterProvider failed. please check settings or duplicate registration.'
    )
  }
}

const initializeTracer = (exporter?: SpanExporter): void => {
  traceProvider = new BasicTracerProvider({
    resource: detectResourcesSync({ detectors: [envDetector] })
  })
  traceProvider.addSpanProcessor(
    new BatchSpanProcessor(exporter || new OTLPTraceExporter({}))
  )
  const result = opentelemetry.trace.setGlobalTracerProvider(traceProvider)
  if (!result) {
    throw new Error(
      'setGlobalTracerProvider failed. please check settings or duplicate registration.'
    )
  }
}

export const forceFlush = async (): Promise<void> => {
  try {
    await meterProvider.forceFlush()
    await traceProvider.forceFlush()
  } catch (error) {
    console.log('provider failed forceFlush.', error)
  }
}

export const shutdown = async (): Promise<void> => {
  try {
    await meterProvider.shutdown()
    await traceProvider.shutdown()
  } catch (error) {
    console.log('provider failed shutdown.', error)
  }
}
