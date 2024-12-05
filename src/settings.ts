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
      : env.OTEL_LOG_LEVEL || 'info' // https://opentelemetry.io/docs/zero-code/js/#troubleshooting
})

export const settings = createSettings(process.env)

export default settings
