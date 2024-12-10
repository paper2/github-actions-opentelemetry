import { Context, ROOT_CONTEXT } from '@opentelemetry/api'
import {
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowRunJob,
  getLatestCompletedAt
} from '../github/index.js'
import * as opentelemetry from '@opentelemetry/api'
import { fail } from 'assert'
import { calcDiffSec } from '../utils/calc-diff-sec.js'
import * as core from '@actions/core'

export const createWorkflowRunTrace = (
  workflowRun: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
): Context => {
  if (!workflowRun.name) fail()
  const span = createSpan(
    ROOT_CONTEXT,
    workflowRun.name,
    workflowRun.created_at,
    getLatestCompletedAt(workflowRunJobs),
    // TODO: add workflowRun.id into tags or URL
    {}
  )

  return opentelemetry.trace.setSpan(ROOT_CONTEXT, span)
}

export const createWorkflowRunJobSpan = (
  ctx: Context,
  job: WorkflowRunJob
): Context => {
  if (!job.completed_at || job.steps === undefined) fail()

  const spanWithWaiting = createSpan(
    ctx,
    `${job.name} with time of waiting runner`,
    job.created_at,
    job.completed_at,
    {}
  )
  const ctxWithWaiting = opentelemetry.trace.setSpan(ctx, spanWithWaiting)

  const waitingSpanName = `waiting runner for ${job.name}`
  const jobQueuedDuration = calcDiffSec(
    new Date(job.created_at),
    new Date(job.started_at)
  )
  if (jobQueuedDuration >= 0) {
    createSpan(
      ctxWithWaiting,
      waitingSpanName,
      job.created_at,
      job.started_at,
      {}
    )
  } else {
    core.notice(
      `${job.name}: Skip to create "${waitingSpanName}" span. This is a GitHub specification issue that occasionally occurs, so it can't be recover.`
    )
  }

  const jobSpan = createSpan(
    ctxWithWaiting,
    job.name,
    job.started_at,
    job.completed_at,
    {}
  )

  return opentelemetry.trace.setSpan(ctxWithWaiting, jobSpan)
}

export const createWorkflowRunStepSpan = (
  ctx: Context,
  job: WorkflowRunJob
): void => {
  if (job.steps === undefined) fail()
  job.steps.map(step => {
    if (step.started_at == null || step.completed_at == null) fail()

    createSpan(ctx, step.name, step.started_at, step.completed_at, {})
  })
}

const createSpan = (
  ctx: Context,
  name: string,
  startAt: string,
  endAt: string,
  attributes: opentelemetry.Attributes
): opentelemetry.Span => {
  const tracer = opentelemetry.trace.getTracer('github-actions-opentelemetry')
  const startTime = new Date(startAt)
  const endTime = new Date(endAt)

  const span = tracer.startSpan(name, { startTime, attributes }, ctx)
  span.end(endTime)
  return span
}
