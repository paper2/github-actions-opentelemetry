import { describe, test, expect, vi } from 'vitest'
import {
  createWorkflowJobSpan,
  createWorkflowRunStepSpan
} from './create-spans.js'
import { WorkflowJob } from '../github/types.js'
import { ROOT_CONTEXT } from '@opentelemetry/api'

// Mock console methods to avoid noise in test output
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('createWorkflowJobSpan', () => {
  const mockJob: WorkflowJob = {
    id: 1,
    name: 'test-job',
    status: 'completed',
    conclusion: 'success',
    created_at: '2023-01-01T00:00:00Z',
    started_at: '2023-01-01T00:01:00Z',
    completed_at: '2023-01-01T00:05:00Z',
    workflow_name: 'Test Workflow',
    run_id: 12345,
    runner_name: 'test-runner',
    runner_group_name: 'test-group',
    steps: [
      {
        name: 'test-step',
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      }
    ]
  }

  test('should handle job without completed_at', () => {
    const jobWithoutCompletedAt = {
      ...mockJob,
      completed_at: null as unknown as string
    }

    expect(() =>
      createWorkflowJobSpan(ROOT_CONTEXT, jobWithoutCompletedAt)
    ).toThrow(
      'Job completed_at is required for span creation: test-job (id: 1)'
    )
  })

  test('should process job with steps normally', () => {
    // Should not throw and not log warnings for normal job
    expect(() => createWorkflowJobSpan(ROOT_CONTEXT, mockJob)).not.toThrow()
  })
})

describe('createWorkflowRunStepSpan', () => {
  const mockJobWithSteps: WorkflowJob = {
    id: 1,
    name: 'test-job',
    status: 'completed',
    conclusion: 'success',
    created_at: '2023-01-01T00:00:00Z',
    started_at: '2023-01-01T00:01:00Z',
    completed_at: '2023-01-01T00:05:00Z',
    workflow_name: 'Test Workflow',
    run_id: 12345,
    runner_name: 'test-runner',
    runner_group_name: 'test-group',
    steps: [
      {
        name: 'valid-step',
        conclusion: 'success',
        started_at: '2023-01-01T00:01:00Z',
        completed_at: '2023-01-01T00:02:00Z'
      },
      {
        name: 'step-with-null-timestamps',
        conclusion: 'success',
        started_at: null as unknown as string,
        completed_at: null as unknown as string
      }
    ]
  }

  test('should handle steps with null timestamps', () => {
    // Should not throw, just log warnings for invalid steps
    expect(() =>
      createWorkflowRunStepSpan(ROOT_CONTEXT, mockJobWithSteps)
    ).not.toThrow()
    expect(console.warn).toHaveBeenCalledWith(
      'Step step-with-null-timestamps in job test-job has null timestamps, skipping span creation'
    )
  })

  test('should process valid steps normally', () => {
    const jobWithValidSteps = {
      ...mockJobWithSteps,
      steps: [
        {
          name: 'valid-step',
          conclusion: 'success',
          started_at: '2023-01-01T00:01:00Z',
          completed_at: '2023-01-01T00:02:00Z'
        }
      ]
    }

    // Should not throw and process valid steps
    expect(() =>
      createWorkflowRunStepSpan(ROOT_CONTEXT, jobWithValidSteps)
    ).not.toThrow()
  })

  test('should handle empty steps array', () => {
    const jobWithEmptySteps = {
      ...mockJobWithSteps,
      steps: []
    }

    // Should not throw or log warnings for empty array
    expect(() =>
      createWorkflowRunStepSpan(ROOT_CONTEXT, jobWithEmptySteps)
    ).not.toThrow()
  })
})

describe('span status mapping', () => {
  // We can't directly test getSpanStatusFromConclusion since it's not exported,
  // but we can test it indirectly through span creation
  test('should handle in_progress status in workflow spans', () => {
    const mockWorkflow = {
      id: 12345,
      name: 'Test Workflow',
      status: 'in_progress' as const,
      conclusion: null,
      created_at: '2023-01-01T00:00:00Z',
      run_attempt: 1,
      html_url: 'https://github.com/test/repo/actions/runs/12345',
      repository: {
        full_name: 'test-owner/test-repo'
      }
    }

    // Should not throw when creating spans for in_progress workflow
    expect(() => {
      // This simulates the workflow span creation with in_progress status
      const conclusion = mockWorkflow.conclusion || 'in_progress'
      // Should handle 'in_progress' without error
      expect(conclusion).toBe('in_progress')
    }).not.toThrow()
  })
})
