import * as core from '@actions/core'
import * as github from '@actions/github'
import * as opentelemetry from '@opentelemetry/api'
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
import settings from './settings.js'

if (settings.logLevel === 'debug') {
  opentelemetry.diag.setLogger(
    new opentelemetry.DiagConsoleLogger(),
    opentelemetry.DiagLogLevel.DEBUG
  )
}

type WorkflowResults = {
  workflowRun: WorkflowRun
  workflowRunJobs: WorkflowRunJobs
}

const fetchWorkflowResults = async (): Promise<WorkflowResults> => {
  const token = core.getInput('GITHUB_TOKEN')
  const octokit = createOctokit(token)
  const workflowRunContext = getWorkflowRunContext(github.context)
  try {
    const workflowRun = await fetchWorkflowRun(octokit, workflowRunContext)
    const workflowRunJobs = await fetchWorkflowRunJobs(
      octokit,
      workflowRunContext
    )
    return { workflowRun, workflowRunJobs }
  } catch (error) {
    core.error('faild to get results of workflow run')
    throw error
  }
}

const createMetrics = async (results: WorkflowResults): Promise<void> => {
  const workflowRun = results.workflowRun
  const workflowRunJobs = results.workflowRunJobs

  const meterProvider = setupMeterProvider()

  try {
    createJobGauges(workflowRun, workflowRunJobs)
    createWorkflowGauges(workflowRun, workflowRunJobs)
  } catch (error) {
    core.error('faild to create metrics')
    throw error
  } finally {
    // TODO: テスト通るようにとりあえず名前をshutdownのままにしているので、修正
    // Providers Shutdown
    await shutdown(meterProvider)
  }
}
const createTraces = async (results: WorkflowResults): Promise<void> => {
  const workflowRun = results.workflowRun
  const workflowRunJobs = results.workflowRunJobs

  const tracerProvider = setupTracerProvider()
  try {
    const rootCtx = createWorkflowRunTrace(workflowRun, workflowRunJobs)
    workflowRunJobs.map(job => {
      const jobCtx = createWorkflowRunJobSpan(rootCtx, job)
      createWorkflowRunStepSpan(jobCtx, job)
    })
  } catch (error) {
    core.error('faild to create traces')
    throw error
  } finally {
    await tracerShutdown(tracerProvider)
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const results = await fetchWorkflowResults()
    await createMetrics(results)
    await createTraces(results)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(1)
  }
  process.exit(0)
}
