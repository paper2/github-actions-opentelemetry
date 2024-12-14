export const descriptorNames = {
  JOB_DURATION: 'github.job.duration',
  JOB_QUEUED_DURATION: 'github.job.queued_duration',
  WORKFLOW_DURATION: 'github.workflow.duration'
} as const satisfies Record<string, string>

export const attributeKeys = {
  REPOSITORY: 'repository',
  WORKFLOW_NAME: 'workflow.name',
  JOB_NAME: 'job.name'
} as const satisfies Record<string, string>
