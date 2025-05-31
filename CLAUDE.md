# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Compilation
- `npm run all` - Complete build process: format, lint, test, coverage, and package
- `npm run package` - Compile TypeScript to `dist/index.js` using ncc (required for GitHub Actions)
- `npm run bundle` - Format and package in one command

### Testing
- `npm run test` - Run all tests with coverage
- `npm run test-local` - Run quick local test (useful during development)
- `vitest src/main.test.ts -t 'should run successfully'` - Run specific test

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format:write` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run coverage` - Generate coverage badge

## Architecture Overview

This is a GitHub Action that collects OpenTelemetry metrics and traces from completed GitHub workflows. The architecture follows these key patterns:

### Core Flow
1. **Trigger**: Action runs on `workflow_run` completion events
2. **Data Collection**: Uses GitHub API to fetch workflow/job data via `fetchWorkflowResults()`
3. **Telemetry Generation**: Creates both metrics and traces from the collected data
4. **Export**: Sends telemetry data to OTLP endpoints

### Key Modules
- `src/main.ts`: Main entry point, orchestrates the entire flow
- `src/github/`: GitHub API integration and data fetching
- `src/metrics/`: Metrics creation (workflow duration, job duration, queued duration)
- `src/traces/`: Trace/span creation for workflow observability
- `src/instrumentation/`: OpenTelemetry SDK initialization and management
- `src/settings.ts`: Environment variable configuration

### Important Build Requirement
After any TypeScript changes, you MUST run `npm run package` to compile code to `dist/index.js`. GitHub Actions uses the compiled JavaScript files, not the TypeScript source.

### Testing Setup
- Uses Vitest for testing with GitHub API integration
- Requires GitHub CLI (`gh auth login`) for local testing to avoid API rate limits
- Default test environment variables are configured in `vitest.config.ts`
- Tests use real GitHub API calls for comprehensive integration testing

### Environment Configuration
The action is configured via OpenTelemetry standard environment variables:
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Primary OTLP endpoint
- `OTEL_SERVICE_NAME`: Service identifier
- `FEATURE_METRICS`/`FEATURE_TRACE`: Feature toggles
- `GITHUB_TOKEN`: Required for GitHub API access