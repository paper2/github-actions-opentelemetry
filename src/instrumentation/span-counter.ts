import * as opentelemetry from '@opentelemetry/api'
import type { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base'

export type SpanCountSnapshot = {
  started: number
  ended: number
  exported: number
  /** ended - exported, clamped at 0 */
  dropped: number
  exportCalls: number
  exportCallsSucceeded: number
  exportCallsFailed: number
  exportedSucceeded: number
  exportedFailed: number
}

/**
 * Captures an exact count of spans produced by this process.
 *
 * - `ended` is the most important number: each ended span is a span the SDK will
 *   attempt to export.
 * - `exported` counts spans passed to the exporter (after batching). If this is
 *   lower than `ended`, something prevented exporting some spans.
 */
export class SpanCounter {
  private started = 0
  private ended = 0

  private exported = 0
  private exportCalls = 0

  private exportCallsSucceeded = 0
  private exportCallsFailed = 0
  private exportedSucceeded = 0
  private exportedFailed = 0

  onStart(): void {
    this.started++
  }

  onEnd(): void {
    this.ended++
  }

  onExportCall(batchSize: number): void {
    this.exportCalls++
    this.exported += batchSize
  }

  onExportResult(batchSize: number, ok: boolean): void {
    if (ok) {
      this.exportCallsSucceeded++
      this.exportedSucceeded += batchSize
    } else {
      this.exportCallsFailed++
      this.exportedFailed += batchSize
    }
  }

  snapshot(): SpanCountSnapshot {
    const dropped = Math.max(0, this.ended - this.exported)

    return {
      started: this.started,
      ended: this.ended,
      exported: this.exported,
      dropped,
      exportCalls: this.exportCalls,
      exportCallsSucceeded: this.exportCallsSucceeded,
      exportCallsFailed: this.exportCallsFailed,
      exportedSucceeded: this.exportedSucceeded,
      exportedFailed: this.exportedFailed
    }
  }
}

export class CountingSpanProcessor implements SpanProcessor {
  private readonly counter: SpanCounter

  constructor(counter: SpanCounter) {
    this.counter = counter
  }

  onStart(): void {
    this.counter.onStart()
  }

  onEnd(): void {
    this.counter.onEnd()
  }

  async forceFlush(): Promise<void> {
    // Nothing buffered here
  }

  async shutdown(): Promise<void> {
    // Nothing to shutdown
  }
}

export type ExportLike = {
  export: (spans: ReadableSpan[], cb: (result: unknown) => void) => void
}

const isExportSuccess = (result: unknown): boolean => {
  // OpenTelemetry JS exporters usually return { code: ExportResultCode, error? }
  // but we keep this defensive so it works across versions/transpilation.
  if (result == null) return false
  if (typeof result !== 'object') return false

  const maybeCode = (result as { code?: unknown }).code

  // Most common: ExportResultCode.SUCCESS === 0
  if (typeof maybeCode === 'number') return maybeCode === 0

  // Fallbacks seen in some wrappers
  if (typeof maybeCode === 'string') {
    return maybeCode.toUpperCase() === 'SUCCESS'
  }

  return false
}

/**
 * Wraps an exporter and records how many spans were handed to it.
 */
export const wrapExporterWithCounting = <T extends ExportLike>(
  exporter: T,
  counter: SpanCounter
): T => {
  const originalExport = exporter.export.bind(exporter)

  ;(exporter as unknown as ExportLike).export = (
    spans: ReadableSpan[],
    cb: (result: unknown) => void
  ) => {
    const batchSize = spans.length
    counter.onExportCall(batchSize)

    return originalExport(spans, result => {
      const ok = isExportSuccess(result)
      counter.onExportResult(batchSize, ok)

      if (!ok) {
        opentelemetry.diag.error(
          `Exporter reported failure for batch size=${batchSize}`,
          result
        )
      } else {
        opentelemetry.diag.debug(
          `Exporter succeeded for batch size=${batchSize}`
        )
      }

      cb(result)
    })
  }

  return exporter
}
