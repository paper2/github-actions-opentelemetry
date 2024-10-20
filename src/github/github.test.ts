import { describe, test, expect } from 'vitest'
import { fetchWorkflowResults } from './github.js'

describe('fetchWorkflowResults', () => {
  test('should fetch results using real api', async () => {
    const { workflowRun, workflowRunJobs } = await fetchWorkflowResults()

    // check some properties used by this actions, these are not all.
    expect(workflowRun.name).toBeDefined()
    expect(workflowRun.workflow_id).toBeDefined()
    expect(workflowRun.run_started_at).toBeDefined()
    expect(workflowRun.created_at).toBeDefined()
    expect(workflowRunJobs[0].name).toBeDefined()
    expect(workflowRunJobs[0].started_at).toBeDefined()
    expect(workflowRunJobs[0].created_at).toBeDefined()
    expect(workflowRunJobs[0].completed_at).toBeDefined()
    expect(workflowRunJobs[0].workflow_name).toBeDefined()
    expect(workflowRunJobs[0].status).toBe('completed')
    expect(workflowRunJobs[0].steps).toBeDefined()
  })
})
