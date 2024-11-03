import * as core from '@actions/core'
import { fetchWorkflowResults } from './github/index.js'
import { createMetrics } from './metrics/index.js'
import { createTrace } from './traces/index.js'
import { forceFlush, initialize, shutdown } from './instrumentation/index.js'

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
    const results = await fetchWorkflowResults()
    await createMetrics(results)
    await createTrace(results)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    exitCode = 1
  }

  try {
    await forceFlush()
    console.log('Providers force flush successfully.')
    await shutdown()
    console.log('Providers shutdown successfully.')
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    exitCode = 1
  }

  process.exit(exitCode)
}
