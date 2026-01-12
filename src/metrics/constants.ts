export const descriptorNames = {
  JOB_DURATION: 'github.job.duration',
  JOB_QUEUED_DURATION: 'github.job.queued_duration',
  WORKFLOW_DURATION: 'github.workflow.duration',
  WORKFLOW_QUEUED_DURATION: 'github.workflow.queued_duration'
} as const satisfies Record<string, string>

export const attributeKeys = {
  REPOSITORY: 'repository',
  WORKFLOW_NAME: 'workflow.name',
  WORKFLOW_CONCLUSION: 'workflow.conclusion',
  WORKFLOW_ACTOR: 'workflow.actor',
  WORKFLOW_EVENT: 'workflow.event',
  WORKFLOW_HEAD_BRANCH: 'workflow.head_branch',
  WORKFLOW_BASE_BRANCH: 'workflow.base_branch',
  JOB_NAME: 'job.name',
  JOB_CONCLUSION: 'job.conclusion',
  RUNNER_NAME: 'runner.name',
  RUNNER_GROUP_NAME: 'runner.group_name'
} as const satisfies Record<string, string>
