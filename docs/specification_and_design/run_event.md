# specification and design

## specification

- Can be executed on any event
- Incomplete jobs output warning logs and are skipped
- metrics
  - `github.workflow.duration`
    - Duration of workflow
    - Calculated as the difference between the start of workflow and end time of
      last job completed. Notice that the end time is not the target workflow
      end time. This is for github specificity.
  - `github.job.duration`
    - Duration of job
  - `github.job.queued_duration`
- metrics and traces do not include jobs that are not completed
  - Github Actions OpenTelemetry job's telemetry is not collected.

## design

- Considered having the Workflow model hold events to enable event-specific
  behavior, but decided against it since we could comprehensively support
  various events
- Ensure backward compatibility
