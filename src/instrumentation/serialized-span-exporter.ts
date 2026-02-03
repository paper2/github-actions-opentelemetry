import * as opentelemetry from '@opentelemetry/api'
import type { SpanExporter } from '@opentelemetry/sdk-trace-base'

/**
 * Serializes export calls so an underlying OTLP exporter never has more than one
 * in-flight export at a time.
 *
 * This is a defensive workaround for "Concurrent export limit reached" errors
 * that can happen when BatchSpanProcessor triggers overlapping exports
 * (timer flush + forceFlush/shutdown).
 */
export class SerializedSpanExporter implements SpanExporter {
  private readonly exporter: SpanExporter
  private chain: Promise<void> = Promise.resolve()

  constructor(exporter: SpanExporter) {
    this.exporter = exporter
  }

  export(
    spans: Parameters<SpanExporter['export']>[0],
    resultCallback: Parameters<SpanExporter['export']>[1]
  ): void {
    this.chain = this.chain
      .then(
        async () =>
          new Promise<void>(resolve => {
            this.exporter.export(spans, result => {
              resultCallback(result)
              resolve()
            })
          })
      )
      .catch(err => {
        opentelemetry.diag.error('SerializedSpanExporter export failed', err)
      })
  }

  async shutdown(): Promise<void> {
    await this.chain
    await this.exporter.shutdown()
  }

  async forceFlush(): Promise<void> {
    const maybeForceFlush = (
      this.exporter as unknown as { forceFlush?: () => Promise<void> }
    ).forceFlush

    await this.chain
    if (maybeForceFlush) await maybeForceFlush()
  }
}
