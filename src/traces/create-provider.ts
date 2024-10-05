import {
  BasicTracerProvider,
  BatchSpanProcessor,
  SpanExporter
} from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import settings from '../settings.js'

export const createExporter = (): SpanExporter => {
  return new OTLPTraceExporter({
    url: settings.isCi ? undefined : settings.localOtlpTracesEndpoint
  })
}

// TODO: metrcsでも使うからもうちょっと汎用的に
const serviceName =
  process.env.OTEL_SERVICE_NAME || 'github-actions-opentelemetry'

export const createProvider = (exporter: SpanExporter): BasicTracerProvider => {
  const provider = new BasicTracerProvider()

  provider.addSpanProcessor(new BatchSpanProcessor(exporter))
  provider.register()

  return provider
}
