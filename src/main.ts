import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs,
  getWorkflowRunContext
} from './github/index.js'
import {
  shutdown,
  createJobGauges,
  createWorkflowGauges,
  setupMeterProvider
} from './metrics/index.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const provider = setupMeterProvider()

  const token = core.getInput('GITHUB_TOKEN')
  const octokit = createOctokit(token)
  const workflowRunContext = getWorkflowRunContext(github.context)

  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowRunContext)
    const workflowJobs = await fetchWorkflowRunJobs(octokit, workflowRunContext)
    createJobGauges(workflowRun, workflowJobs)
    createWorkflowGauges(workflowRun, workflowJobs)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(1)
  } finally {
    await shutdown(provider)
  }
  process.exit(0)
}
