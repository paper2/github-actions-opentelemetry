import settings from '../settings.js'
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
    createWorkflowRunStepSpan(jobCtx, job)
  }

  const traceId = opentelemetry.trace.getSpanContext(rootCtx)?.traceId
  // TODO: actions output traceID.
  console.log(`TraceID: ${traceId}`)
  return traceId
}
