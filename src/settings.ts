export const settings = {
  workflowRunId: process.env.WORKFLOW_RUN_ID
    ? parseInt(process.env.WORKFLOW_RUN_ID)
    : undefined,
  owner: process.env.OWNER,
  repository: process.env.REPOSITORY,
  logLevel: process.env.LOG_LEVEL || 'info',
  isCi: process.env.CI === 'true',
  localOtlpMetricsEndpoint: 'http://prometheus:9090/api/v1/otlp/v1/metrics',
  localOtlpTracesEndpoint: 'http://jaeger:4318/v1/traces'
}

export default settings
