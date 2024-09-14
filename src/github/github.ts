import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import { EventPayloadMap } from '@octokit/webhooks-types'
import { Endpoints } from '@octokit/types'
import * as core from '@actions/core'
import settings from '../settings.js'

// TODO: attemptを取得して指定しないと、連続で実行されると値取れない場合ありそう

export type WorkflowRun =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowRunJobs =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']

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
    ...res.data
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
  return res.data.jobs
}

export const getWorkflowRunContext = (): WorkflowRunContext => {
  const ghContext = github.context

  // If this workflow is trigged on `workflow_run`, set runId it's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent = github.context
    .payload as EventPayloadMap['workflow_run']
  if (!workflowRunEvent?.workflow_run) {
    core.warning(
      'Workflow run event is not found. This case is for local testing only.'
    )
  }
  const runId = workflowRunEvent?.workflow_run?.id ?? settings.workflowRunId

  if (runId === undefined) {
    throw new Error('runId is undefined.')
  }

  return {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    runId
  }
}
