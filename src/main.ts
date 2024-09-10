import * as core from '@actions/core'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs,
  getWorkflowRunContext
} from './github/index.js'
import {
  shutdown,
  createJobGuages,
  createWorkflowGuages
} from './metrics/index.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('GITHUB_TOKEN')
  const octokit = createOctokit(token)
  const workflowRunContext = getWorkflowRunContext()

  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowRunContext)
    const workflowJobs = await fetchWorkflowRunJobs(octokit, workflowRunContext)
    createJobGuages(workflowJobs)
    createWorkflowGuages(workflowRun, workflowJobs)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }

  await shutdown()
}
