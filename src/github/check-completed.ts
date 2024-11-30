// A workflow sometime has not completed in spite of trigger of workflow completed event.
// FYI: https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run

import { WorkflowResults } from './types.js'

// GitHub Actions may be eventual consistency.
export const checkCompleted = (workflowResult: WorkflowResults): boolean => {
  const { workflowRun, workflowRunJobs } = workflowResult

  let status = true

  // check workflow
  if (workflowRun.status !== 'completed') {
    console.warn(`This workflow is not completed. id: ${workflowRun.id}`)
    status = false
  }
  if (!workflowRun.name) {
    console.warn('workflowRun.name should be defined.')
    status = false
  }

  // check jobs
  for (const job of workflowRunJobs) {
    if (job.status !== 'completed') {
      console.warn(
        `A job is not completed. workflowRun.id: ${workflowRun.id}, job.id: ${job.id} `
      )
      status = false
    }
    if (!job.completed_at) {
      console.warn('job.completed_at should be defined.')
      status = false
    }
  }

  // check steps
  for (const job of workflowRunJobs) {
    if (!job.steps) {
      console.warn(
        `A job has no steps. workflowRun.id: ${workflowRun.id}, job.id: ${job.id}`
      )
      status = false
      continue
    }
    for (const step of job.steps) {
      const stepLoggedProperties = `workflowRun.id: ${workflowRun.id}, job.id: ${job.id}, step.name: ${step.name}`
      if (step.status !== 'completed') {
        console.warn(`A step is not completed. ${stepLoggedProperties}`)
        status = false
      }
      if (!step.started_at) {
        console.warn(
          `step.started_at should be defined. ${stepLoggedProperties}`
        )
        status = false
      }
      if (!step.completed_at) {
        console.warn(
          `step.completed_at should be defined. ${stepLoggedProperties}`
        )
        status = false
      }
    }
  }

  return status
}
