import { Endpoints } from '@octokit/types'
import { context } from '@actions/github'

// Define types for GitHub Actions workflow run and job responses
export type WorkflowRunResponse =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowRunJobsResponse =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']
export type WorkflowRunJobResponse = WorkflowRunJobsResponse[number]
export type WorkflowStepResponse = NonNullable<
  WorkflowRunJobResponse['steps']
>[number]

// Define types for the models used in the application
export type WorkflowStep = {
  readonly name: string
  readonly conclusion: string
  readonly started_at: string
  readonly completed_at: string
}
export type WorkflowJob = {
  readonly created_at: string
  readonly started_at: string
  readonly completed_at: string
  readonly id: number
  readonly name: string
  readonly run_id: number
  readonly status: string
  readonly conclusion: string
  readonly workflow_name: string
  readonly steps: WorkflowStep[]
}
export type WorkflowRun = {
  readonly id: number
  readonly name: string
  readonly status: string
  readonly conclusion: string
  readonly created_at: string
  readonly run_attempt: number
  readonly repository: {
    readonly full_name: string
  }
}
export type WorkflowRunContext = {
  readonly owner: string
  readonly repo: string
  readonly runId: number
  readonly attempt_number: number
}
export type WorkflowResults = {
  workflowRun: WorkflowRun
  workflowRunJobs: WorkflowJob[]
}
export type GitHubContext = typeof context

// Map GitHub Actions API responses to application models
export const toWorkflowStep = (step: WorkflowStepResponse): WorkflowStep => {
  if (!step.conclusion) throw new Error('Step conclusion is required')
  if (!step.started_at) throw new Error('Step started_at is required')
  if (!step.completed_at) throw new Error('Step completed_at is required')

  return {
    name: step.name,
    conclusion: step.conclusion,
    started_at: step.started_at,
    completed_at: step.completed_at
  }
}
export const toWorkflowJob = (job: WorkflowRunJobResponse): WorkflowJob => {
  if (!job.conclusion) throw new Error('Job conclusion is required')
  if (!job.completed_at) throw new Error('Job completed_at is required')
  if (!job.workflow_name) throw new Error('Job workflow_name is required')

  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    created_at: job.created_at,
    started_at: job.started_at,
    completed_at: job.completed_at,
    workflow_name: job.workflow_name,
    run_id: job.run_id,
    steps: job.steps?.map(toWorkflowStep) || []
  }
}
export const toWorkflowRun = (
  workflowRun: WorkflowRunResponse
): WorkflowRun => {
  if (workflowRun.status !== 'completed')
    throw new Error(`This workflow is not completed. id: ${workflowRun.id}`)
  if (!workflowRun.name) throw new Error('Workflow run name is required')
  if (!workflowRun.conclusion)
    throw new Error('Workflow run conclusion is required')
  if (!workflowRun.run_attempt)
    throw new Error('Workflow run attempt is required')

  return {
    id: workflowRun.id,
    name: workflowRun.name,
    status: workflowRun.status,
    conclusion: workflowRun.conclusion,
    created_at: workflowRun.created_at,
    run_attempt: workflowRun.run_attempt,
    repository: {
      full_name: workflowRun.repository.full_name
    }
  }
}
