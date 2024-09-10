import * as opentelemetry from '@opentelemetry/api'
import { WorkflowRun, WorkflowRunJobs } from '../github/index.js'

export const createGuage = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes
): void => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')
  const guage = meter.createObservableGauge(name)
  // NOTE: Usyally, this callback is called by interval. But in this library, we call it manually last once.
  guage.addCallback(result => {
    result.observe(value, attributes)
    console.log(`Guage: ${name} ${value} ${JSON.stringify(attributes)}`)
  })
}

export interface JobMetricsAttributes extends opentelemetry.Attributes {
  readonly id: number
  readonly name: string
  readonly run_id: number
  readonly workflow_name: string
}

export interface WorkflowMetricsAttributes extends opentelemetry.Attributes {
  readonly id: number
  readonly run_id: number
  readonly workflow_name: string
}

export const createWorkflowGuages = (
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
  const jobStartedtAtMin = new Date(Math.min(...jobStartedAtDates.map(Number)))
  const workflowMetricsAttributes: WorkflowMetricsAttributes = {
    id: workflow.id,
    run_id: workflow.run_number,
    workflow_name: workflow.name || ''
  }

  createGuage(
    'workflow_queued_duration',
    calcDiffSec(jobStartedtAtMin, workflow.created_at),
    workflowMetricsAttributes
  )
  createGuage(
    'workflow_duration',
    calcDiffSec(jobCompletedAtMax, workflow.created_at),
    workflowMetricsAttributes
  )
}

export const createJobGuages = (workflowJobs: WorkflowRunJobs): void => {
  for (const job of workflowJobs) {
    if (!job.completed_at) {
      continue
    }

    const jobMetricsAttributes: JobMetricsAttributes = {
      id: job.id,
      name: job.name,
      run_id: job.run_id,
      workflow_name: job.workflow_name || ''
    }

    createGuage(
      'job_queued_duration',
      calcDiffSec(job.started_at, job.created_at),
      jobMetricsAttributes
    )
    createGuage(
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
