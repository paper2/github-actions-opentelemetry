import { summary } from '@actions/core'

/**
 * Options for writing trace ID summary
 */
export interface SummaryOptions {
  readonly traceId: string
  readonly label?: string
}

/**
 * Writes trace ID information to GitHub Actions summary
 *
 * @param options - Configuration for the summary content
 * @throws Error if summary writing fails
 */
export async function writeSummary(options: SummaryOptions): Promise<void> {
  const { traceId, label = 'Workflow Trace' } = options

  if (!traceId || traceId.trim() === '') {
    throw new Error('Trace ID is required and cannot be empty')
  }

  try {
    await summary
      .addHeading('OpenTelemetry Trace Information', 3)
      .addRaw(`**${label}:** \`${traceId}\``)
      .write()
  } catch (error) {
    throw new Error(
      `Failed to write summary: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
