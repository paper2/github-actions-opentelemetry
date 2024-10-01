import {
  BasicTracerProvider,
  BatchSpanProcessor,
  SpanExporter
} from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'

export const createExporter = (): SpanExporter =>
  new OTLPTraceExporter({
    // optional - collection of custom headers to be sent with each request, empty by default
    headers: {}
  })

export const createProvider = (exporter: SpanExporter): BasicTracerProvider => {
  const provider = new BasicTracerProvider()

  provider.addSpanProcessor(new BatchSpanProcessor(exporter))
  provider.register()

  return provider
}
