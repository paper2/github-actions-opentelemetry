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
import { fail } from 'assert'
import { isTooManyTries, retryAsync } from 'ts-retry'
import { checkCompleted } from './check-completed.js'

export const fetchWorkflowResults = async (
  delayMs = 1000,
  maxTry = 10
): Promise<WorkflowResults> => {
  const token = core.getInput('GITHUB_TOKEN')
  const octokit = new Octokit({ auth: token })
  const workflowRunContext = getWorkflowRunContext(github.context)
  try {
    // A workflow sometime has not completed in spite of trigger of workflow completed event.
    // FYI: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
    const results = await retryAsync(
      async () => ({
        workflowRun: await fetchWorkflowRun(octokit, workflowRunContext),
        workflowRunJobs: await fetchWorkflowRunJobs(octokit, workflowRunContext)
      }),
      {
        delay: delayMs,
        maxTry,
        onError: (err, currentTry) =>
          console.error(`current try: ${currentTry}`, err),
        until: lastResult => checkCompleted(lastResult)
      }
    )
    core.debug(`WorkflowResults: ${JSON.stringify(results)}`)
    return results
  } catch (err) {
    core.error('failed to get results of workflow run')
    if (isTooManyTries(err)) {
      console.error('retry count exceeded maxTry')
    }
    console.error(err)
    throw err
  }
}

const fetchWorkflowRun = async (
  octokit: Octokit,
  workflowContext: WorkflowRunContext
): Promise<WorkflowRun> => {
  const res = await octokit.rest.actions.getWorkflowRunAttempt({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId,
    attempt_number: workflowContext.attempt_number
  })
  return {
    ...res.data
  }
}

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

export const getWorkflowRunContext = (
  context: GitHubContext
): WorkflowRunContext => {
  // If this workflow is trigged on `workflow_run`, set runId it's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent = context.payload as
    | EventPayloadMap['workflow_run']
    | undefined

  const runId = settings.workflowRunId ?? workflowRunEvent?.workflow_run?.id
  if (!runId) fail('Workflow run id should be defined.')

  return {
    owner: settings.owner ?? context.repo.owner,
    repo: settings.repository ?? context.repo.repo,
    attempt_number: workflowRunEvent?.workflow_run?.run_attempt || 1,
    runId
  }
}

export const getLatestCompletedAt = (jobs: WorkflowRunJobs): string => {
  const jobCompletedAtDates = jobs.map(job => {
    if (job.completed_at === null) fail('Jobs should be completed.')
    return new Date(job.completed_at)
  })
  const maxDateNumber = Math.max(...jobCompletedAtDates.map(Number))
  return new Date(maxDateNumber).toISOString()
}
