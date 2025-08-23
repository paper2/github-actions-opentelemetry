# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Commands

### Building and Compilation

- `npm run all` - Complete build process: format, lint, test, coverage, and
  package
- `npm run bundle` - Format and package in one command

### Testing

- `npm run test` - Run all tests with coverage
- `npm run test-local` - Run quick local test (useful during development)
- `vitest src/main.test.ts -t 'should run successfully'` - Run specific test
- `vitest src/traces/create-trace.test.ts src/metrics/create-metrics.test.ts` -
  Run specific test files

### Code Quality

- `npm run lint` - Run ESLint
- `npm run format:write` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run coverage` - Generate coverage badge

## Architecture Overview

This is a GitHub Action that collects OpenTelemetry metrics and traces from
completed GitHub workflows. The architecture follows these key patterns:

### Core Flow

1. **Trigger**: Action runs on `workflow_run` completion events (original) OR as
   final job in current workflow (new)
2. **Data Collection**: Uses GitHub API to fetch workflow/job data via
   `fetchWorkflowResults()`
3. **Telemetry Generation**: Creates both metrics and traces from the collected
   data
4. **Export**: Sends telemetry data to OTLP endpoints

### Key Modules

- `src/main.ts`: Main entry point, orchestrates the entire flow (initialize →
  fetch → create metrics/traces → flush/shutdown)
- `src/github/`: GitHub API integration and data fetching with retry logic
- `src/metrics/`: Metrics creation (workflow duration, job duration, queued
  duration) with gauge-based implementation
- `src/traces/`: Trace/span creation for workflow observability with
  hierarchical spans (workflow → jobs → steps)
- `src/instrumentation/`: OpenTelemetry SDK initialization and management
  (tracer, meter, exporters)
- `src/settings.ts`: Environment variable configuration and feature flags

### Data Model and Flow

The action processes GitHub workflow data through these key types:

- `WorkflowResults` contains both workflow metadata and job details
- Jobs include timing data (created_at, started_at, completed_at) and steps
- Spans are created hierarchically: root workflow span → job spans (with waiting
  time) → step spans
- Metrics track durations at workflow and job levels with associated attributes

#### Two Operating Modes

1. **workflow_run mode**: Processes completed workflows triggered by
   workflow_run events (all jobs completed)
2. **current workflow mode**: Processes current workflow when run as final job
   (incomplete jobs are filtered out)

### Important Build Requirement

After any TypeScript changes, you MUST run `npm run package` to compile code to
`dist/index.js`. GitHub Actions uses the compiled JavaScript files, not the
TypeScript source.

### Testing Setup

- Uses Vitest for testing with GitHub API integration
- Requires GitHub CLI (`gh auth login`) for local testing to avoid API rate
  limits
- Default test environment variables are configured in `vitest.config.ts`
- Tests use real GitHub API calls for comprehensive integration testing

### Environment Configuration

The action is configured via OpenTelemetry standard environment variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT`: Primary OTLP endpoint
- `OTEL_SERVICE_NAME`: Service identifier
- `OTEL_RESOURCE_ATTRIBUTES`: Additional resource attributes (e.g.,
  "environment=production,team=backend")
- `FEATURE_METRICS`/`FEATURE_TRACE`: Feature toggles
- `GITHUB_TOKEN`: Required for GitHub API access

### Development Guidelines

- Always run `npm run all` before commits to ensure complete build validation
- When adding new attributes to traces/metrics, update corresponding tests and
  documentation
- When modifying data collection logic, ensure both workflow_run and current
  workflow modes work correctly
- New features should gracefully handle incomplete jobs (return null) to
  maintain backward compatibility
- Must run `npm run all` after changing any code

## Coding Standards

- Never use `as` type casting outside of test code.
