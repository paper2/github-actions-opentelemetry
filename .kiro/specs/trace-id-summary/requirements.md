# Requirements Document

## Introduction

This feature adds the ability to display trace IDs in GitHub Actions summary after the OpenTelemetry action completes execution. This will provide users with immediate access to trace identifiers, making it easier to correlate GitHub Actions workflow execution with traces in their observability systems like Jaeger, Grafana, or other OTLP-compatible backends.

## Requirements

### Requirement 1

**User Story:** As a DevOps engineer, I want to see trace IDs in the GitHub Actions summary, so that I can quickly navigate to the corresponding traces in my monitoring system without having to search through logs.

#### Acceptance Criteria

1. WHEN the OpenTelemetry action completes successfully THEN the system SHALL display the single workflow trace ID in the GitHub Actions summary
2. WHEN the trace is created during workflow execution THEN the system SHALL display the trace ID with a clear descriptive label
3. WHEN the action runs in a workflow THEN the trace ID SHALL be formatted as a clickable link if an observability endpoint URL is provided
4. IF no trace is created THEN the system SHALL display an appropriate message indicating no trace was generated

### Requirement 2

**User Story:** As a developer, I want the trace ID to be clearly labeled and formatted in the summary, so that I can easily identify and access the workflow trace in my monitoring system.

#### Acceptance Criteria

1. WHEN displaying the trace ID THEN the system SHALL include a descriptive label (e.g., "Workflow Trace")
2. WHEN displaying trace information THEN the system SHALL include the trace creation timestamp
3. WHEN displaying trace information THEN the system SHALL include the total trace duration
4. IF the trace contains multiple spans THEN the system SHALL display the span count in the summary

### Requirement 3

**User Story:** As a platform engineer, I want to configure the trace ID display format and destination URLs, so that I can customize the summary to work with my organization's specific monitoring infrastructure.

#### Acceptance Criteria

1. WHEN configuring the action THEN the system SHALL accept an optional observability endpoint URL parameter
2. IF an endpoint URL is provided THEN the system SHALL format the trace ID as a clickable link to the monitoring system
3. WHEN no endpoint URL is configured THEN the system SHALL display the trace ID as plain text
4. IF custom trace ID formatting is needed THEN the system SHALL support configurable display templates

### Requirement 4

**User Story:** As a workflow author, I want the trace ID summary to be non-intrusive and not affect my existing workflow execution, so that adding observability doesn't break my CI/CD pipeline.

#### Acceptance Criteria

1. WHEN the trace ID summary fails to generate THEN the system SHALL NOT fail the entire action
2. WHEN writing to GitHub Actions summary THEN the system SHALL handle API rate limits gracefully
3. IF the summary cannot be written THEN the system SHALL log the trace ID to the action output as fallback
4. WHEN the action completes THEN the trace ID summary SHALL be the last step before action completion