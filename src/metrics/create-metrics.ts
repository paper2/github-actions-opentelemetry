import settings from 'src/settings.js'
import { createWorkflowGauges, createJobGauges } from './create-gauges.js'
import { WorkflowResults } from 'src/github/types.js'

export const createMetrics = async (
  results: WorkflowResults
): Promise<void> => {
  const { workflowRun, workflowRunJobs } = results
  if (!settings.FeatureFlagMetrics) {
    console.log('metrics feature is disabled.')
    return
  }
  try {
    createWorkflowGauges(workflowRun, workflowRunJobs)
    createJobGauges(workflowRun, workflowRunJobs)
  } catch (error) {
    console.error('failed to create metrics')
    throw error
  }
}
