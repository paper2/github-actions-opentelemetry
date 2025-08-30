# Implementation Plan

- [x] 1. Update GitHub summary module to remove arbitrary label feature
  - Remove `label` parameter from `SummaryOptions` interface in
    `src/github/summary.ts`
  - Update `writeSummary` function to use fixed "Workflow Trace" label
  - Simplify the interface to only require `traceId` parameter
  - _Requirements: 2.1, 3.1, 3.3_

- [x] 2. Add unit tests for summary module
  - Create `src/github/summary.test.ts` with comprehensive test coverage
  - Mock `@actions/core.summary` API for testing
  - Test summary formatting, error handling, and edge cases
  - _Requirements: 4.1, 4.3_

- [x] 3. Enhance trace creation to return trace ID
  - Modify `src/traces/create-trace.ts` to capture and return trace ID
  - Update return type to include trace ID alongside success status
  - Ensure backward compatibility with existing trace creation flow
  - _Requirements: 1.1, 1.2_

- [x] 4. Add unit tests for enhanced trace creation
  - Update `src/traces/create-trace.test.ts` to test trace ID capture
  - Verify trace ID is properly extracted from OpenTelemetry trace
  - Test scenarios where trace creation fails or trace ID is unavailable
  - _Requirements: 1.4_

- [x] 5. Integrate summary writing into main workflow
  - Update `src/main.ts` to call summary writing after trace creation with
    simplified interface
  - Implement graceful error handling with fallback logging
  - Ensure action never fails due to summary writing issues
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Add unit tests for main workflow integration
  - Update `src/main.test.ts` to test summary integration
  - Test successful summary writing and fallback scenarios
  - Verify error handling doesn't affect core action functionality
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. Update GitHub module exports
  - Add summary module to `src/github/index.ts` exports
  - Ensure clean module interface for summary functionality
  - _Requirements: 3.1_

- [ ] 8. Update README documentation with trace ID summary feature
  - Add new section explaining the trace ID summary feature in README.md
  - Include visual examples of what the summary looks like in GitHub Actions
  - Document how users can use the trace ID with monitoring systems like Jaeger
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 9. Add configuration documentation if needed
  - Document any configuration parameters related to trace ID summary
  - Update existing configuration sections to mention trace ID display
  - Ensure documentation is consistent with existing format and style
  - _Requirements: 5.4_
