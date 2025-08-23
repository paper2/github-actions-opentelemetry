# Project Structure

## Root Directory Organization

```
├── src/                    # Source code (TypeScript)
├── dist/                   # Compiled output (must be committed)
├── coverage/               # Test coverage reports
├── examples/               # Usage examples and documentation
├── docs/                   # Additional documentation
├── img/                    # Screenshots and diagrams
├── badges/                 # Generated badges (coverage, etc.)
├── script/                 # Build and release scripts
└── .devcontainer/          # Development container configuration
```

## Source Code Architecture (`src/`)

### Core Entry Points
- `index.ts` - Main entry point that calls `run()` from `main.ts`
- `main.ts` - Primary application logic and orchestration
- `settings.ts` - Configuration management from environment variables

### Feature Modules
```
src/
├── github/                 # GitHub API integration
│   ├── github.ts          # Core GitHub API functions
│   ├── types.ts           # GitHub-specific type definitions
│   └── index.ts           # Module exports
├── metrics/               # OpenTelemetry metrics creation
│   ├── create-metrics.ts  # Main metrics logic
│   ├── create-gauges.ts   # Gauge creation utilities
│   ├── constants.ts       # Metric constants and definitions
│   └── index.ts           # Module exports
├── traces/                # OpenTelemetry traces creation
│   ├── create-trace.ts    # Main trace logic
│   ├── create-spans.ts    # Span creation utilities
│   └── index.ts           # Module exports
├── instrumentation/       # OpenTelemetry setup and lifecycle
│   ├── instrumentation.ts # Provider initialization and shutdown
│   └── index.ts           # Module exports
└── utils/                 # Shared utilities
    ├── calc-diff-sec.ts   # Time calculation helpers
    └── opentelemetry-all-disable.ts # Testing utilities
```

## File Naming Conventions

- **Implementation files**: `kebab-case.ts` (e.g., `create-metrics.ts`)
- **Test files**: `kebab-case.test.ts` (co-located with implementation)
- **Index files**: `index.ts` for module exports
- **Type definitions**: `types.ts` for module-specific types

## Module Organization Patterns

- Each feature module has its own directory with `index.ts` for clean exports
- Test files are co-located with implementation files
- Shared utilities are centralized in `utils/`
- Configuration is centralized in `settings.ts`
- Each module exports only what's needed by other modules

## Import/Export Conventions

- Use ES modules with `.js` extensions in imports (TypeScript requirement)
- Barrel exports through `index.ts` files
- Explicit return types required for all functions
- No default exports - use named exports consistently

## Testing Structure

- Tests co-located with source files using `.test.ts` suffix
- Comprehensive test coverage expected (100%)
- Integration tests use real GitHub API with authentication
- Local test environment includes Jaeger and Prometheus containers