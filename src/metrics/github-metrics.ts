import { WorkflowRun, WorkflowRunJobs } from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'
import { createGauge } from './create-gauge.js'
import { calcDiffSec } from '../utils/calc-diff-sec.js'

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
  const jobCompletedAtDates = workflowRunJobs.map(
    job => new Date(job.completed_at || job.created_at)
  )
  const jobCompletedAtMax = new Date(
    Math.max(...jobCompletedAtDates.map(Number))
  )

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
  readonly 'cicd.pipeline.task.status': string
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
      'cicd.pipeline.task.name': job.name,
      'cicd.pipeline.task.status': job.status
    }

    createGauge(
      'cicd.pipeline.task.duration',
      calcDiffSec(new Date(job.started_at), new Date(job.completed_at)),
      jobMetricsAttributes,
      { unit: 's' }
    )

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
