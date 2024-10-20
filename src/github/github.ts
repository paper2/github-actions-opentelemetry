import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import { EventPayloadMap } from '@octokit/webhooks-types'
import settings from '../settings.js'
import {
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowRunContext,
  WorkflowResults,
  GitHubContext
} from './types.js'
import * as core from '@actions/core'

export const fetchWorkflowResults = async (): Promise<WorkflowResults> => {
  const token = core.getInput('GITHUB_TOKEN')
  const octokit = new Octokit({ auth: token })
  const workflowRunContext = getWorkflowRunContext(github.context)
  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowRunContext)
    const workflowRunJobs = await fetchWorkflowRunJobs(
      octokit,
      workflowRunContext
    )
    return { workflowRun, workflowRunJobs }
  } catch (error) {
    core.error('failed to get results of workflow run')
    throw error
  }
}

const fetchWorkflowRun = async (
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

// TODO: attemptを取得して指定しないと、連続で実行されると値取れない場合ありそう
const fetchWorkflowRunJobs = async (
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

// TODO: testのためのexportになっていないか検討
export const getWorkflowRunContext = (
  context: GitHubContext
): WorkflowRunContext => {
  // If this workflow is trigged on `workflow_run`, set runId it's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent = context.payload as
    | EventPayloadMap['workflow_run']
    | undefined

  const runId = settings.workflowRunId ?? workflowRunEvent?.workflow_run?.id

  if (runId === undefined) {
    throw new Error('Workflow run id is undefined.')
  }

  return {
    owner: settings.owner ?? context.repo.owner,
    repo: settings.repository ?? context.repo.repo,
    runId
  }
}

export const getLatestCompletedAt = (jobs: WorkflowRunJobs): string => {
  const jobCompletedAtDates = jobs
    .map(job => {
      if (job.completed_at === null) return null
      return new Date(job.completed_at)
    })
    .filter(v => v !== null)
  return new Date(Math.max(...jobCompletedAtDates.map(Number))).toISOString()
}
