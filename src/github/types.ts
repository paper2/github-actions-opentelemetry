import { Endpoints } from '@octokit/types'
import { context } from '@actions/github'

// Define types for GitHub Actions workflow run and job responses
export type WorkflowResponse =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowJobsResponse =
  Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']
export type WorkflowJobResponse = WorkflowJobsResponse[number]
export type WorkflowStepResponse = NonNullable<
  WorkflowJobResponse['steps']
>[number]

// Define types for the models used in the application
export type WorkflowStep = {
  readonly name: string
  // TODO: use union type for conclusion
  readonly conclusion: string
  // TODO: use Date type
  readonly started_at: string
  // TODO: use Date type
  readonly completed_at: string
}
export type WorkflowJob = {
  // TODO: use Date type
  readonly created_at: string
  // TODO: use Date type
  readonly started_at: string
  // TODO: use Date type
  readonly completed_at: string
  readonly id: number
  readonly name: string
  readonly run_id: number
  readonly status: 'completed'
  // TODO: use union type for conclusion
  readonly conclusion: string
  // runner_name is optional field, so we allow it to be null
  readonly runner_name: string | null
  // runner_group_name is optional field, so we allow it to be null
  readonly runner_group_name: string | null
  readonly workflow_name: string
  readonly steps: WorkflowStep[]
}
export type WorkflowJobs = WorkflowJob[]
export type Workflow = {
  readonly id: number
  readonly name: string
  readonly status: 'completed' | 'in_progress'
  // TODO: use union type for conclusion
  readonly conclusion: string | null
  // TODO: use Date type
  readonly created_at: string
  readonly run_attempt: number
  readonly html_url: string
  readonly repository: {
    readonly full_name: string
  }
}
export type WorkflowContext = {
  readonly owner: string
  readonly repo: string
  readonly runId: number
  readonly attempt_number: number
}
export type WorkflowResults = {
  workflow: Workflow
  workflowJobs: WorkflowJob[]
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
export const toWorkflowJob = (job: WorkflowJobResponse): WorkflowJob | null => {
  // Skip incomplete jobs for new functionality (push, pull_request, etc.)
  // This maintains backward compatibility with workflow_run events
  if (job.status !== 'completed') {
    console.log(`Skipping incomplete job: ${job.name} (status: ${job.status})`)
    return null
  }

  if (!job.conclusion)
    throw new Error(
      `Job conclusion is required for job: ${job.name} (id: ${job.id})`
    )
  // FIXME: should exit immediately because it is not recoverable empirically.
  if (!job.completed_at)
    throw new Error(
      `Job completed_at is required for job: ${job.name} (id: ${job.id})`
    )
  if (!job.workflow_name)
    throw new Error(
      `Job workflow_name is required for job: ${job.name} (id: ${job.id})`
    )

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
    steps: job.steps?.map(toWorkflowStep) || [],
    runner_name: job.runner_name,
    runner_group_name: job.runner_group_name
  }
}
export const toWorkflowRun = (workflowRun: WorkflowResponse): Workflow => {
  // Allow in_progress workflows for new functionality (push, pull_request, etc.)
  // while maintaining strict validation for workflow_run events
  if (
    workflowRun.status !== 'completed' &&
    workflowRun.status !== 'in_progress'
  ) {
    throw new Error(
      `Unsupported workflow status: ${workflowRun.status} for workflow id: ${workflowRun.id}`
    )
  }

  if (workflowRun.status === 'in_progress') {
    console.log(`Processing in-progress workflow: ${workflowRun.id}`)
  }

  if (!workflowRun.name) throw new Error('Workflow run name is required')

  // For in_progress workflows, conclusion might be null
  if (workflowRun.status === 'completed' && !workflowRun.conclusion) {
    throw new Error(
      'Workflow run conclusion is required for completed workflows'
    )
  }

  if (!workflowRun.run_attempt)
    throw new Error('Workflow run attempt is required')

  return {
    id: workflowRun.id,
    name: workflowRun.name,
    status: workflowRun.status,
    conclusion: workflowRun.conclusion || null,
    created_at: workflowRun.created_at,
    run_attempt: workflowRun.run_attempt,
    html_url: workflowRun.html_url,
    repository: {
      full_name: workflowRun.repository.full_name
    }
  }
}
