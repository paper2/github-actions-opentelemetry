import * as opentelemetry from '@opentelemetry/api'
import {
  getLatestCompletedAt,
  WorkflowRun,
  WorkflowRunJobs
} from '../github/index.js'
import { calcDiffSec } from '../utils/calc-diff-sec.js'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes,
  option?: opentelemetry.MetricOptions
): void => {
  // TODO: Examplarsの活用できないか検討
  // FYI: https://opentelemetry.io/docs/specs/otel/metrics/data-model/#exemplars
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')

  const gauge = meter.createGauge(name, option)
  gauge.record(value, attributes)
}

interface WorkflowMetricsAttributes extends opentelemetry.Attributes {
  // FYI: [CICD Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/attributes-registry/cicd/)
  readonly 'cicd.pipeline.name': string
  readonly 'cicd.pipeline.repository': string
}

export const createWorkflowGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): void => {
  if (workflow.status !== 'completed') {
    throw new Error(`Workflow(id: ${workflow.id}) is not completed.`)
  }
  const jobCompletedAtMax = new Date(getLatestCompletedAt(workflowRunJobs))

  // TODO: トレースの仕様と合わせる。（正確にはgithubの仕様に合わせる）
  const jobStartedAtDates = workflowRunJobs.map(job => new Date(job.started_at))
  const jobStartedAtMin = new Date(Math.min(...jobStartedAtDates.map(Number)))
  const workflowMetricsAttributes: WorkflowMetricsAttributes = {
    'cicd.pipeline.name': workflow.name || '',
    'cicd.pipeline.repository': `${workflow.repository.full_name}`
  }

  createGauge(
    'cicd.pipeline.queued_duration',
    calcDiffSec(new Date(workflow.created_at), jobStartedAtMin),
    workflowMetricsAttributes,
    { unit: 's' }
  )
  createGauge(
    'cicd.pipeline.duration',
    calcDiffSec(new Date(workflow.created_at), jobCompletedAtMax),
    workflowMetricsAttributes,
    { unit: 's' }
  )
}

interface JobMetricsAttributes extends opentelemetry.Attributes {
  // FYI: [CICD Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/attributes-registry/cicd/)
  readonly 'cicd.pipeline.name': string
  readonly 'cicd.pipeline.repository': string
  readonly 'cicd.pipeline.task.name': string
}

export const createJobGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): void => {
  for (const job of workflowRunJobs) {
    if (!job.completed_at) {
      continue
    }

    const jobMetricsAttributes: JobMetricsAttributes = {
      'cicd.pipeline.name': job.workflow_name || '',
      'cicd.pipeline.repository': `${workflow.repository.full_name}`,
      'cicd.pipeline.task.name': job.name
    }

    createGauge(
      'cicd.pipeline.task.duration',
      calcDiffSec(new Date(job.started_at), new Date(job.completed_at)),
      jobMetricsAttributes,
      { unit: 's' }
    )

    // TODO: 計算ロジックをトレース側と合わせる
    const jobQueuedDuration = calcDiffSec(
      new Date(job.created_at),
      new Date(job.started_at)
    )
    if (jobQueuedDuration < 0) {
      // Sometime jobQueuedDuration is negative value because specification of GitHub. (I have inquired it to supports.)
      // Not creating metric because it is noise of Statistics.
      continue
    }
    createGauge(
      'cicd.pipeline.task.queued_duration',
      jobQueuedDuration,
      jobMetricsAttributes,
      { unit: 's' }
    )
  }
}
