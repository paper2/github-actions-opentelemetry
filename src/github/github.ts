import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
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
import { isTooManyTries, retryAsync } from 'ts-retry'
import { WorkflowRunEvent } from '@octokit/webhooks-types'

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
            .map(job => toWorkflowJob(job, workflowRes.event))
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
  const owner = settings.owner ?? context.repo.owner
  const repo = settings.repository ?? context.repo.repo

  if (context.eventName !== 'workflow_run')
    return {
      owner,
      repo,
      attempt_number: context.runNumber || 1, // 1 is for testing.
      runId: settings.workflowRunId ?? context.runId
    }

  // If this workflow is trigged on `workflow_run`, set runId targeted workflow's id.
  // Detail of `workflow_run` event: https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run
  const workflowRunEvent = context.payload as WorkflowRunEvent
  return {
    owner,
    repo,
    attempt_number: workflowRunEvent.workflow_run.run_attempt || 1, // 1 is for testing.
    runId: settings.workflowRunId ?? workflowRunEvent.workflow_run.id
  }
}

export const getLatestCompletedAt = (jobs: WorkflowJob[]): string => {
  // Filter jobs that have completed_at with proper type guard
  const completedJobs = jobs.filter(
    (job): job is WorkflowJob & { completed_at: string } =>
      job.completed_at !== null && job.completed_at !== undefined
  )

  if (completedJobs.length === 0) {
    // Fallback: use current time if no completed jobs
    console.warn(
      'No completed jobs found, using current time. This may indicate workflow is still in progress.'
    )
    return new Date().toISOString()
  }

  try {
    const jobCompletedAtDates = completedJobs.map(job => {
      const date = new Date(job.completed_at)
      if (isNaN(date.getTime())) {
        throw new Error(
          `Invalid completed_at timestamp: ${job.completed_at} for job: ${job.name}`
        )
      }
      return date
    })
    const maxDateNumber = Math.max(...jobCompletedAtDates.map(Number))
    return new Date(maxDateNumber).toISOString()
  } catch (error) {
    console.error('Error processing job completion times:', error)
    // Fallback to current time but log the issue
    return new Date().toISOString()
  }
}
