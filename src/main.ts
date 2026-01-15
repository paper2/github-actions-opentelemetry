import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  fetchWorkflowResults,
  getWorkflowContext,
  createOctokitClient,
  writeSummaryIfNeeded
} from './github/index.js'
import { createMetrics } from './metrics/index.js'
import { createTrace } from './traces/index.js'
import { forceFlush, initialize, shutdown } from './instrumentation/index.js'
import { settings } from './settings.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let exitCode = 0

  try {
    // Fetch workflow data FIRST before initializing SDK
    // This allows us to set workflow attributes as resource attributes
    const octokit = createOctokitClient()
    const workflowContext = getWorkflowContext(github.context, settings)
    const results = await fetchWorkflowResults(octokit, workflowContext)

    // Initialize SDK with workflow data as resource attributes
    // This ensures they become Prometheus labels
    const workflowResourceAttributes: Record<string, string> = {}
    if (results.workflow.actor) {
      workflowResourceAttributes['workflow.actor'] = results.workflow.actor
    }
    if (results.workflow.event) {
      workflowResourceAttributes['workflow.event'] = results.workflow.event
    }
    if (results.workflow.head_branch) {
      workflowResourceAttributes['workflow.head_branch'] =
        results.workflow.head_branch
    }
    if (results.workflow.base_branch) {
      workflowResourceAttributes['workflow.base_branch'] =
        results.workflow.base_branch
    }

    core.info(
      `Setting workflow resource attributes: ${JSON.stringify(workflowResourceAttributes)}`
    )
    initialize(undefined, undefined, workflowResourceAttributes)

    await createMetrics(results)
    const traceId = await createTrace(results)
    await writeSummaryIfNeeded(traceId)
  } catch (error) {
    if (error instanceof Error) core.error(error)
    console.error(error)
    exitCode = 1
  }

  try {
    await forceFlush()
    console.log('Providers force flush successfully.')
    await shutdown()
    console.log('Providers shutdown successfully.')
  } catch (error) {
    if (error instanceof Error) core.error(error)
    console.error(error)
    exitCode = 1
  }

  process.exit(exitCode)
}
