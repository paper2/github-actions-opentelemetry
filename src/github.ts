import { Octokit } from '@octokit/rest'
import { Endpoints } from '@octokit/types'

export type WorkflowRun =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowJobs =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']

export interface WorkFlowContext {
  owner: string,
  repo: string,
  runId: number
}

export const createOctokit = (token: string): Octokit => {
  return new Octokit({
    auth: token
  })
}

export const fetchWorkflowRun = async (
  octokit: Octokit,
  workflowContext: WorkFlowContext
): Promise<WorkflowRun> => {
  const workflow = await octokit.rest.actions.getWorkflowRun({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId
  })
  return workflow.data
}

export const fetchWorkflowRunJobs = async (
  octokit: Octokit,
  workflowContext: WorkFlowContext
): Promise<WorkflowJobs> => {
  const workflowJob = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId,
    per_page: 100
  })
  return workflowJob.data.jobs
}
