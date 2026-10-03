import { createHash } from 'node:crypto'
import { IdGenerator, RandomIdGenerator } from '@opentelemetry/sdk-trace-base'

export type SpanIds = { traceId?: string; spanId?: string }

const hashId = (key: string, bytes: number): string =>
  createHash('sha256')
    .update(key)
    .digest('hex')
    .slice(0, bytes * 2)

// Deterministic so other tools can attach spans to a workflow run's trace
// without talking to this action. See "Deterministic trace IDs" in README.md.
export const workflowTraceId = (
  repository: string,
  runId: number,
  runAttempt: number
): string => hashId(`${repository}:${runId}:${runAttempt}`, 16)

export const workflowSpanId = (runId: number, runAttempt: number): string =>
  hashId(`workflow:${runId}:${runAttempt}`, 8)

export const jobSpanId = (jobId: number): string => hashId(`job:${jobId}`, 8)

export const jobWithWaitingSpanId = (jobId: number): string =>
  hashId(`job:${jobId}:with-waiting`, 8)

export const jobWaitingSpanId = (jobId: number): string =>
  hashId(`job:${jobId}:waiting`, 8)

// The tracer asks the provider's IdGenerator for ids without saying which span
// they are for, so createSpan presets them immediately around startSpan.
class PresetIdGenerator implements IdGenerator {
  private readonly random = new RandomIdGenerator()
  private preset: SpanIds = {}

  withIds<T>(ids: SpanIds, start: () => T): T {
    this.preset = ids
    try {
      return start()
    } finally {
      this.preset = {}
    }
  }

  generateTraceId(): string {
    return this.preset.traceId ?? this.random.generateTraceId()
  }

  generateSpanId(): string {
    return this.preset.spanId ?? this.random.generateSpanId()
  }
}

export const idGenerator = new PresetIdGenerator()
