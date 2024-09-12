import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import { EventPayloadMap } from '@octokit/webhooks-types'

// @octokit/types hadles xxx_at as string (e.g. created_at). For using Date type, difine original type.
export interface WorkflowRun {
  readonly created_at: Date
  readonly status: string | null
  readonly id: number
  readonly name: string | null | undefined
  readonly run_number: number
}
export interface WorkflowRunJob {
  readonly created_at: Date
  readonly started_at: Date
  readonly completed_at: Date | null
  readonly id: number
  readonly name: string
  readonly run_id: number
  readonly workflow_name: string | null
}
export type WorkflowRunJobs = readonly WorkflowRunJob[]

export interface WorkflowRunContext {
  readonly owner: string
  readonly repo: string
  readonly runId: number
}

export const createOctokit = (token: string): Octokit => {
  // TODO: try to use github.getOctokit
  return new Octokit({
    auth: token
  })
}

export const fetchWorkflowRun = async (
  octokit: Octokit,
  workflowContext: WorkflowRunContext
): Promise<WorkflowRun> => {
  const res = await octokit.rest.actions.getWorkflowRun({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId
  })
  return {
    created_at: new Date(res.data.created_at),
    status: res.data.status,
    id: res.data.id,
    name: res.data.name,
    run_number: res.data.run_number
  }
}

export const fetchWorkflowRunJobs = async (
  octokit: Octokit,
  workflowContext: WorkflowRunContext
): Promise<WorkflowRunJobs> => {
  const res = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId,
    per_page: 100
  })
  const workflowRunJobs: WorkflowRunJobs = res.data.jobs.map(job => ({
    created_at: new Date(job.created_at),
    started_at: new Date(job.started_at),
    completed_at: job.completed_at ? new Date(job.completed_at) : null,
    id: job.id,
    name: job.name,
    run_id: job.run_id,
    workflow_name: job.workflow_name
  }))
  return workflowRunJobs
}

export const getWorkflowRunContext = (): WorkflowRunContext => {
  const ghContext = github.context

  // If this workflow is triggerd on `workflow_run`, set runId it's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent: EventPayloadMap['workflow_run'] | undefined =
    github.context.payload.workflow_run
  console.log(workflowRunEvent)
  const runId = workflowRunEvent?.workflow_run?.id ?? ghContext.runId

  return {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    runId
  }
}
