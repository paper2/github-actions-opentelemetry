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

  try {
    const results = await fetchWorkflowResults()
    await createMetrics(results)
    await createTrace(results)
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
