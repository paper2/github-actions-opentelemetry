# Bugfix Requirements Document

## Introduction

The `fetchWorkflowJobs` function in `src/github/github.ts` currently has a
pagination limitation that prevents it from fetching more than 100 jobs from a
workflow run. This results in incomplete telemetry data being sent to the
observability system for workflows with more than 100 jobs. The fix will
implement proper pagination using the GitHub API's built-in pagination mechanism
to ensure all jobs are fetched regardless of workflow size.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a workflow run has more than 100 jobs THEN the system fetches only the
first 100 jobs from the GitHub API

1.2 WHEN a workflow run has more than 100 jobs THEN the system sends incomplete
traces to the observability backend (missing jobs beyond the first 100)

1.3 WHEN `fetchWorkflowJobs` is called THEN the system uses
`listJobsForWorkflowRun` with `per_page: 100` parameter without pagination
handling

### Expected Behavior (Correct)

2.1 WHEN a workflow run has more than 100 jobs THEN the system SHALL fetch all
jobs using pagination to retrieve complete data

2.2 WHEN a workflow run has more than 100 jobs THEN the system SHALL send
complete traces including all jobs to the observability backend

2.3 WHEN `fetchWorkflowJobs` is called THEN the system SHALL use
`octokit.paginate()` to automatically handle pagination for all jobs

2.4 WHEN `fetchWorkflowJobs` is called THEN the system SHALL fetch ALL jobs
without any maximum limit

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a workflow run has 100 or fewer jobs THEN the system SHALL CONTINUE TO
fetch all jobs successfully

3.2 WHEN `fetchWorkflowJobs` is called THEN the system SHALL CONTINUE TO return
the same data structure (array of WorkflowJobsResponse)

3.3 WHEN `fetchWorkflowJobs` encounters an API error THEN the system SHALL
CONTINUE TO propagate the error to the caller for retry handling

3.4 WHEN workflow results are fetched THEN the system SHALL CONTINUE TO filter
and transform jobs using `toWorkflowJob` function

3.5 WHEN workflow results are fetched THEN the system SHALL CONTINUE TO validate
that at least one completed job exists
