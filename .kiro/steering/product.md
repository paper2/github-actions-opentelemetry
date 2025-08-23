# Product Overview

GitHub Actions OpenTelemetry is a GitHub Action that collects and sends telemetry data (metrics and traces) from GitHub Actions workflows to OpenTelemetry Protocol (OTLP) endpoints for monitoring and observability.

## Key Features

- **Metrics Collection**: Captures workflow duration, job duration, and job queued duration
- **Trace Collection**: Creates detailed traces of workflows, jobs, and steps with comprehensive attributes
- **OTLP Integration**: Sends data to any OTLP-compatible backend (Jaeger, Prometheus, etc.)
- **Zero Modification**: Collects telemetry without requiring changes to existing workflows
- **Custom Attributes**: Supports custom resource attributes via environment variables

## Primary Use Cases

- Monitor GitHub Actions workflow performance and execution times
- Analyze workflow bottlenecks and optimization opportunities
- Track CI/CD pipeline health and reliability
- Integrate GitHub Actions observability into existing monitoring infrastructure

## Target Users

DevOps engineers, SRE teams, and developers who need visibility into their GitHub Actions workflows and want to integrate CI/CD observability into their monitoring stack.