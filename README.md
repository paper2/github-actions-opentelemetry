# GitHub Actions OpenTelemetry (Dogfooding Release)

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

This open-source tool allows you to send GitHub Actions workflow and job
execution times to an OpenTelemetry (OTLP) endpoint. It helps you monitor and
analyze GitHub Actions telemetry data using the OpenTelemetry protocol.

## Features

- 📊 Collects GitHub Actions workflow and job execution times
- 📦 Sends data to any OTLP-compatible backend for monitoring and observability
- 🚀 Easy integration with GitHub workflows
- 🔧 Simple configuration via environment variables

## Installation

To get started, add the action to your existing GitHub Actions workflow or
create a new workflow to send telemetry data after other workflows have
completed. You can install this action by referencing it directly in your
workflow.

### GitHub Actions Example

Here's an example of how to set up this action in a GitHub Actions workflow:

```yaml
name: Send Telemetry after Other Workflow

on:
  workflow_run:
    workflows:
      - Check Transpiled JavaScript
      - Continuous Integration
      - CodeQL
      - Lint Codebase
    types:
      - completed

permissions:
  # Need for private repository
  actions: read

jobs:
  send-telemetry:
    name: Send CI Telemetry
    runs-on: ubuntu-latest
    steps:
      - name: Run
        id: run
        uses: paper2/github-actions-opentelemetry@v0.0.2
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: https://collector-example.com
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

To configure the action, you need to set the following environment variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT`: The OTLP endpoint where telemetry data will be
  sent.
  - able to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and
    `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` too.
- `OTEL_SERVICE_NAME`: service.name attribute.

## Setup Instructions

1. **Create OTLP Endpoint**: Set up an OpenTelemetry-compatible backend to
   receive telemetry data (e.g., Jaeger, Prometheus, or other monitoring tools).
1. **Add Workflow**: Integrate the GitHub Actions OpenTelemetry tool into your
   workflows as shown in the examples above.

## Development

### Dev Container

- Dev Container runs Jaeger and Prometheus for local testing.
  - Jaeger: <http://localhost:16686>
  - Prometheus: <http://localhost:9090>

### Local test

```sh
npm run test-local
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE)
file for details.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.
Before contributing, ensure that your changes are well-documented and tested.

## Support

If you encounter any issues or have questions, feel free to open an issue in the
repository. We will do our best to assist you promptly.
