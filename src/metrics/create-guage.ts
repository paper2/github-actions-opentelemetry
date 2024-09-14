import * as opentelemetry from '@opentelemetry/api'
import { WorkflowRun, WorkflowRunJobs } from '../github/index.js'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes
): void => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')
  const gauge = meter.createObservableGauge(name)
  // NOTE: Usually, this callback is called by interval. But in this library, we call it manually last once.
  gauge.addCallback(result => {
    result.observe(value, attributes)
    console.log(`Gauge: ${name} ${value} ${JSON.stringify(attributes)}`)
  })
}

interface JobMetricsAttributes extends opentelemetry.Attributes {
  readonly name: string
  readonly workflow_name: string
  readonly owner_and_repository: string
  readonly status: string
}

interface WorkflowMetricsAttributes extends opentelemetry.Attributes {
  readonly workflow_name: string
  readonly owner_and_repository: string
}

export const createWorkflowGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): void => {
  if (workflow.status !== 'completed') {
    throw new Error(`Workflow(id: ${workflow.id}) is not completed.`)
  }
  const jobCompletedAtDates = workflowRunJobs.map(
    job => job.completed_at || job.created_at
  )
  const jobCompletedAtMax = new Date(
    Math.max(...jobCompletedAtDates.map(Number))
  )

  const jobStartedAtDates = workflowRunJobs.map(job => job.started_at)
  const jobStartedAtMin = new Date(Math.min(...jobStartedAtDates.map(Number)))
  const workflowMetricsAttributes: WorkflowMetricsAttributes = {
    workflow_name: workflow.name || '',
    owner_and_repository: `${workflow.repository.owner.name}/${workflow.repository}`
  }

  createGauge(
    'workflow_queued_duration',
    calcDiffSec(jobStartedAtMin, workflow.created_at),
    workflowMetricsAttributes
  )
  createGauge(
    'workflow_duration',
    calcDiffSec(jobCompletedAtMax, workflow.created_at),
    workflowMetricsAttributes
  )
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
      name: job.name,
      workflow_name: job.workflow_name || '',
      owner_and_repository: `${workflow.owner}/${workflow.repository}`,
      status: job.
    }

    const jobQueuedDuration = calcDiffSec(job.started_at, job.created_at)
    createGauge(
      'job_queued_duration',
      // Sometime jobQueuedDuration is negative value because specification of GitHub. (I have inquired it to supports.)
      jobQueuedDuration < 0 ? 0 : jobQueuedDuration,
      jobMetricsAttributes
    )
    createGauge(
      'job_duration',
      calcDiffSec(job.completed_at, job.started_at),
      jobMetricsAttributes
    )
  }
}

const calcDiffSec = (targetDateTime: Date, compareDateTime: Date): number => {
  const diffMilliSecond = targetDateTime.getTime() - compareDateTime.getTime()

  return Math.floor(diffMilliSecond / 1000)
}
