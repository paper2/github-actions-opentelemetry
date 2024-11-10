export const settings = {
  workflowRunId: process.env.WORKFLOW_RUN_ID
    ? parseInt(process.env.WORKFLOW_RUN_ID)
    : undefined,
  owner: process.env.OWNER,
  repository: process.env.REPOSITORY,
  FeatureFlagTrace: process.env.FEATURE_TRACE
    ? process.env.FEATURE_TRACE.toLowerCase() === 'true'
    : false,
  // Always set to true when GitHub Actions is running the workflow.
  isGitHubActions: process.env.GITHUB_ACTIONS === 'true',
  logeLevel:
    process.env.RUNNER_DEBUG === '1'
      ? 'debug' // https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables
      : process.env.OTEL_LOG_LEVEL || // https://opentelemetry.io/docs/zero-code/js/#troubleshooting
        'info'
}

export default settings
