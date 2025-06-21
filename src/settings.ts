/**
 * Extracts custom attributes from environment variables based on a prefix pattern.
 * Environment variables matching the pattern PREFIX_ATTRIBUTE_NAME will be converted
 * to attributes with the key 'attribute_name' (lowercase).
 *
 * @param env - Environment variables object
 * @param prefix - Prefix pattern to match (e.g., 'CUSTOM_ATTRIBUTE_TRACE_JOB')
 * @returns Object with extracted attributes
 */
export const extractCustomAttributes = (
  env: typeof process.env,
  prefix: string
): Record<string, string> => {
  const attributes: Record<string, string> = {}
  const pattern = new RegExp(`^${prefix}_(.+)$`)

  Object.entries(env).forEach(([key, value]) => {
    const match = key.match(pattern)
    if (match && value) {
      const attributeName = match[1].toLowerCase()
      attributes[attributeName] = value
    }
  })

  return attributes
}

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
  customJobAttributes: extractCustomAttributes(
    env,
    'CUSTOM_ATTRIBUTE_TRACE_JOB'
  ),
  customWorkflowAttributes: extractCustomAttributes(
    env,
    'CUSTOM_ATTRIBUTE_TRACE_WORKFLOW'
  ),
  customStepAttributes: extractCustomAttributes(
    env,
    'CUSTOM_ATTRIBUTE_TRACE_STEP'
  )
})

export const settings = createSettings(process.env)

export default settings
