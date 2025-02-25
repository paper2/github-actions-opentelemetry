import { WorkflowResults } from './types.js'
import * as core from '@actions/core'

// GitHub Actions may be eventual consistency.
export const checkCompleted = (workflowResult: WorkflowResults): boolean => {
  const { workflowRun, workflowRunJobs } = workflowResult

  let status = true

  // check workflow
  if (workflowRun.status !== 'completed') {
    core.warning(`This workflow is not completed. id: ${workflowRun.id}`)
    status = false
  }
  if (!workflowRun.name) {
    core.warning('workflowRun.name should be defined.')
    status = false
  }

  // check jobs
  for (const job of workflowRunJobs) {
    if (job.status !== 'completed') {
      core.warning(
        `A job is not completed. workflowRun.id: ${workflowRun.id}, job.id: ${job.id} `
      )
      status = false
    }
    if (!job.completed_at) {
      // TODO: should exit immediately and not failed because it is not recoverable empirically.
      core.warning('job.completed_at should be defined.')
      status = false
    }
    if (!job.conclusion) {
      core.warning(
        `job.conclusion should be defined. workflowRun.id: ${workflowRun.id}, job.id: ${job.id}`
      )
      status = false
    }
  }

  // check steps
  for (const job of workflowRunJobs) {
    if (!job.steps) {
      core.warning(
        `A job has no steps. workflowRun.id: ${workflowRun.id}, job.id: ${job.id}`
      )
      status = false
      continue
    }
    for (const step of job.steps) {
      const stepLoggedProperties = `workflowRun.id: ${workflowRun.id}, job.id: ${job.id}, step.name: ${step.name}`
      if (step.status !== 'completed') {
        core.warning(`A step is not completed. ${stepLoggedProperties}`)
        status = false
      }
      if (!step.started_at) {
        core.warning(
          `step.started_at should be defined. ${stepLoggedProperties}`
        )
        status = false
      }
      if (!step.completed_at) {
        core.warning(
          `step.completed_at should be defined. ${stepLoggedProperties}`
        )
        status = false
      }
    }
  }

  return status
}
