import { Octokit } from '@octokit/rest'
import { ApplicationSettings } from '../settings.js'
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

export const createOctokitClient = (): Octokit => {
  const token = core.getInput('GITHUB_TOKEN') || process.env.GITHUB_TOKEN

  return new Octokit({
    baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    auth: token,
    log: {
      debug: (msg: string) => core.debug(msg),
      info: (msg: string) => core.info(msg),
      warn: (msg: string) => core.warning(msg),
      error: (msg: string) => core.error(msg)
    }
  })
}

export const fetchWorkflowResults = async (
  octokit: Octokit,
  workflowContext: WorkflowContext,
  delayMs = 1000,
  maxTry = 10
): Promise<WorkflowResults> => {
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
        const workflowJobs = workflowJobsRes
          .map(job => toWorkflowJob(job, workflowRes.event))
          .filter((job): job is WorkflowJob => job !== null)
        if (workflowJobs.length === 0) {
          throw new Error(`no completed jobs found for workflow run.`)
        }
        return {
          workflow: toWorkflow(workflowRes),
          workflowJobs
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
    if (isTooManyTries(err)) console.error('retry count exceeded maxTry')
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
  const jobs = await octokit.paginate(
    octokit.rest.actions.listJobsForWorkflowRun,
    {
      owner: workflowContext.owner,
      repo: workflowContext.repo,
      run_id: workflowContext.runId,
      per_page: 50
    },
    response => {
      // With this overload, `response.data` is typically the array of jobs.
      // However, Octokit paginate overloads differ, so handle both shapes:
      // - response.data: WorkflowJobsResponse
      // - response.data: { jobs: WorkflowJobsResponse }
      const data = response.data as unknown
      const pageJobs: WorkflowJobsResponse = Array.isArray(data)
        ? (data as WorkflowJobsResponse)
        : ((data as { jobs?: WorkflowJobsResponse }).jobs ?? [])

      core.info(
        `GET ${response.url} -> ${response.status} (items this page: ${pageJobs.length})`
      )
      core.debug(`Response headers: ${JSON.stringify(response.headers)}`)

      // Debug-print a compact per-job summary.
      // Note: keep this in debug/info level to avoid log bloat on large runs.
      // for (const job of pageJobs) {
      //   core.debug(
      //     `job: ${JSON.stringify(
      //       {
      //         id: job.id,
      //         name: job.name,
      //         status: job.status,
      //         conclusion: job.conclusion,
      //         created_at: job.created_at,
      //         started_at: job.started_at,
      //         completed_at: job.completed_at,
      //         runner_name: job.runner_name,
      //         runner_group_name: job.runner_group_name,
      //         workflow_name: job.workflow_name,
      //         steps_count: job.steps?.length ?? 0
      //       },
      //       null,
      //       0
      //     )}`
      //   )

        // Print each step's details (name/timing/status) for troubleshooting.
        // Use debug level to avoid massive logs; enable with ACTIONS_STEP_DEBUG=true.
        // const steps = job.steps ?? []
        // for (const step of steps) {
        //   core.debug(
        //     `  step: ${JSON.stringify(
        //       {
        //         name: step.name,
        //         number: (step as { number?: number }).number,
        //         status: step.status,
        //         conclusion: step.conclusion,
        //         started_at: step.started_at,
        //         completed_at: step.completed_at
        //       },
        //       null,
        //       0
        //     )}`
        //   )
        // }
      // }

      return pageJobs
    }
  )

  core.info(
    `Fetched ${jobs.length} workflow jobs for run_id=${workflowContext.runId} (per_page=50)`
  )
  return jobs
}

export const getWorkflowContext = (
  context: GitHubContext,
  settings: ApplicationSettings
): WorkflowContext => {
  const owner = settings.owner ?? context.repo.owner
  const repo = settings.repository ?? context.repo.repo

  if (context.eventName !== 'workflow_run')
    return {
      owner,
      repo,
      attempt_number: context.runAttempt || 1, // 1 is for testing.
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

export const getLatestCompletedAt = (jobs: WorkflowJob[]): Date => {
  if (jobs.length === 0)
    throw new Error('no jobs found to get latest completed_at date.')
  const jobCompletedAtDates = jobs.map(job => job.completed_at)
  const maxDateNumber = Math.max(...jobCompletedAtDates.map(Number))
  return new Date(maxDateNumber)
}
