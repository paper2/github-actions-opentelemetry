import { Endpoints } from '@octokit/types'
import { context } from '@actions/github'

export type WorkflowRun =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowRunJobs =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']
export type WorkflowRunJob = WorkflowRunJobs[number]

export interface WorkflowRunContext {
  readonly owner: string
  readonly repo: string
  readonly runId: number
  readonly attempt_number: number
}
export interface WorkflowResults {
  workflowRun: WorkflowRun
  workflowRunJobs: WorkflowRunJobs
}

export type GitHubContext = typeof context
