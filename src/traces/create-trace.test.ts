import { describe, test, expect, afterEach, beforeEach } from 'vitest'
import { WorkflowResults } from '../github/index.js'
import {
  InMemorySpanExporter,
  ReadableSpan
} from '@opentelemetry/sdk-trace-base'
import { opentelemetryAllDisable } from '../utils/opentelemetry-all-disable.js'
import { initialize, forceFlush } from '../instrumentation/index.js'
import { createTrace } from './create-trace.js'
import { fail } from 'assert'
import settings from '../settings.js'

const workflowRunResults = {
  workflowRun: {
    created_at: '2024-09-01T00:00:00Z',
    status: 'completed',
    id: 10000000000,
    name: 'Test Run',
    run_number: 14,
    repository: {
      full_name: 'paper2/github-actions-opentelemetry'
    }
  },
  workflowRunJobs: [
    {
      created_at: '2024-09-01T00:02:00Z',
      started_at: '2024-09-01T00:05:00Z',
      completed_at: '2024-09-01T00:10:00Z',
      id: 30000000000,
      name: 'job1',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step1_1',
          started_at: '2024-09-01T00:05:10Z',
          completed_at: '2024-09-01T00:05:20Z',
          conclusion: 'success'
        },
        {
          name: 'step1_2',
          started_at: '2024-09-01T00:05:30Z',
          completed_at: '2024-09-01T00:05:35',
          conclusion: 'success'
        },
        {
          name: 'step1_3',
          started_at: '2024-09-01T00:05:40',
          completed_at: '2024-09-01T00:05:50',
          conclusion: 'success'
        }
      ]
    },
    {
      created_at: '2024-09-01T00:12:00Z',
      started_at: '2024-09-01T00:15:00Z',
      completed_at: '2024-09-01T00:20:00Z',
      id: 30000000001,
      name: 'job2',
      run_id: 10000000000,
      workflow_name: 'Test Run',
      status: 'completed',
      steps: [
        {
          name: 'step2_1',
          started_at: '2024-09-01T00:15:10Z',
          completed_at: '2024-09-01T00:15:20Z',
          conclusion: 'success'
        },
        {
          name: 'step2_2',
          started_at: '2024-09-01T00:15:30Z',
          completed_at: '2024-09-01T00:15:35',
          conclusion: 'success'
        },
        {
          name: 'step2_3',
          started_at: '2024-09-01T00:15:40',
          completed_at: '2024-09-01T00:15:50',
          conclusion: 'success'
        }
      ]
    }
  ]
} as WorkflowResults
const { workflowRun, workflowRunJobs } = workflowRunResults

describe('should export expected spans', () => {
  const exporter = new InMemorySpanExporter()

  beforeEach(() => {
    exporter.reset()
    initialize(undefined, exporter)
  })

  afterEach(() => {
    opentelemetryAllDisable()
  })

  test('should verify startTime and endTime', async () => {
    await createTrace(workflowRunResults)
    await forceFlush()
    const spans = exporter.getFinishedSpans().map(span => ({
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime
    }))

    let testedSpanCount = 0

    if (!workflowRunJobs[1].completed_at) fail()
    // workflow span
    expect(spans).toContainEqual({
      name: workflowRun.name,
      startTime: [toEpochSec(workflowRun.created_at), 0],
      endTime: [
        toEpochSec(workflowRunJobs[1].completed_at), // last job's completed_at
        0
      ]
    })
    testedSpanCount++

    // jobs span
    for (const job of workflowRunJobs) {
      if (!job.completed_at) fail()
      expect(spans).toContainEqual({
        name: job.name,
        startTime: [toEpochSec(job.started_at), 0],
        endTime: [toEpochSec(job.completed_at), 0]
      })
      testedSpanCount++
    }

    // with waiting for a job span
    for (const job of workflowRunJobs) {
      if (!job.completed_at) fail()
      expect(spans).toContainEqual({
        name: `${job.name} with time of waiting runner`,
        startTime: [toEpochSec(job.created_at), 0],
        endTime: [toEpochSec(job.completed_at), 0]
      })
      testedSpanCount++
    }

    // waiting for a job span
    for (const job of workflowRunJobs) {
      expect(spans).toContainEqual({
        name: `waiting runner for ${job.name}`,
        startTime: [toEpochSec(job.created_at), 0],
        endTime: [toEpochSec(job.started_at), 0]
      })
      testedSpanCount++
    }

    // steps span
    for (const job of workflowRunJobs) {
      job.steps?.map(step => {
        if (!step.started_at || !step.completed_at) fail()
        expect(spans).toContainEqual({
          name: step.name,
          startTime: [toEpochSec(step.started_at), 0],
          endTime: [toEpochSec(step.completed_at), 0]
        })
        testedSpanCount++
      })
    }

    expect(spans).toHaveLength(testedSpanCount)
  })

  test('should export only one root span', async () => {
    await createTrace(workflowRunResults)
    await forceFlush()

    const spans = exporter.getFinishedSpans().map(span => ({
      parentSpanId: span.parentSpanId
    }))

    const rootSpanCount = spans.filter(v => {
      return v.parentSpanId === undefined
    })

    expect(rootSpanCount).toHaveLength(1)
  })

  test('should verify resource attributes', async () => {
    await createTrace(workflowRunResults)
    await forceFlush()

    const spans = exporter.getFinishedSpans().map(span => ({
      resourceAttributes: span.resource.attributes
    }))

    spans.map(span => {
      expect(span.resourceAttributes).toMatchObject({
        'service.name': 'github-actions-opentelemetry'
      })
    })
  })

  test('should not export when disable FeatureFlagTrace', async () => {
    settings.FeatureFlagTrace = false
    await createTrace(workflowRunResults)
    await forceFlush()

    expect(exporter.getFinishedSpans()).toHaveLength(0)
    settings.FeatureFlagTrace = true
  })

  test('should verify span hierarchy', async () => {
    await createTrace(workflowRunResults)
    await forceFlush()

    const spans = exporter.getFinishedSpans()

    if (!workflowRun.name) fail()
    const rootSpan = findSpanByName(spans, workflowRun.name)
    const child1 = findSpanByName(
      spans,
      `${workflowRunJobs[0].name} with time of waiting runner`
    )
    const child1_1 = findSpanByName(
      spans,
      `waiting runner for ${workflowRunJobs[0].name}`
    )
    const child1_2 = findSpanByName(spans, 'job1')
    const child1_2_1 = findSpanByName(spans, 'step1_1')
    const child1_2_2 = findSpanByName(spans, 'step1_2')
    const child1_2_3 = findSpanByName(spans, 'step1_3')
    const child2 = findSpanByName(spans, 'job2 with time of waiting runner')
    const child2_1 = findSpanByName(spans, 'waiting runner for job2')
    const child2_2 = findSpanByName(spans, 'job2')
    const child2_2_1 = findSpanByName(spans, 'step2_1')
    const child2_2_2 = findSpanByName(spans, 'step2_2')
    const child2_2_3 = findSpanByName(spans, 'step2_3')

    const assertionCount =
      [
        assertParentChildRelationship(rootSpan, child1),
        assertParentChildRelationship(child1, child1_1),
        assertParentChildRelationship(child1, child1_2),
        assertParentChildRelationship(child1_2, child1_2_1),
        assertParentChildRelationship(child1_2, child1_2_2),
        assertParentChildRelationship(child1_2, child1_2_3),
        assertParentChildRelationship(rootSpan, child2),
        assertParentChildRelationship(child2, child2_1),
        assertParentChildRelationship(child2, child2_2),
        assertParentChildRelationship(child2_2, child2_2_1),
        assertParentChildRelationship(child2_2, child2_2_2),
        assertParentChildRelationship(child2_2, child2_2_3)
      ].length + 1 // add 1 because rootSpan assertion is not existed.

    expect(spans).toHaveLength(assertionCount)
  })
})

const toEpochSec = (date: string): number => {
  return Math.floor(new Date(date).getTime() / 1000)
}

const findSpanByName = (spans: ReadableSpan[], name: string): ReadableSpan => {
  const span = spans.find(s => s.name === name)
  if (!span) throw new Error(`${name} is not find in spans.`)
  return span
}

const assertParentChildRelationship = (
  parent: ReadableSpan,
  child: ReadableSpan
): void => {
  expect(child.parentSpanId).toBe(parent.spanContext().spanId)
  expect(child.spanContext().traceId).toBe(parent.spanContext().traceId)
}
