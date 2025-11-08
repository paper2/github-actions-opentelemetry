# Requirements Document

## Introduction

This feature enables the creation of individual traces for each workflow job
instead of a single trace for the entire workflow. This addresses the limitation
of cloud trace backends (like GCP Cloud Trace) that impose limits on the number
of spans per trace (typically 1000 spans). For workflows with hundreds or
thousands of jobs, this feature prevents trace data loss and ensures complete
observability coverage.

## Requirements

### Requirement 1

**User Story:** As a DevOps engineer with large-scale workflows, I want each
workflow job to generate its own trace, so that I can avoid hitting the
span-per-trace limits imposed by my observability backend.

#### Acceptance Criteria

1. WHEN the per-job trace mode is enabled THEN the system SHALL create a
   separate trace for each workflow job
2. WHEN creating per-job traces THEN each trace SHALL contain the job span and
   all its child step spans
3. WHEN a workflow has multiple jobs THEN the system SHALL create N traces where
   N equals the number of jobs
4. IF a workflow has 1000 jobs THEN the system SHALL successfully create 1000
   separate traces without hitting span limits

### Requirement 2

**User Story:** As a platform engineer, I want to configure whether traces are
created per-workflow or per-job, so that I can choose the appropriate mode based
on my workflow size and backend limitations.

#### Acceptance Criteria

1. WHEN configuring the action THEN the system SHALL provide an input parameter
   to control trace creation mode
2. WHEN the trace mode parameter is set to "workflow" THEN the system SHALL
   create a single trace for the entire workflow (current behavior)
3. WHEN the trace mode parameter is set to "job" THEN the system SHALL create
   individual traces for each job
4. IF the trace mode parameter is not specified THEN the system SHALL default to
   "workflow" mode for backward compatibility
5. WHEN the trace mode is invalid THEN the system SHALL log a warning and
   default to "workflow" mode

### Requirement 3

**User Story:** As a developer analyzing traces, I want per-job traces to
maintain correlation with the workflow, so that I can understand which workflow
and run each job trace belongs to.

#### Acceptance Criteria

1. WHEN creating a per-job trace THEN the system SHALL include workflow-level
   attributes in each job trace
2. WHEN creating a per-job trace THEN the system SHALL include the workflow run
   ID as a trace attribute
3. WHEN creating a per-job trace THEN the system SHALL include the repository
   name as a trace attribute
4. WHEN creating a per-job trace THEN the system SHALL include the workflow name
   as a trace attribute
5. WHEN creating a per-job trace THEN the system SHALL include the run attempt
   number as a trace attribute
6. WHEN creating a per-job trace THEN the system SHALL include the workflow URL
   as a trace attribute

### Requirement 4

**User Story:** As a user of the trace ID summary feature, I want to see all job
trace IDs when using per-job mode, so that I can access traces for specific jobs
in my monitoring system.

#### Acceptance Criteria

1. WHEN per-job trace mode is enabled AND trace ID summary is enabled THEN the
   system SHALL display all job trace IDs in the GitHub Actions summary
2. WHEN displaying multiple trace IDs THEN the system SHALL label each trace ID
   with its corresponding job name
3. WHEN displaying multiple trace IDs THEN the system SHALL format them in a
   readable list or table format
4. IF there are more than 50 job traces THEN the system SHALL still display all
   trace IDs without truncation
5. WHEN no traces are created THEN the system SHALL display an appropriate
   message indicating no traces were generated

### Requirement 5

**User Story:** As a workflow author, I want per-job traces to include the same
span structure as the current implementation, so that my existing trace analysis
tools and queries continue to work.

#### Acceptance Criteria

1. WHEN creating a per-job trace THEN the root span SHALL be the job span with
   waiting time
2. WHEN creating a per-job trace THEN the system SHALL create a child span for
   the runner waiting period
3. WHEN creating a per-job trace THEN the system SHALL create a child span for
   the actual job execution
4. WHEN creating a per-job trace THEN the system SHALL create child spans for
   each step under the job execution span
5. WHEN creating step spans THEN the system SHALL include the same attributes
   and status codes as the current implementation

### Requirement 6

**User Story:** As a platform engineer, I want per-job trace creation to handle
errors gracefully, so that a failure in one job's trace doesn't prevent other
jobs from being traced.

#### Acceptance Criteria

1. WHEN creating per-job traces AND one job trace fails THEN the system SHALL
   continue creating traces for remaining jobs
2. WHEN a job trace creation fails THEN the system SHALL log the error with the
   job name and ID
3. WHEN all job traces fail to create THEN the system SHALL exit with an error
   code
4. IF some job traces succeed and others fail THEN the system SHALL return the
   successful trace IDs and log failures

### Requirement 7

**User Story:** As a user of the GitHub Actions OpenTelemetry action, I want
clear documentation about the per-job trace feature, so that I can understand
when and how to use it.

#### Acceptance Criteria

1. WHEN the per-job trace feature is implemented THEN the system SHALL include
   updated README documentation explaining the feature
2. WHEN documenting the feature THEN the system SHALL explain the span-per-trace
   limitation and when to use per-job mode
3. WHEN documenting the feature THEN the system SHALL provide examples of the
   trace mode configuration parameter
4. WHEN documenting the feature THEN the system SHALL include screenshots or
   examples of the trace ID summary with multiple job traces
5. WHEN documenting the feature THEN the system SHALL explain the trade-offs
   between workflow-level and job-level traces
