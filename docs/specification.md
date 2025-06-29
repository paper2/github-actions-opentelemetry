# GitHub Actions OpenTelemetry - Specification

## Operating Modes

The action operates in two distinct modes based on the triggering event:

## workflow_run Mode

- **Trigger**: `workflow_run` completion events
- **Target**: Processes the completed workflow specified in the event payload
- **Job Requirement**: All jobs must be completed (throws error for incomplete
  jobs)
- **Backward Compatibility**: Maintains strict completion requirements for
  existing integrations

### Current Workflow Mode

- **Trigger**: Any other GitHub event type (push, pull_request, etc.)
- **Target**: Processes the current workflow when run as final job
- **Job Filtering**: Incomplete jobs are filtered out with warning logs
- **Flexibility**: Supports in-progress workflows by collecting data from
  completed jobs only

## Data Collection Process

### GitHub API Integration

- **Authentication**: Requires `GITHUB_TOKEN` input parameter
- **API Endpoints**: Uses `getWorkflowRunAttempt` and `listJobsForWorkflowRun`
- **Retry Logic**: Implements exponential backoff (default: 1000ms delay, 10 max
  attempts)
- **Pagination**: Supports up to 100 jobs per workflow run

### Job Processing Rules

#### Completion Status Validation

- **workflow_run events**: Jobs with status ≠ 'completed' throw an error
- **Other events**: Jobs with status ≠ 'completed' are logged and skipped
- **Required Fields**: All processed jobs must have `conclusion`,
  `completed_at`, and `workflow_name`

#### Self-Exclusion Logic

- The GitHub Actions OpenTelemetry job excludes itself from telemetry collection

## Metrics Specification

### Feature Control

- **Environment Variable**: `FEATURE_METRICS` (default: true)
- **Meter Name**: `github-actions-metrics`
- **Metric Type**: Gauge (point-in-time measurements)
- **Unit**: Seconds (`s`)

### github.workflow.duration

- **Calculation**: `workflow.created_at` to latest `job.completed_at`
- **Rationale**: GitHub workflows lack official end timestamps
- **Attributes**:
  - `workflow.name`: Workflow name
  - `repository`: Full repository name (owner/repo)

### github.job.duration

- **Calculation**: `job.started_at` to `job.completed_at`
- **Scope**: Individual job execution time
- **Attributes**:
  - `workflow.name`: Parent workflow name
  - `repository`: Full repository name
  - `job.name`: Job identifier
  - `job.conclusion`: Job completion status (success, failure, etc.)

### github.job.queued_duration

- **Calculation**: `job.created_at` to `job.started_at`
- **Edge Case**: Negative values are skipped with notice logs (GitHub API timing
  issue)
- **Attributes**: Same as `github.job.duration`

## Trace Specification

### Feature Control (Trace)

- **Environment Variable**: `FEATURE_TRACE` (default: true)
- **Tracer Name**: `github-actions-opentelemetry`
- **Exporter**: OTLP Protocol Buffer format

### Span Hierarchy

#### Root Workflow Span

- **Name**: Workflow name
- **Duration**: `workflow.created_at` to latest `job.completed_at`
- **Status**: Derived from workflow conclusion or 'in_progress'
- **Attributes**:
  - `repository`: Full repository name
  - `run_id`: Workflow run ID
  - `run_attempt`: Attempt number
  - `url`: Workflow HTML URL

#### Job Container Spans

- **Name**: `{job.name} with time of waiting runner`
- **Duration**: `job.created_at` to `job.completed_at` (includes queue time)
- **Purpose**: Provides complete job timeline including waiting period

#### Job Waiting Spans (Child)

- **Name**: `waiting runner for {job.name}`
- **Duration**: `job.created_at` to `job.started_at`
- **Status**: Always 'success' (waiting is not an error condition)
- **Edge Case**: Skipped when queue duration is negative

#### Job Execution Spans (Child)

- **Name**: Job name
- **Duration**: `job.started_at` to `job.completed_at`
- **Status**: Derived from job conclusion
- **Attributes**:
  - `job.id`: GitHub job identifier
  - `job.conclusion`: Job completion status
  - `runner.name`: Runner name (if available)
  - `runner.group`: Runner group (if available)

#### Step Spans (Grandchildren)

- **Name**: Step name
- **Duration**: `step.started_at` to `step.completed_at`
- **Status**: Derived from step conclusion
- **Validation**: Steps with null timestamps are skipped with warnings

### Status Code Mapping

- **success** → `SpanStatusCode.OK`
- **failure, timed_out** → `SpanStatusCode.ERROR`
- **in_progress** → `SpanStatusCode.UNSET`
- **Others** → `SpanStatusCode.UNSET`

## Configuration

### Required Environment Variables

- **GITHUB_TOKEN**: GitHub API authentication (action input)

### Optional Environment Variables

- **FEATURE_METRICS**: Enable/disable metrics collection (default: true)
- **FEATURE_TRACE**: Enable/disable trace collection (default: true)
- **OTEL_EXPORTER_OTLP_ENDPOINT**: OTLP endpoint URL
- **OTEL_SERVICE_NAME**: Service identifier for telemetry
- **OTEL_RESOURCE_ATTRIBUTES**: Additional resource attributes
- **OTEL_LOG_LEVEL**: OpenTelemetry logging level
- **RUNNER_DEBUG**: GitHub Actions debug mode (sets log level to debug)

### Override Settings

- **WORKFLOW_RUN_ID**: Override target workflow run ID
- **OWNER**: Override repository owner
- **REPOSITORY**: Override repository name

## Error Handling

### Validation Errors

- Missing required job fields (conclusion, completed_at, workflow_name)
- Missing required step fields (started_at, completed_at)
- Invalid workflow status for workflow_run events

### Recoverable Issues

- Negative queue durations (GitHub API timing inconsistency)
- Missing step data (jobs without steps)
- Incomplete jobs in non-workflow_run events

### Retry Logic

- Automatic retry for GitHub API failures
- Configurable delay and maximum attempts
- Exponential backoff strategy
