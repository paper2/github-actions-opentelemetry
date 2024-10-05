import { Context, ROOT_CONTEXT } from '@opentelemetry/api'
import {
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowRunJob
} from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'

export const createWorkflowRunTrace = (
  workflowRun: WorkflowRun,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workflowRunJobs: WorkflowRunJobs
): Context => {
  const tracer = opentelemetry.trace.getTracer(
    'github-actions-opentelemetry-github'
  )
  const startTime = new Date(
    workflowRun.run_started_at || workflowRun.created_at
  )
  const rootSpan = tracer.startSpan(
    workflowRun.name || `${workflowRun.workflow_id}`,
    {
      root: true,
      attributes: {},
      startTime
    },
    ROOT_CONTEXT
  )
  // TODO: metricsと同じロジックの部分はgithubディレクトリに切り出す
  const jobCompletedAtDates = workflowRunJobs.map(
    job => new Date(job.completed_at || job.created_at)
  )
  const endTime = new Date(Math.max(...jobCompletedAtDates.map(Number)))
  rootSpan.end(endTime)
  return opentelemetry.trace.setSpan(ROOT_CONTEXT, rootSpan)
}

export const createWorkflowRunJobSpan = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: Context,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workflowRunJob: WorkflowRunJob
): Context => {
  return {} as Context
}

export const createWorkflowRunStepSpan = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: Context,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workflowRunJob: WorkflowRunJob
): void => {}
