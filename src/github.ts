import { Octokit } from '@octokit/rest'
import { Endpoints } from '@octokit/types'

export type WorkflowRun =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowJobs =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']

export const createOctokit = (token: string): Octokit => {
  return new Octokit({
    auth: token
  })
}

export const fetchWorkflowRun = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<WorkflowRun> => {
  const workflow = await octokit.rest.actions.getWorkflowRun({
    owner,
    repo,
    run_id: runId
  })
  return workflow.data
}

export const fetchWorkflowRunJobs = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number
): Promise<WorkflowJobs> => {
  const workflowJob = await octokit.rest.actions.listJobsForWorkflowRun({
    owner,
    repo,
    run_id: runId,
    per_page: 100
  })
  return workflowJob.data.jobs
}
