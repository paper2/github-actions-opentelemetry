export const settings = {
  workflowRunId: process.env.WORKFLOW_RUN_ID
    ? parseInt(process.env.WORKFLOW_RUN_ID)
    : undefined,
  owner: process.env.OWNER,
  repository: process.env.REPOSITORY,
  logLevel: process.env.LOG_LEVEL || 'info'
}

export default settings
