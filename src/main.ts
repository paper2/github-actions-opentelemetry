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
import { writeSummary } from './github/summary.js'
import { forceFlush, initialize, shutdown } from './instrumentation/index.js'
import { settings } from './settings.js'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  // required: run initialize() first.
  // usually use --required runtime option for first reading.
  // for simple use this action, this is satisfied on here.
  initialize()

  let exitCode = 0

  try {
    // Create Octokit client and workflow context
    const octokit = createOctokitClient()
    const workflowContext = getWorkflowContext(github.context, settings)

    const results = await fetchWorkflowResults(octokit, workflowContext)
    await createMetrics(results)
    const traceResult = await createTrace(results)
    await writeSummaryIfNeeded(traceResult)
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
