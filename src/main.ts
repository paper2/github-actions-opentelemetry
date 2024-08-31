import * as github from '@actions/github'
import * as core from '@actions/core'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs
} from './github.js'
import { createGuage, shutdown, JobMetricsAttributes } from './metrics/index.js'

type RunContext = {
  ghContext: typeof github.context
  token: string
  octokit: ReturnType<typeof createOctokit>
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const ghContext = github.context
  const token = core.getInput('github-token')
  const octokit = createOctokit(token)
  const RunContext = { ghContext, token, octokit }

  try {
    await exportMetrics(RunContext)
    core.debug('Metrics exported successfully.')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function exportMetrics(context: RunContext): Promise<void> {
  try {
    // for test
    // export GITHUB_REPOSITORY=paper2/github-actions-opentelemetry
    // export GITHUB_RUN_ID=10640837411

    const workflowRun = await fetchWorkflowRun(
      context.octokit,
      context.ghContext.repo.owner,
      context.ghContext.repo.repo,
      context.ghContext.runId
    )
    const workflowJobs = await fetchWorkflowRunJobs(
      context.octokit,
      context.ghContext.repo.owner,
      context.ghContext.repo.repo,
      context.ghContext.runId
    )

    for (const job of workflowJobs) {
      if (!job.completed_at) {
        continue
      }

      const created_at = new Date(job.created_at)
      const started_at = new Date(job.started_at)
      const completed_at = new Date(job.completed_at)
      const jobMetricsAttributes: JobMetricsAttributes = {
        id: job.id,
        name: job.name,
        run_id: job.run_id,
        workflow_name: job.workflow_name || ''
      }

      createGuage(
        'job_queued_duration',
        calcDifferenceSecond(started_at, created_at),
        jobMetricsAttributes
      )
      createGuage(
        'job_duration',
        calcDifferenceSecond(completed_at, started_at),
        jobMetricsAttributes
      )
    }

    await shutdown()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// TODO: utilとか作る？
export const calcDifferenceSecond = (
  targetDateTime: Date,
  compareDateTime: Date
): number => {
  let diffMilliSecond = targetDateTime.getTime() - compareDateTime.getTime()

  return Math.floor(diffMilliSecond / 1000)
}
