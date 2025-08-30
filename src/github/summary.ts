import { summary, info, warning } from '@actions/core'

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
 * @param traceId - Trace ID string from trace creation (empty string if no trace available)
 */
export async function writeSummaryIfNeeded(traceId: string): Promise<void> {
  if (traceId === '') {
    // Handle case where no trace ID is available
    try {
      await writeSummary({ traceId: 'No trace ID was generated' })
    } catch (error) {
      info('No trace ID was generated')
      warning(
        `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  } else {
    // Handle case where trace ID is available
    try {
      await writeSummary({ traceId })
      console.log('Trace ID summary written successfully.')
    } catch (error) {
      // Fallback: log trace ID to action output if summary writing fails
      info(`Trace ID: ${traceId}`)
      warning(
        `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
