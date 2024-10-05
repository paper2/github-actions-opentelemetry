import { Context, ROOT_CONTEXT } from '@opentelemetry/api'
import {
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowRunJob
} from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'

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

  const stepCompletedAtDates = job.steps.map(step =>
    step.completed_at ? new Date(step.completed_at) : undefined
  )
  const endAt = new Date(
    Math.max(...stepCompletedAtDates.map(Number))
  ).toISOString()

  const span = createSpan(
    ctx,
    job.name,
    job.created_at,
    // Use last step completed_at insted of job.completed_at because last workflow job includes time of no running steps.
    endAt,
    // TODO: Set Attributes
    {}
  )

  return opentelemetry.trace.setSpan(ctx, span)
}

const createWaitRunnerSpan = (ctx: Context, job: WorkflowRunJob): void => {
  if (job.steps === undefined || job.steps.length === 0) {
    console.warn(`job (${job.name}) has no steps.`)
    return
  }

  const setupStep = job.steps[0]
  if (setupStep.name !== 'Set up job') {
    console.warn(`This step is assumed "Set up job" but "${setupStep.name}".`)
  }

  if (setupStep.started_at == null || setupStep.completed_at == null) {
    console.warn(
      `step (${setupStep.name}) time is null|undifined. (started_at:${setupStep.started_at}, complated_at:${setupStep.completed_at})`
    )
    return
  }

  createSpan(
    ctx,
    'Wait Runner',
    job.created_at,
    // use 'Set up job' step's started_at becaues (job.started_at - job.created_at) includes it.
    setupStep.started_at,
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

  createWaitRunnerSpan(ctx, job)

  job.steps.map(step => {
    if (step.started_at == null || step.completed_at == null) {
      console.warn(
        `step (${step.name}) time is null|undifined. (started_at:${step.started_at}, complated_at:${step.completed_at})`
      )
      return
    }
    createSpan(
      ctx,
      step.name,
      step.started_at,
      step.completed_at,
      // TODO: Set Attributes
      {}
    )
  })
}
