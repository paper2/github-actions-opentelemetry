import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  createOctokit,
  fetchWorkflowRun,
  fetchWorkflowRunJobs,
  getWorkflowRunContext,
  WorkflowRun,
  WorkflowRunJobs
} from './github/index.js'
import {
  shutdown,
  createJobGauges,
  createWorkflowGauges,
  setupMeterProvider
} from './metrics/index.js'
import {
  shutdown as tracerShutdown,
  setupTracerProvider,
  createWorkflowRunTrace,
  createWorkflowRunJobSpan,
  createWorkflowRunStepSpan
} from './traces/index.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const token = core.getInput('GITHUB_TOKEN')
  const octokit = createOctokit(token)
  const workflowRunContext = getWorkflowRunContext(github.context)
  let workflowRun: WorkflowRun
  let workflowRunJobs: WorkflowRunJobs

  // Get Workflow Run Results
  try {
    workflowRun = await fetchWorkflowRun(octokit, workflowRunContext)
    workflowRunJobs = await fetchWorkflowRunJobs(octokit, workflowRunContext)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(1)
  }

  const meterProvider = setupMeterProvider()
  const tracerProvider = setupTracerProvider()
  try {
    // Create Gauges
    createJobGauges(workflowRun, workflowRunJobs)
    createWorkflowGauges(workflowRun, workflowRunJobs)

    // Create Traces
    const rootCtx = createWorkflowRunTrace(workflowRun, workflowRunJobs)
    workflowRunJobs.map(job => {
      const jobCtx = createWorkflowRunJobSpan(rootCtx, job)
      createWorkflowRunStepSpan(jobCtx, job)
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(1)
  } finally {
    await shutdown(meterProvider)
    await tracerShutdown(tracerProvider)
  }

  process.exit(0)
}
