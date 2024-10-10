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
  // TODO: metricsと同じロジックの部分はgithubディレクトリに切り出す
  // TODO: completed_atだけ確認するようにする。queueの時間計測する前提なので両方見ると不整合が発生する。
  const jobCompletedAtDates = workflowRunJobs.map(
    job => new Date(job.completed_at || job.created_at)
  )
  const endAt = new Date(
    Math.max(...jobCompletedAtDates.map(Number))
  ).toISOString()

  const span = createSpan(
    ROOT_CONTEXT,
    workflowRun.name || `${workflowRun.workflow_id}`,
    workflowRun.run_started_at || workflowRun.created_at,
    endAt,
    // TODO: Set Attributes
    {}
  )

  return opentelemetry.trace.setSpan(ROOT_CONTEXT, span)
}

export const createWorkflowRunJobSpan = (
  ctx: Context,
  job: WorkflowRunJob
): Context | null => {
  if (job.status !== 'completed' || job.completed_at === null) {
    console.error(`job is not completed. (${job.name})`)
    return null
  }
  if (job.steps === undefined || job.steps.length === 0) {
    console.warn(`job (${job.name}) has no steps.`)
    return null
  }

  const spanWithWaiting = createSpan(
    ctx,
    `${job.name} with time of waiting runner`,
    job.created_at,
    job.completed_at,
    // TODO: Set Attributes
    {}
  )
  const ctxWithWaiting = opentelemetry.trace.setSpan(ctx, spanWithWaiting)

  createWaitRunnerSpan(ctxWithWaiting, job)

  const span = createSpan(
    ctxWithWaiting,
    job.name,
    job.started_at,
    job.completed_at,
    // TODO: Set Attributes
    {}
  )

  return opentelemetry.trace.setSpan(ctxWithWaiting, span)
}

const createWaitRunnerSpan = (ctx: Context, job: WorkflowRunJob): void => {
  createSpan(
    ctx,
    'Wait Runner',
    job.created_at,
    job.started_at,
    // TODO: Set Attributes
    {}
  )
}

export const createWorkflowRunStepSpan = (
  ctx: Context,
  job: WorkflowRunJob
): void => {
  if (job.steps === undefined || job.steps.length === 0) {
    console.warn(`job (${job.name}) has no steps.`)
    return
  }

  // NOTE: GitHub Action's first step (Set up job) is flaky. :(
  // Sometimes it starts before job.started.
  job.steps.map(step => {
    if (step.started_at == null || step.completed_at == null) {
      console.warn(
        `step (${step.name}) time is null|undifined. (started_at:${step.started_at}, complated_at:${step.completed_at})`
      )
      return
    }
    const span = createSpan(
      ctx,
      step.name,
      step.started_at,
      step.completed_at,
      // TODO: Set Attributes
      {}
    )
    if (step.conclusion === 'success') {
      span.setStatus({ code: opentelemetry.SpanStatusCode.OK })
    } else {
      span.setStatus({ code: opentelemetry.SpanStatusCode.ERROR })
    }
  })
}

const tracer = opentelemetry.trace.getTracer(
  'github-actions-opentelemetry-github'
)

const createSpan = (
  ctx: Context,
  name: string,
  startedAt: string,
  endAt: string,
  attributes: opentelemetry.Attributes
): opentelemetry.Span => {
  const startTime = new Date(startedAt)
  const endTime = new Date(endAt)

  const span = tracer.startSpan(name, { startTime, attributes }, ctx)
  span.end(endTime)
  return span
}
