import * as opentelemetry from '@opentelemetry/api'
import {
  getLatestCompletedAt,
  WorkflowRun,
  WorkflowRunJob,
  WorkflowRunJobs
} from '../github/index.js'
import { calcDiffSec } from '../utils/calc-diff-sec.js'
import { descriptorNames as dn, attributeKeys as ak } from './constants.js'

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
  job?: WorkflowRunJob
): opentelemetry.Attributes => ({
  [ak.NAME]: workflow.name || '',
  [ak.REPOSITORY]: workflow.repository.full_name,
  ...(job && { [ak.TASK_NAME]: job.name })
})

export const createWorkflowGauges = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): void => {
  const workflowMetricsAttributes = createMetricsAttributes(workflow)

  // TODO: トレースの仕様と合わせる。（正確にはgithubの仕様に合わせる）
  const jobStartedAtDates = workflowRunJobs.map(job => new Date(job.started_at))
  const jobStartedAtMin = new Date(Math.min(...jobStartedAtDates.map(Number)))
  createGauge(
    dn.QUEUED_DURATION,
    calcDiffSec(new Date(workflow.created_at), jobStartedAtMin),
    workflowMetricsAttributes,
    { unit: 's' }
  )

  const jobCompletedAtMax = new Date(getLatestCompletedAt(workflowRunJobs))
  createGauge(
    dn.DURATION,
    calcDiffSec(new Date(workflow.created_at), jobCompletedAtMax),
    workflowMetricsAttributes,
    { unit: 's' }
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

    const jobMetricsAttributes = createMetricsAttributes(workflow, job)
    createGauge(
      dn.TASK_DURATION,
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
      dn.TASK_QUEUED_DURATION,
      jobQueuedDuration,
      jobMetricsAttributes,
      { unit: 's' }
    )
  }
}
