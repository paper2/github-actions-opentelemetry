import { summary, info, warning } from '@actions/core'
import type { TraceResult } from '../traces/create-trace.js'

/**
 * Options for writing trace ID summary
 */
export interface SummaryOptions {
  readonly traceId: string
}

/**
 * Writes trace ID information to GitHub Actions summary
 *
 * @param options - Configuration for the summary content
 * @throws Error if summary writing fails
 */
export async function writeSummary(options: SummaryOptions): Promise<void> {
  const { traceId } = options

  if (!traceId || traceId.trim() === '') {
    throw new Error('Trace ID is required and cannot be empty')
  }

  try {
    await summary
      .addHeading('OpenTelemetry Trace Information', 3)
      .addRaw(`**Workflow Trace:** \`${traceId}\``)
      .write()
  } catch (error) {
    throw new Error(
      `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Conditionally writes trace ID summary with graceful error handling
 *
 * @param traceResult - Result from trace creation containing trace ID and success status
 */
export async function writeSummaryIfNeeded(traceResult: TraceResult): Promise<void> {
  if (traceResult.success && traceResult.traceId) {
    try {
      await writeSummary({ traceId: traceResult.traceId })
      console.log('Trace ID summary written successfully.')
    } catch (error) {
      // Fallback: log trace ID to action output if summary writing fails
      info(`Trace ID: ${traceResult.traceId}`)
      warning(
        `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  } else if (traceResult.success && !traceResult.traceId) {
    // Handle case where trace creation succeeded but no trace ID was captured
    try {
      await writeSummary({ traceId: 'No trace generated' })
    } catch (error) {
      info('No trace was generated for this workflow.')
      warning(
        `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  // If traceResult.success is false, we don't write anything (trace creation failed)
}
