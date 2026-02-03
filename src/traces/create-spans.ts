import { Context, ROOT_CONTEXT } from '@opentelemetry/api'
import {
  WorkflowJob,
  WorkflowJobs,
  getLatestCompletedAt
} from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'
import { calcDiffSec } from '../utils/calc-diff-sec.js'
import * as core from '@actions/core'
import { Workflow } from 'src/github/types.js'

export const createWorkflowTrace = (
  workflow: Workflow,
  workflowJobs: WorkflowJobs
): Context => {
  const span = createSpan(
    ROOT_CONTEXT,
    workflow.name,
    workflow.created_at,
    getLatestCompletedAt(workflowJobs),
    workflow.conclusion || '', // '' is converted to UNSET status. we should not use ''.
    { ...buildWorkflowAttributes(workflow) }
  )

  return opentelemetry.trace.setSpan(ROOT_CONTEXT, span)
}

export const createWorkflowJobSpan = (
  ctx: Context,
  job: WorkflowJob
): Context => {
  if (!job.completed_at) {
    throw new Error(
      `Job completed_at is required for span creation: ${job.name} (id: ${job.id})`
    )
  }
  const spanWithWaitingName = `${job.name} with time of waiting runner`
  const spanWithWaitingAttrs = { ...buildWorkflowJobAttributes(job) }
  const spanWithWaiting = createSpan(
    ctx,
    spanWithWaitingName,
    job.created_at,
    job.completed_at,
    job.conclusion,
    spanWithWaitingAttrs
  )
  const ctxWithWaiting = opentelemetry.trace.setSpan(ctx, spanWithWaiting)

  const waitingSpanName = `waiting runner for ${job.name}`
  const jobQueuedDuration = calcDiffSec(job.created_at, job.started_at)
  if (jobQueuedDuration >= 0) {
    const waitingAttrs = { ...buildWorkflowJobAttributes(job) }
    const waitingSpan = createSpan(
      ctxWithWaiting,
      waitingSpanName,
      job.created_at,
      job.started_at,
      'success', // waiting runner is not a error.
      waitingAttrs
    )
  } else {
    core.info(
      `${job.name}: Skip to create "${waitingSpanName}" span. This is a GitHub specification issue that occasionally occurs, so it can't be recover.`
    )
  }

  const jobAttrs = { ...buildWorkflowJobAttributes(job) }
  const jobSpanName = job.name
  const jobSpan = createSpan(
    ctxWithWaiting,
    jobSpanName,
    job.started_at,
    job.completed_at,
    job.conclusion,
    jobAttrs
  )
  return opentelemetry.trace.setSpan(ctxWithWaiting, jobSpan)
}

export const createWorkflowRunStepSpan = (
  ctx: Context,
  job: WorkflowJob
): void => {
  job.steps.forEach(step => {
    if (step.started_at == null || step.completed_at == null) {
      console.warn(
        `Step ${step.name} in job ${job.name} has null timestamps, skipping span creation`
      )
      return
    }
    createSpan(
      ctx,
      step.name,
      step.started_at,


      step.completed_at,
      step.conclusion,
      {}
    )
  })
}

const createSpan = (
  ctx: Context,
  name: string,
  startAt: Date,
  endAt: Date,
  // TODO: use user defined type instead of string
  conclusion: string,
  attributes: opentelemetry.Attributes
): opentelemetry.Span => {
  const tracer = opentelemetry.trace.getTracer('github-actions-opentelemetry')
  const span = tracer.startSpan(name, { startTime: startAt, attributes }, ctx)
  span.setStatus(getSpanStatusFromConclusion(conclusion))
  span.end(endAt)
  return span
}

// In reality, the values of `conclusion` for step, job, and workflow might differ.
// However, I couldn't find a complete definition in the official documentation.
// The type of `conclusion` for a job is defined, but for step and workflow, it is just a string.
// At the very least, we know that `conclusion` for step, job, and workflow can take the values `success` and `failure`,
// so I have summarized the definitions accordingly.
export const getSpanStatusFromConclusion = (
  status: string
): opentelemetry.SpanStatus => {
  switch (status) {
    case 'success':
      return { code: opentelemetry.SpanStatusCode.OK }
    case 'failure':
    case 'timed_out':
      return { code: opentelemetry.SpanStatusCode.ERROR }
    default:
      return { code: opentelemetry.SpanStatusCode.UNSET }
  }
}

// TODO: add tests for these functions
const buildWorkflowAttributes = (
  workflowRun: Workflow
): opentelemetry.Attributes => ({
  repository: workflowRun.repository.full_name,
  run_id: workflowRun.id,
  run_attempt: workflowRun.run_attempt,
  url: workflowRun.html_url
})

// TODO: add tests for these functions
const buildWorkflowJobAttributes = (
  job: WorkflowJob
): opentelemetry.Attributes => ({
  'job.id': job.id,
  'job.conclusion': job.conclusion,
  'runner.name': job.runner_name || undefined,
  'runner.group': job.runner_group_name || undefined
})
