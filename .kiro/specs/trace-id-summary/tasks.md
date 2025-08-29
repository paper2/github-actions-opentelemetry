# Implementation Plan

- [x] 1. Create GitHub summary module with core functionality
  - Create `src/github/summary.ts` with `writeSummary` function
  - Implement summary formatting with trace ID and descriptive label
  - Add proper TypeScript interfaces for summary options
  - _Requirements: 2.1, 3.1, 3.3_

- [ ] 2. Add unit tests for summary module
  - Create `src/github/summary.test.ts` with comprehensive test coverage
  - Mock `@actions/core.summary` API for testing
  - Test summary formatting, error handling, and edge cases
  - _Requirements: 4.1, 4.3_

- [ ] 3. Enhance trace creation to return trace ID
  - Modify `src/traces/create-trace.ts` to capture and return trace ID
  - Update return type to include trace ID alongside success status
  - Ensure backward compatibility with existing trace creation flow
  - _Requirements: 1.1, 1.2_

- [ ] 4. Add unit tests for enhanced trace creation
  - Update `src/traces/create-trace.test.ts` to test trace ID capture
  - Verify trace ID is properly extracted from OpenTelemetry trace
  - Test scenarios where trace creation fails or trace ID is unavailable
  - _Requirements: 1.4_

- [ ] 5. Integrate summary writing into main workflow
  - Update `src/main.ts` to call summary writing after trace creation
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
