import { Octokit } from '@octokit/rest'

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

export interface WorkflowContext {
  readonly owner: string
  readonly repo: string
  readonly runId: number
}

export const createOctokit = (token: string): Octokit => {
  return new Octokit({
    auth: token
  })
}

export const fetchWorkflowRun = async (
  octokit: Octokit,
  workflowContext: WorkflowContext
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
  workflowContext: WorkflowContext
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
