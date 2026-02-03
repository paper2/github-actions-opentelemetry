// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createSettings = (env: typeof process.env) => ({
  workflowRunId: env.WORKFLOW_RUN_ID
    ? parseInt(env.WORKFLOW_RUN_ID)
    : undefined,
  owner: env.OWNER,
  repository: env.REPOSITORY,
  FeatureFlagTrace: env.FEATURE_TRACE
    ? env.FEATURE_TRACE.toLowerCase() === 'true'
    : true,
  FeatureFlagMetrics: env.FEATURE_METRICS
    ? env.FEATURE_METRICS.toLowerCase() === 'true'
    : true,
  logeLevel:
    env.RUNNER_DEBUG === '1'
      ? 'debug' // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
      : env.OTEL_LOG_LEVEL || 'info', // https://opentelemetry.io/docs/zero-code/js/#troubleshooting

  // BatchSpanProcessor tuning (helps prevent dropping spans in large workflows)
  // https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk_trace_base.BatchSpanProcessorConfig.html
  traceBatch: {
    // Max spans buffered before being dropped.
    maxQueueSize: env.OTEL_BSP_MAX_QUEUE_SIZE
      ? parseInt(env.OTEL_BSP_MAX_QUEUE_SIZE)
      : 10000,
    // Max spans per export call. Must be <= maxQueueSize.
    maxExportBatchSize: env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE
      ? parseInt(env.OTEL_BSP_MAX_EXPORT_BATCH_SIZE)
      : 128,
    // How often the batch processor attempts to export.
    scheduledDelayMillis: env.OTEL_BSP_SCHEDULED_DELAY_MILLIS
      ? parseInt(env.OTEL_BSP_SCHEDULED_DELAY_MILLIS)
      : 10,
    // Timeout for an export call.
    exportTimeoutMillis: env.OTEL_BSP_EXPORT_TIMEOUT_MILLIS
      ? parseInt(env.OTEL_BSP_EXPORT_TIMEOUT_MILLIS)
      : 180
  },

  // OTLP exporter concurrency limit (in-flight export requests). If you see
  // 'Concurrent export limit reached', lower the batch processor aggressiveness
  // or increase this if the network/collector can handle it.
  otlp: {
    tracesConcurrencyLimit: env.OTEL_EXPORTER_OTLP_TRACES_CONCURRENCY_LIMIT
      ? parseInt(env.OTEL_EXPORTER_OTLP_TRACES_CONCURRENCY_LIMIT)
      : 1
  },

  // When enabled, the action will count exactly how many spans were ended/exported
  // by installing an additional SpanProcessor. Useful to verify large workflows.
  FeatureFlagExactSpanCount: env.OTEL_EXACT_SPAN_COUNT
    ? env.OTEL_EXACT_SPAN_COUNT.toLowerCase() === 'true'
    : true
})

export const settings = createSettings(process.env)
export type ApplicationSettings = ReturnType<typeof createSettings>

export default settings
