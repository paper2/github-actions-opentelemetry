import { defineConfig } from 'vitest/config'
import { execSync } from 'child_process'

const isCI = process.env.CI === 'true'

if (!isCI) {
  // Set up GitHub token on local.
  setGitHubTokenEnv()
}

const defaultEnv = {
  FEATURE_METRICS: 'true',
  FEATURE_TRACE: 'true',
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:
    'http://prometheus:9090/api/v1/otlp/v1/metrics',
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://jaeger:4318/v1/traces',
  OTEL_SERVICE_NAME: 'github-actions-opentelemetry',
  OWNER: 'paper2',
  REPOSITORY: 'github-actions-opentelemetry',
  WORKFLOW_RUN_ID: '12246387114'
}

const CIEnv = {
  ...defaultEnv,
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: undefined,
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined
}

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text', 'lcov'],
      include: ['src']
    },
    env: isCI ? CIEnv : defaultEnv
  }
})

function setGitHubTokenEnv(): void {
  try {
    // check gh command is installed
    execSync('gh --version', { stdio: 'ignore' })

    console.log('gh command found. Attempting to retrieve the GitHub token...')

    const token = execSync('gh auth token', { encoding: 'utf-8' }).trim()
    if (!token) {
      console.warn('Failed to retrieve GitHub token using `gh auth token`.')
      return
    }
    process.env.GITHUB_TOKEN = token

    console.log(
      'GITHUB_TOKEN has been successfully set as an environment variable.'
    )
  } catch (error) {
    console.warn(
      'The gh command is either unavailable or failed to retrieve the GitHub token.',
      'Please ensure that the GitHub CLI is installed and authenticated ($ gh auth login) because this test interacts with the real GitHub API.',
      'Note that unauthenticated users are subject to strict API rate limits.'
    )
    console.warn(error)
  }
}
