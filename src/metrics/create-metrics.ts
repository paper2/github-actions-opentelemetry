import settings from '../settings.js'
import { createWorkflowGauges, createJobGauges } from './create-gauges.js'
import { WorkflowResults } from 'src/github/types.js'

export const createMetrics = async (
  results: WorkflowResults
): Promise<void> => {
  const { workflow: workflow, workflowJobs: workflowJobs } = results
  if (!settings.FeatureFlagMetrics) {
    console.log('metrics feature is disabled.')
    return
  }
  try {
    createWorkflowGauges(workflow, workflowJobs)
    createJobGauges(workflow, workflowJobs)
  } catch (error) {
    console.error('failed to create metrics')
    throw error
  }
}
