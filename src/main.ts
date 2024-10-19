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
import { createJobGauges, createWorkflowGauges } from './metrics/index.js'
import {
  createWorkflowRunTrace,
  createWorkflowRunJobSpan,
  createWorkflowRunStepSpan
} from './traces/index.js'
import settings from './settings.js'
import * as opentelemetry from '@opentelemetry/api'
import {
  forceFlush,
  initialize,
  shutdown
} from './instrumentation/instrumentation.js'
import { PushMetricExporter } from '@opentelemetry/sdk-metrics'
import { SpanExporter } from '@opentelemetry/sdk-trace-base'

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
  const { workflowRun, workflowRunJobs } = results

  try {
    createWorkflowGauges(workflowRun, workflowRunJobs)
    createJobGauges(workflowRun, workflowRunJobs)
  } catch (error) {
    core.error('failed to create metrics')
    throw error
  }
}

const createTraces = async (results: WorkflowResults): Promise<void> => {
  const workflowRun = results.workflowRun
  const workflowRunJobs = results.workflowRunJobs

  const rootCtx = createWorkflowRunTrace(workflowRun, workflowRunJobs)
  workflowRunJobs.map(job => {
    const jobCtx = createWorkflowRunJobSpan(rootCtx, job)
    if (jobCtx === null) return
    createWorkflowRunStepSpan(jobCtx, job)
  })
  console.log(
    `TraceID: ${opentelemetry.trace.getSpanContext(rootCtx)?.traceId}`
  )
  if (settings.isGitHubActions)
    await core.summary
      .addHeading('GitHub Actions OpenTelemetry')
      .addRaw(
        `TraceID: ${opentelemetry.trace.getSpanContext(rootCtx)?.traceId}\n`
      )
      .addLink(
        // TODO: 検証を終えたら削除するか考える
        'Google Cloud Trace Helper',
        `https://console.cloud.google.com/traces/list?tid=${opentelemetry.trace.getSpanContext(rootCtx)?.traceId}`
      )
      .write()
}

// TODO: mainここだけにしたい。
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(
  meterExporter?: PushMetricExporter,
  traceExporter?: SpanExporter
): Promise<void> {
  // required: run initialize() first.
  // usually use --required runtime option for first reading.
  // for simple use this action, this is satisfied on here.
  initialize(meterExporter, traceExporter)

  try {
    const results = await fetchWorkflowResults()
    await createMetrics(results)
    if (settings.FeatureFlagTrace) await createTraces(results)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await forceFlush()
    await shutdown()
    console.log('providers shutdown successfully.')
  }
  process.exit(0)
}
