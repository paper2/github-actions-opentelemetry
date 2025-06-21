import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import { EventPayloadMap } from '@octokit/webhooks-types'
import settings from '../settings.js'
import {
  WorkflowContext,
  WorkflowResults,
  GitHubContext,
  WorkflowJob,
  toWorkflowRun as toWorkflow,
  toWorkflowJob,
  WorkflowResponse,
  WorkflowJobsResponse
} from './types.js'
import * as core from '@actions/core'
import { fail } from 'assert'
import { isTooManyTries, retryAsync } from 'ts-retry'

export const fetchWorkflowResults = async (
  delayMs = 1000,
  maxTry = 10
): Promise<WorkflowResults> => {
  const token = core.getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN // read environment variable for testing
  const octokit = new Octokit({
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    auth: token
  })
  const workflowContext = getWorkflowContext(github.context)
  try {
    // A workflow sometime has not completed in spite of trigger of workflow completed event.
    // FYI: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
    const results = await retryAsync(
      async () => {
        const workflowRes = await fetchWorkflow(octokit, workflowContext)
        const workflowJobsRes = await fetchWorkflowJobs(
          octokit,
          workflowContext
        )
        return {
          workflow: toWorkflow(workflowRes),
          workflowJobs: workflowJobsRes
            .map(toWorkflowJob)
            .filter((job): job is WorkflowJob => job !== null)
        }
      },
      {
        delay: delayMs,
        maxTry,
        onError: (err, currentTry) =>
          console.error(`current try: ${currentTry}`, err)
      }
    )
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

const fetchWorkflow = async (
  octokit: Octokit,
  workflowContext: WorkflowContext
): Promise<WorkflowResponse> => {
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

const fetchWorkflowJobs = async (
  octokit: Octokit,
  workflowContext: WorkflowContext
): Promise<WorkflowJobsResponse> => {
  const res = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: workflowContext.owner,
    repo: workflowContext.repo,
    run_id: workflowContext.runId,
    per_page: 100
  })
  return res.data.jobs
}

const getWorkflowContext = (context: GitHubContext): WorkflowContext => {
  // If this workflow is trigged on `workflow_run`, set runId it's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent = context.payload as
    | EventPayloadMap['workflow_run']
    | undefined

  // Priority order:
  // 1. Environment variable (for testing)
  // 2. workflow_run event payload (existing functionality)
  // 3. Current workflow's runId (new functionality for push, pull_request, etc.)
  const runId =
    settings.workflowRunId ??
    workflowRunEvent?.workflow_run?.id ??
    context.runId

  if (!runId) fail('Workflow run id should be defined.')

  return {
    owner: settings.owner ?? context.repo.owner,
    repo: settings.repository ?? context.repo.repo,
    attempt_number:
      workflowRunEvent?.workflow_run?.run_attempt || context.runNumber || 1,
    runId
  }
}

export const getLatestCompletedAt = (jobs: WorkflowJob[]): string => {
  // Filter jobs that have completed_at (some might be null for incomplete jobs)
  const completedJobs = jobs.filter(job => job.completed_at)

  if (completedJobs.length === 0) {
    // Fallback: use current time if no completed jobs
    console.log('No completed jobs found, using current time')
    return new Date().toISOString()
  }

  const jobCompletedAtDates = completedJobs.map(
    job => new Date(job.completed_at)
  )
  const maxDateNumber = Math.max(...jobCompletedAtDates.map(Number))
  return new Date(maxDateNumber).toISOString()
}
