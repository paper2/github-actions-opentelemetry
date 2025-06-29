import * as opentelemetry from '@opentelemetry/api'
import {
  getLatestCompletedAt,
  WorkflowRun,
  WorkflowJob,
  WorkflowJobs
} from '../github/index.js'
import { calcDiffSec } from '../utils/calc-diff-sec.js'
import { descriptorNames as dn, attributeKeys as ak } from './constants.js'
import * as core from '@actions/core'

export const createGauge = (
  name: string,
  value: number,
  attributes: opentelemetry.Attributes,
  option?: opentelemetry.MetricOptions
): void => {
  const meter = opentelemetry.metrics.getMeter('github-actions-metrics')

  const gauge = meter.createGauge(name, option)
  gauge.record(value, attributes)
}

const createMetricsAttributes = (
  workflow: WorkflowRun,
  job?: WorkflowJob
): opentelemetry.Attributes => ({
  [ak.WORKFLOW_NAME]: workflow.name || undefined,
  [ak.REPOSITORY]: workflow.repository.full_name,
  ...(job && { [ak.JOB_NAME]: job.name }),
  ...(job && job.conclusion && { [ak.JOB_CONCLUSION]: job.conclusion }) // conclusion specification: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks#check-statuses-and-conclusions
})

export const createWorkflowGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowJobs
): void => {
  const workflowMetricsAttributes = createMetricsAttributes(workflow)
  // workflow run context has no end time, so use the latest job's completed_at
  const jobCompletedAtMax = new Date(getLatestCompletedAt(workflowRunJobs))
  createGauge(
    dn.WORKFLOW_DURATION,
    calcDiffSec(new Date(workflow.created_at), jobCompletedAtMax),
    workflowMetricsAttributes,
    { unit: 's' }
  )
}

export const createJobGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowJobs
): void => {
  for (const job of workflowRunJobs) {
    if (!job.completed_at) {
      continue
    }

    const jobMetricsAttributes = createMetricsAttributes(workflow, job)
    createGauge(
      dn.JOB_DURATION,
      calcDiffSec(new Date(job.started_at), new Date(job.completed_at)),
      jobMetricsAttributes,
      { unit: 's' }
    )

    // The calculation method for GitHub's queue times has not been disclosed.
    // Since it is displayed in the job column, it is assumed to be calculated based on job information.
    // See. https://docs.github.com/en/actions/administering-github-actions/viewing-github-actions-metrics
    const jobQueuedDuration = calcDiffSec(
      new Date(job.created_at),
      new Date(job.started_at)
    )
    if (jobQueuedDuration < 0) {
      core.notice(
        `${job.name}: Skip to create ${dn.JOB_QUEUED_DURATION} metrics. This is a GitHub specification issue that occasionally occurs, so it can't be recover.`
      )
      continue
    }
    createGauge(
      dn.JOB_QUEUED_DURATION,
      jobQueuedDuration,
      jobMetricsAttributes,
      { unit: 's' }
    )
  }
}
