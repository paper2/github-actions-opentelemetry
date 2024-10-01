import { Context, ROOT_CONTEXT } from '@opentelemetry/api'
import {
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowRunJob
} from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'

export const createWorkflowRunTrace = (
  workflowRun: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): Context => {
  console.log(workflowRunJobs)
  const tracer = opentelemetry.trace.getTracer('hoge-test')
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
  return opentelemetry.trace.setSpan(ROOT_CONTEXT, rootSpan)
}

export const createWorkflowRunJobSpan = (
  ctx: Context,
  workflowRunJob: WorkflowRunJob
): Context => {
  console.log(ctx, workflowRunJob)
  return {} as Context
}

export const createWorkflowRunStepSpan = (
  ctx: Context,
  workflowRunJob: WorkflowRunJob
): void => {
  console.log(ctx, workflowRunJob)
}
