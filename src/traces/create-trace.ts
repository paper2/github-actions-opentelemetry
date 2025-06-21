import settings from '../settings.js'
import { WorkflowResults } from 'src/github/types.js'
import {
  createWorkflowTrace,
  createWorkflowJobSpan,
  createWorkflowRunStepSpan
} from './create-spans.js'
import * as opentelemetry from '@opentelemetry/api'

export const createTrace = async (
  results: WorkflowResults
): Promise<string | undefined> => {
  if (!settings.FeatureFlagTrace) {
    console.log('trace feature is disabled.')
    return
  }
  const { workflow: workflowRun, workflowJobs: workflowRunJobs } = results
  const rootCtx = createWorkflowTrace(workflowRun, workflowRunJobs)
  for (const job of workflowRunJobs) {
    const jobCtx = createWorkflowJobSpan(rootCtx, job)
    createWorkflowRunStepSpan(jobCtx, job)
  }

  const traceId = opentelemetry.trace.getSpanContext(rootCtx)?.traceId
  // TODO: actions output traceID.
  console.log(`TraceID: ${traceId}`)
  return traceId
}
