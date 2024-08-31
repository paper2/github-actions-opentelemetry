import * as github from '@actions/github'
import * as core from '@actions/core'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs,
  WorkflowJobs,
  WorkFlowContext,
  WorkflowRun
} from './github.js'
import { createGuage, shutdown, JobMetricsAttributes } from './metrics/index.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const ghContext = github.context
  const token = core.getInput('github-token')
  const octokit = createOctokit(token)
  const workflowContext: WorkFlowContext = {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    runId: ghContext.runId
  }

  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowContext)
    const workflowJobs = await fetchWorkflowRunJobs(octokit, workflowContext)
    createJobGuages(workflowJobs)
    await shutdown()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

// const createWorkflowGuages = (workflow: WorkflowRun) => {
//   if (!workflow) {
//     core.warning('Workflow is not completed yet.')
//     return
//   }
//   const created_at = new Date(workflow.created_at)
//   const completed_at = new Date(workflow.completed_at)
//   const workflowMetricsAttributes: JobMetricsAttributes = {
//     id: workflow.id,
//     name: workflow.name,
//     run_id: workflow.run_number,
//     workflow_name: workflow.name
//   }

//   createGuage(
//     'workflow_queued_duration',
//     calcDifferenceSecond(updated_at, created_at),
//     workflowMetricsAttributes
//   )
//   createGuage(
//     'workflow_duration',
//     calcDifferenceSecond(completed_at, updated_at),
//     workflowMetricsAttributes
//   )
// }

const createJobGuages = (workflowJobs: WorkflowJobs) => {
  for (const job of workflowJobs) {
    if (!job.completed_at) {
      core.warning(`Job ${job.id} is not completed yet.`)
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
}

// TODO: utilとか作る？
export const calcDifferenceSecond = (
  targetDateTime: Date,
  compareDateTime: Date
): number => {
  let diffMilliSecond = targetDateTime.getTime() - compareDateTime.getTime()

  return Math.floor(diffMilliSecond / 1000)
}
