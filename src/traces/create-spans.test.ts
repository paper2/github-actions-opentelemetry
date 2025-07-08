import { describe, test, expect, vi } from 'vitest'
import {
  createWorkflowJobSpan,
  createWorkflowRunStepSpan,
  getSpanStatusFromConclusion
} from './create-spans.js'
import { WorkflowJob } from '../github/types.js'
import { ROOT_CONTEXT, SpanStatusCode } from '@opentelemetry/api'

// Mock console methods to avoid noise in test output
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('createWorkflowJobSpan', () => {
  const mockJob: WorkflowJob = {
    id: 1,
    name: 'test-job',
    status: 'completed',
    conclusion: 'success',
    created_at: new Date('2023-01-01T00:00:00Z'),
    started_at: new Date('2023-01-01T00:01:00Z'),
    completed_at: new Date('2023-01-01T00:05:00Z'),
    workflow_name: 'Test Workflow',
    run_id: 12345,
    runner_name: 'test-runner',
    runner_group_name: 'test-group',
    steps: [
      {
        name: 'test-step',
        conclusion: 'success',
        started_at: new Date('2023-01-01T00:01:00Z'),
        completed_at: new Date('2023-01-01T00:02:00Z')
      }
    ]
  }

  test('should handle job without completed_at', () => {
    const jobWithoutCompletedAt = {
      ...mockJob,
      completed_at: null as unknown as Date
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
    created_at: new Date('2023-01-01T00:00:00Z'),
    started_at: new Date('2023-01-01T00:01:00Z'),
    completed_at: new Date('2023-01-01T00:05:00Z'),
    workflow_name: 'Test Workflow',
    run_id: 12345,
    runner_name: 'test-runner',
    runner_group_name: 'test-group',
    steps: [
      {
        name: 'valid-step',
        conclusion: 'success' as const,
        started_at: new Date('2023-01-01T00:01:00Z'),
        completed_at: new Date('2023-01-01T00:02:00Z')
      },
      {
        name: 'step-with-null-timestamps',
        conclusion: 'success' as const,
        started_at: null as unknown as Date,
        completed_at: null as unknown as Date
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
          conclusion: 'success' as const,
          started_at: new Date('2023-01-01T00:01:00Z'),
          completed_at: new Date('2023-01-01T00:02:00Z')
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

describe('getSpanStatusFromConclusion', () => {
  test('should return OK status for success conclusion', () => {
    const result = getSpanStatusFromConclusion('success')
    expect(result).toEqual({ code: SpanStatusCode.OK })
  })

  test('should return ERROR status for failure conclusion', () => {
    const result = getSpanStatusFromConclusion('failure')
    expect(result).toEqual({ code: SpanStatusCode.ERROR })
  })

  test('should return ERROR status for timed_out conclusion', () => {
    const result = getSpanStatusFromConclusion('timed_out')
    expect(result).toEqual({ code: SpanStatusCode.ERROR })
  })

  test('should return UNSET status for unknown conclusion (default case)', () => {
    const result = getSpanStatusFromConclusion('unknown_status')
    expect(result).toEqual({ code: SpanStatusCode.UNSET })
  })

  test('should return UNSET status for in_progress conclusion (default case)', () => {
    const result = getSpanStatusFromConclusion('in_progress')
    expect(result).toEqual({ code: SpanStatusCode.UNSET })
  })

  test('should return UNSET status for cancelled conclusion (default case)', () => {
    const result = getSpanStatusFromConclusion('cancelled')
    expect(result).toEqual({ code: SpanStatusCode.UNSET })
  })
})
