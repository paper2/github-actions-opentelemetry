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
import { getSpanCountSnapshot } from './instrumentation/index.js'
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
  let results: Awaited<ReturnType<typeof fetchWorkflowResults>> | undefined

  try {
    // Create Octokit client and workflow context
    const octokit = createOctokitClient()
    const workflowContext = getWorkflowContext(github.context, settings)

    results = await fetchWorkflowResults(octokit, workflowContext)
    await createMetrics(results)
    const traceId = await createTrace(results)

    const afterCreateTrace = getSpanCountSnapshot()
    if (afterCreateTrace && settings.FeatureFlagTrace) {
      core.info(
        `Exact span count (after-createTrace): started=${afterCreateTrace.started}, ended=${afterCreateTrace.ended}, exported=${afterCreateTrace.exported}, dropped=${afterCreateTrace.dropped}, exportCalls=${afterCreateTrace.exportCalls}, exportCallsFailed=${afterCreateTrace.exportCallsFailed}, exportedFailed=${afterCreateTrace.exportedFailed}`
      )
    }

    await writeSummaryIfNeeded(traceId)
  } catch (error) {
    if (error instanceof Error) core.error(error)
    console.error(error)
    exitCode = 1
  }

  try {
    if (results && settings.FeatureFlagTrace) {
      const jobs = results.workflowJobs ?? []
      const stepCount = jobs.reduce(
        (acc, job) => acc + (job.steps?.length ?? 0),
        0
      )

      // Rough estimate of spans created by this action:
      // - 1 workflow(root) span
      // - 2 spans per job (job + "with waiting")
      // - +1 waiting span per job (if created; can be skipped when timestamps are invalid)
      // - +1 span per step (if step timestamps/conclusion are valid)
      const estimatedSpans = 1 + jobs.length * 3 + stepCount

      core.info(
        `About to export spans: jobs=${jobs.length}, steps=${stepCount}, estimatedSpans=${estimatedSpans}`
      )

      const snapshot = getSpanCountSnapshot()
      if (snapshot) {
        core.info(
          `Exact span count (pre-flush): started=${snapshot.started}, ended=${snapshot.ended}, exported=${snapshot.exported}, dropped=${snapshot.dropped}, exportCalls=${snapshot.exportCalls}, exportCallsFailed=${snapshot.exportCallsFailed}, exportedFailed=${snapshot.exportedFailed}`
        )
      }
    }

    await forceFlush()
    console.log('Providers force flush successfully.')

    const afterFlush = getSpanCountSnapshot()
    if (afterFlush) {
      core.info(
        `Exact span count (post-flush): started=${afterFlush.started}, ended=${afterFlush.ended}, exported=${afterFlush.exported}, dropped=${afterFlush.dropped}, exportCalls=${afterFlush.exportCalls}, exportCallsFailed=${afterFlush.exportCallsFailed}, exportedFailed=${afterFlush.exportedFailed}`
      )
    }

    await shutdown()
    console.log('Providers shutdown successfully.')

    const afterShutdown = getSpanCountSnapshot()
    if (afterShutdown) {
      core.info(
        `Exact span count (post-shutdown): started=${afterShutdown.started}, ended=${afterShutdown.ended}, exported=${afterShutdown.exported}, dropped=${afterShutdown.dropped}, exportCalls=${afterShutdown.exportCalls}, exportCallsFailed=${afterShutdown.exportCallsFailed}, exportedFailed=${afterShutdown.exportedFailed}`
      )
    }
  } catch (error) {
    if (error instanceof Error) core.error(error)
    console.error(error)
    exitCode = 1
  }

  process.exit(exitCode)
}
