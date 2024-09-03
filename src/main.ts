import * as github from '@actions/github'
import * as core from '@actions/core'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs,
  WorkflowRun,
  WorkflowRunJobs,
  WorkflowContext
} from './github.js'
import {
  createGuage,
  shutdown,
  JobMetricsAttributes,
  WorkflowMetricsAttributes
} from './metrics/index.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const ghContext = github.context
  const token = core.getInput('github-token')
  const octokit = createOctokit(token)
  const workflowContext: WorkflowContext = {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    runId: ghContext.runId
  }

  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowContext)
    const workflowJobs = await fetchWorkflowRunJobs(octokit, workflowContext)
    createJobGuages(workflowJobs)
    createWorkflowGuages(workflowRun, workflowJobs)
    await shutdown()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const createWorkflowGuages = (
  workflow: WorkflowRun,
  workflowRunJobs: WorkflowRunJobs
) => {
  if (workflow.status !== 'completed') {
    throw new Error(`Workflow(id: ${workflow.id}) is not completed.`)
  }
  const jobCompletedAtDates = workflowRunJobs.map(
    job => job.completed_at || job.created_at
  )
  const jobCompletedAtMax = new Date(
    Math.max(...jobCompletedAtDates.map(Number))
  )

  const jobStartedAtDates = workflowRunJobs.map(job => job.started_at)
  const jobStartedtAtMin = new Date(Math.min(...jobStartedAtDates.map(Number)))
  const workflowMetricsAttributes: WorkflowMetricsAttributes = {
    id: workflow.id,
    run_id: workflow.run_number,
    workflow_name: workflow.name || ''
  }

  createGuage(
    'workflow_queued_duration',
    calcDiffSec(jobStartedtAtMin, workflow.created_at),
    workflowMetricsAttributes
  )
  createGuage(
    'workflow_duration',
    calcDiffSec(jobCompletedAtMax, workflow.created_at),
    workflowMetricsAttributes
  )
}

const createJobGuages = (workflowJobs: WorkflowRunJobs) => {
  for (const job of workflowJobs) {
    if (!job.completed_at) {
      core.warning(`Job ${job.id} is not completed yet.`)
      continue
    }

    const jobMetricsAttributes: JobMetricsAttributes = {
      id: job.id,
      name: job.name,
      run_id: job.run_id,
      workflow_name: job.workflow_name || ''
    }

    createGuage(
      'job_queued_duration',
      calcDiffSec(job.started_at, job.created_at),
      jobMetricsAttributes
    )
    createGuage(
      'job_duration',
      calcDiffSec(job.completed_at, job.started_at),
      jobMetricsAttributes
    )
  }
}

// TODO: utilとか作る？
export const calcDiffSec = (
  targetDateTime: Date,
  compareDateTime: Date
): number => {
  let diffMilliSecond = targetDateTime.getTime() - compareDateTime.getTime()

  return Math.floor(diffMilliSecond / 1000)
}
