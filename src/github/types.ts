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

const STEP_CONCLUSION_VALUES = ['success', 'failure', 'timed_out'] as const
export type StepConclusion = (typeof STEP_CONCLUSION_VALUES)[number]

export const isStepConclusion = (value: unknown): value is StepConclusion => {
  return (
    typeof value === 'string' &&
    STEP_CONCLUSION_VALUES.includes(value as StepConclusion)
  )
}

const JOB_CONCLUSION_VALUES = [
  'success',
  'failure',
  'neutral',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required'
] as const
export type JobConclusion = (typeof JOB_CONCLUSION_VALUES)[number]

export const isJobConclusion = (value: unknown): value is JobConclusion => {
  return (
    typeof value === 'string' &&
    JOB_CONCLUSION_VALUES.includes(value as JobConclusion)
  )
}

// Define types for the models used in the application
export type WorkflowStep = {
  readonly name: string
  readonly conclusion: StepConclusion
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
  readonly conclusion: JobConclusion
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
  if (!isStepConclusion(step.conclusion))
    throw new Error(`Invalid step conclusion: ${step.conclusion}`)
  if (!step.started_at) throw new Error('Step started_at is required')
  if (!step.completed_at) throw new Error('Step completed_at is required')

  return {
    name: step.name,
    conclusion: step.conclusion,
    started_at: step.started_at,
    completed_at: step.completed_at
  }
}
export const toWorkflowJob = (
  job: WorkflowJobResponse,
  eventName: string
): WorkflowJob | null => {
  if (eventName === 'workflow_run' && job.status !== 'completed') {
    // This error is for backward compatibility.
    throw new Error('job.status must be completed on workflow_run event')
  } else if (job.status !== 'completed') {
    // TODO: use union type for status
    // Skip incomplete jobs for push, pull_request, etc.
    console.log(`Skipping incomplete job: ${job.name} (status: ${job.status})`)
    return null
  }

  if (!job.conclusion)
    throw new Error(
      `Job conclusion is required for job: ${job.name} (id: ${job.id})`
    )
  if (!isJobConclusion(job.conclusion))
    throw new Error(`Invalid job conclusion: ${job.conclusion}`)
  // TODO: Handle this case because sometimes this property is not set eternally.
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
  // Special handling remains for backward compatibility as the initial specification retried until workflow_run events reached completed status.
  if (
    workflowRun.event === 'workflow_run' &&
    (workflowRun.status !== 'completed' || !workflowRun.conclusion)
  )
    throw new Error('workflow status must be completed on workflow_run event')

  // Output support inquiry log when enabled to work beyond workflow_run events
  if (workflowRun.status === 'in_progress') {
    console.log(`Processing in-progress workflow: ${workflowRun.id}`)
  }

  if (!workflowRun.name) throw new Error('Workflow run name is required')

  if (!workflowRun.run_attempt)
    throw new Error('Workflow run attempt is required')

  return {
    id: workflowRun.id,
    name: workflowRun.name,
    conclusion: workflowRun.conclusion,
    created_at: workflowRun.created_at,
    run_attempt: workflowRun.run_attempt,
    html_url: workflowRun.html_url,
    repository: {
      full_name: workflowRun.repository.full_name
    }
  }
}
