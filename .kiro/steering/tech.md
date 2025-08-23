# Technology Stack

## Core Technologies

- **Runtime**: Node.js 20+ (ES2022 target)
- **Language**: TypeScript with strict mode enabled
- **Module System**: ES Modules (NodeNext)
- **Package Manager**: npm with package-lock.json

## Key Dependencies

- **GitHub Actions**: `@actions/core`, `@actions/github`
- **GitHub API**: `@octokit/rest`, `@octokit/webhooks-types`
- **OpenTelemetry**:
  - `@opentelemetry/api`
  - `@opentelemetry/exporter-metrics-otlp-proto`
  - `@opentelemetry/exporter-trace-otlp-proto`
  - `@opentelemetry/resources`
  - `@opentelemetry/sdk-trace-base`
- **Utilities**: `ts-retry` for retry logic

## Build System & Tools

- **Bundler**: Vercel ncc for creating single-file distributions
- **Testing**: Vitest with V8 coverage
- **Linting**: ESLint with TypeScript plugin and strict rules
- **Formatting**: Prettier with specific configuration
- **Type Checking**: TypeScript compiler with strict settings

## Common Commands

```bash
# Install dependencies
npm ci

# Run all checks (format, lint, test, coverage, package)
npm run all

# Development workflow
npm run format:write    # Format code with Prettier
npm run lint           # Run ESLint
npm run test           # Run tests with coverage
npm run package        # Bundle with ncc
npm run package:watch  # Bundle in watch mode

# Testing
npm run test           # Full test suite with coverage
npm run test-local     # Quick local test for development

# Build artifacts
npm run bundle         # Format + package
npm run coverage       # Generate coverage badge
```

## Development Environment

- **Dev Container**: Configured with Jaeger (port 16686) and Prometheus
  (port 9090)
- **GitHub CLI**: Recommended for authentication during testing
- **Required Artifacts**: `/dist` directory must be committed (GitHub Actions
  requirement)

## Code Quality Standards

- Strict TypeScript with explicit return types required
- ESLint with comprehensive rules including no floating promises
- Prettier formatting with single quotes, no semicolons, LF line endings
- 100% test coverage expectation
- All async operations must be properly handled
