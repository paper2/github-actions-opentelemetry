# Implementation Plan

- [x] 1. Implement the fix in fetchWorkflowJobs
  - Replace `octokit.rest.actions.listJobsForWorkflowRun` with
    `octokit.paginate()`
  - Use syntax:
    `octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {...})`
  - Keep same parameters: owner, repo, run_id, per_page: 100
  - Add warning logic: if jobs.length > 100, log warning using `core.warning()`
  - Warning message: "Fetched ${jobs.length} jobs for workflow run. Large
    workflows may cause memory issues in constrained environments."
  - Keep function signature unchanged
  - _Bug_Condition: Workflows with >100 jobs only fetch first 100 jobs_
  - _Expected_Behavior: octokit.paginate() fetches all jobs across multiple
    pages_
  - _Preservation: Workflows with ≤100 jobs, error handling, data structure,
    filtering logic, and type signatures remain unchanged_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Run existing tests to verify no regressions
  - Execute `npm run test`
  - Verify all tests in `src/github/github.test.ts` pass
  - Confirm no regressions in error handling, data transformation, or filtering
    logic
  - This validates preservation of existing behavior for workflows with ≤100
    jobs
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Remove unnecessary listJobsForWorkflowRun mocks from tests
  - Remove `listJobsForWorkflowRun` mock definitions from test cases in
    `src/github/github.test.ts`
  - Keep only `paginate` mock since the implementation now uses
    `octokit.paginate()` exclusively
  - Affected tests: "should handle no completed jobs found error", "should
    filter incomplete jobs and process completed ones for non-workflow_run
    events"
  - This cleanup removes redundant mock code that is no longer used after the
    pagination fix
  - _Requirements: Code cleanup and maintainability_
