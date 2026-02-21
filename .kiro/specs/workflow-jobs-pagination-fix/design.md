# Workflow Jobs Pagination Fix Bugfix Design

## Overview

The `fetchWorkflowJobs` function currently fetches only the first 100 jobs from
a workflow run due to GitHub API pagination limits. This fix implements proper
pagination using `octokit.paginate()` to fetch all jobs without any artificial
limits, ensuring complete telemetry data is sent to the observability backend.
When a workflow has more than 100 jobs, a warning is logged to alert users about
potential memory usage. The fix maintains backward compatibility with existing
code structure and error handling patterns.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a workflow
  run has more than 100 jobs and pagination is not implemented
- **Property (P)**: The desired behavior - all jobs should be fetched using
  pagination
- **Preservation**: Existing behavior for workflows with ≤100 jobs, error
  handling, data structure, and filtering logic must remain unchanged
- **fetchWorkflowJobs**: The function in `src/github/github.ts` (line 88) that
  fetches workflow jobs from the GitHub API
- **octokit.paginate()**: The Octokit method that automatically handles
  pagination by fetching all pages of results
- **WorkflowJobsResponse**: Type alias for the array of jobs returned by the
  GitHub API
  (`Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']`)

## Bug Details

### Fault Condition

The bug manifests when a workflow run has more than 100 jobs. The
`fetchWorkflowJobs` function uses `octokit.rest.actions.listJobsForWorkflowRun`
with `per_page: 100` but does not handle pagination, resulting in only the first
100 jobs being returned. This causes incomplete traces to be sent to the
observability backend.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { workflowRunId: number, totalJobsInWorkflow: number }
  OUTPUT: boolean

  RETURN input.totalJobsInWorkflow > 100
         AND fetchWorkflowJobs_called(input.workflowRunId)
         AND NOT pagination_implemented()
END FUNCTION
```

### Examples

- **Example 1**: Workflow run with 150 jobs → Only first 100 jobs fetched → 50
  jobs missing from traces
- **Example 2**: Workflow run with 250 jobs → Only first 100 jobs fetched → 150
  jobs missing from traces
- **Example 3**: Workflow run with 101 jobs → Only first 100 jobs fetched → 1
  job missing from traces
- **Edge Case**: Workflow run with exactly 100 jobs → All jobs fetched correctly
  (no bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Workflows with 100 or fewer jobs must continue to fetch all jobs successfully
- The function must continue to return `Promise<WorkflowJobsResponse>` (array of
  jobs)
- API errors must continue to propagate to the caller for retry handling in
  `fetchWorkflowResults`
- Jobs must continue to be filtered and transformed using `toWorkflowJob`
  function
- Validation that at least one completed job exists must continue to work

**Scope:** All inputs where the workflow has ≤100 jobs should be completely
unaffected by this fix. This includes:

- Small workflows (1-100 jobs)
- Error handling and retry logic
- Data transformation and filtering
- Type signatures and return values

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Pagination Implementation**: The function uses
   `octokit.rest.actions.listJobsForWorkflowRun` which returns only one page of
   results (max 100 items per page as specified by `per_page: 100`)

2. **No Iteration Over Pages**: The GitHub API returns paginated results, but
   the code does not iterate through subsequent pages to fetch remaining jobs

3. **Octokit Pagination Support Available**: The `@octokit/rest` library
   provides `octokit.paginate()` method specifically for this use case, but it's
   not being used

## Design Decisions

### Decision: Full Pagination Without Limits

**Approach**: Use `octokit.paginate()` to fetch all jobs without implementing a
configurable maximum limit.

**Rationale**:

- Simplicity: Reduces implementation complexity and configuration surface area
- Typical Usage: Most GitHub Actions workflows have fewer than 1000 jobs
- Complete Data: Ensures all telemetry data is captured without artificial
  truncation
- Maintainability: Fewer configuration options mean less code to maintain and
  test

**Trade-offs**:

- **Risk**: Workflows with extremely large job counts (1000+) could cause memory
  issues in constrained environments
- **Mitigation**: Log a warning when job count exceeds 100 to alert users of
  potential memory usage
- **Acceptance**: This is an acknowledged risk for the initial implementation

**Future Considerations**:

- If users report memory issues with large workflows, implement a configurable
  `MAX_WORKFLOW_JOBS` environment variable in a future version
- Consider streaming or batching approaches for workflows with 1000+ jobs
- Monitor GitHub API rate limiting behavior with large pagination requests

## Correctness Properties

Property 1: Fault Condition - Pagination Fetches All Jobs

_For any_ workflow run where the total number of jobs exceeds 100, the fixed
fetchWorkflowJobs function SHALL use octokit.paginate() to fetch all jobs across
multiple pages, ensuring complete telemetry data is available for trace
creation.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Small Workflow Behavior

_For any_ workflow run where the total number of jobs is 100 or fewer, the fixed
fetchWorkflowJobs function SHALL produce exactly the same result as the original
function, preserving the existing behavior for small workflows including data
structure, error handling, and performance characteristics.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

Property 3: Warning - Large Workflow Memory Alert

_For any_ workflow run where the total number of jobs exceeds 100, the fixed
fetchWorkflowJobs function SHALL log a warning message containing the job count
and a memory usage advisory, alerting users that large workflows may cause
memory issues in constrained environments.

**Validates: Requirements 2.3, 2.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/github/github.ts`

**Function**: `fetchWorkflowJobs`

**Specific Changes**:

1. **Replace Direct API Call with Pagination**: Replace
   `octokit.rest.actions.listJobsForWorkflowRun` with `octokit.paginate()`
   - Use `octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {...})`
     syntax
   - Keep the same parameters: `owner`, `repo`, `run_id`, `per_page: 100`
   - This will automatically fetch all pages and return a flat array of all jobs

2. **Add Warning Logic for Large Workflows**: After fetching all jobs, check if
   the count exceeds 100
   - If `jobs.length > 100`, log a warning using `core.warning()`
   - Warning message format:
     `"Fetched ${jobs.length} jobs for workflow run. Large workflows may cause memory issues in constrained environments."`
   - This alerts users to potential memory concerns without blocking execution

3. **No Function Signature Changes**: The function signature remains unchanged
   - No settings parameter needed
   - Return type stays the same: `Promise<WorkflowJobsResponse>`

## Testing Strategy

### 1. Preservation Testing (Primary Focus)

Run existing test suite to ensure no regressions:

- All existing tests in `src/github/github.test.ts` must continue to pass
- This validates that workflows with ≤100 jobs work exactly as before
- Existing error handling, data transformation, and filtering logic remain
  unchanged

### 2. Manual Verification (Optional)

For workflows with >100 jobs, manual testing can be performed if needed:

- Create a test workflow with matrix strategy to generate 100+ jobs
- Verify all jobs appear in traces in the observability backend
- This is optional and not part of automated test suite

### 3. No New Unit Tests Required

Do not add tests for pagination logic with mocked responses or warning log
output. The implementation is straightforward enough that existing tests provide
sufficient coverage.

**Rationale:**

- Mocking `octokit.paginate()` with 150 fake jobs doesn't provide meaningful
  validation
- Testing log output is not worth the maintenance burden
- The real validation comes from: (1) existing tests passing, and (2) actual
  usage with large workflows
- This is a simple bug fix, not a complex feature requiring extensive new tests
