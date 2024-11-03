import settings from '../settings.js'
import * as core from '@actions/core'
import { WorkflowResults } from 'src/github/types.js'
import {
  createWorkflowRunTrace,
  createWorkflowRunJobSpan,
  createWorkflowRunStepSpan
} from './create-spans.js'
import * as opentelemetry from '@opentelemetry/api'

export const createTrace = async (
  results: WorkflowResults
): Promise<string | undefined> => {
  if (settings.FeatureFlagTrace) {
    console.log('trace feature is enabled.')
  } else {
    return undefined
  }

  const { workflowRun, workflowRunJobs } = results
  const rootCtx = createWorkflowRunTrace(workflowRun, workflowRunJobs)
  for (const job of workflowRunJobs) {
    const jobCtx = createWorkflowRunJobSpan(rootCtx, job)
    if (jobCtx === null) continue
    createWorkflowRunStepSpan(jobCtx, job)
  }

  const traceId = opentelemetry.trace.getSpanContext(rootCtx)?.traceId
  console.log(`TraceID: ${traceId}`)

  // TODO: actions output traceID and Delete this feature.
  await createSummary(traceId)

  return traceId
}
const createSummary = async (traceId: string | undefined): Promise<void> => {
  if (settings.isGitHubActions)
    await core.summary
      .addHeading('GitHub Actions OpenTelemetry')
      .addRaw(`TraceID: ${traceId}\n`)
      .addLink(
        'Google Cloud Trace Helper',
        `https://console.cloud.google.com/traces/list?tid=${traceId}`
      )
      .write()
}
