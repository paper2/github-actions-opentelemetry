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
  createJobGauges,
  createWorkflowGauges,
  setupMeterProvider,
  shutdown
} from './metrics/index.js'
import {
  createWorkflowRunTrace,
  createWorkflowRunJobSpan,
  createWorkflowRunStepSpan
} from './traces/index.js'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { envDetector } from '@opentelemetry/resources'
import settings from './settings.js'
import * as opentelemetry from '@opentelemetry/api'

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

const initializeNodeSDK = (): NodeSDK => {
  const sdk = new NodeSDK({
    // if omitted, the tracing SDK will be initialized from environment variables
    traceExporter: undefined,
    // OTLP Exporter seemed not flushing metrics withoud forceflush().
    // sdk.shutdown() alone maybe not enough.
    // NodeSDK support is little for metrics now and merit is low.
    metricReader: undefined,
    // Need for using OTEL_XXX environment variable.
    resourceDetectors: [envDetector]
  })

  sdk.start()

  return sdk
}

const shutdownSDK = async (sdk: NodeSDK): Promise<void> => {
  try {
    await sdk.shutdown()
    console.log('SDK shut down successfully')
  } catch (error) {
    console.log('Error shutting down SDK', error)
    // TODO: Fail safeに倒すか考える
    process.exit(1)
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
    await shutdown(meterProvider)
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

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const sdk = initializeNodeSDK()
  try {
    const results = await fetchWorkflowResults()
    await createMetrics(results)
    if (settings.FeatureFlagTrace) await createTraces(results)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(1)
  } finally {
    await shutdownSDK(sdk)
  }
  process.exit(0)
}
