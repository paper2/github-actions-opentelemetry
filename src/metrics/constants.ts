// TODO: ユーザ独自定義のものはそのまま同じもの使わないようにする(breaking change)
// FYI: [CICD Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/attributes-registry/cicd/)
export const descriptorNames: Record<string, string> = {
  TASK_DURATION: 'cicd.pipeline.task.duration',
  TASK_QUEUED_DURATION: 'cicd.pipeline.task.queued_duration',
  DURATION: 'cicd.pipeline.duration',
  QUEUED_DURATION: 'cicd.pipeline.queued_duration'
} as const

// FYI: [CICD Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/attributes-registry/cicd/)
export const attributeKeys: Record<string, string> = {
  REPOSITORY: 'cicd.pipeline.repository',
  NAME: 'cicd.pipeline.name',
  TASK_NAME: 'cicd.pipeline.task.name'
} as const
