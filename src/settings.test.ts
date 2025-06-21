import { test, describe, expect } from 'vitest'
import { createSettings, extractCustomAttributes } from './settings.js'

describe('settings', () => {
  test('should parse WORKFLOW_RUN_ID correctly', async () => {
    process.env.WORKFLOW_RUN_ID = '123'
    const settings = createSettings(process.env)
    expect(settings.workflowRunId).toBe(123)
  })

  test('should set workflowRunId to undefined when WORKFLOW_RUN_ID is not set', async () => {
    delete process.env.WORKFLOW_RUN_ID
    const settings = createSettings(process.env)
    expect(settings.workflowRunId).toBeUndefined()
  })

  test('should set owner and repository from environment variables', async () => {
    process.env.OWNER = 'owner-name'
    process.env.REPOSITORY = 'repo-name'
    const settings = createSettings(process.env)
    expect(settings.owner).toBe('owner-name')
    expect(settings.repository).toBe('repo-name')
  })

  test('should set FeatureFlagTrace to false when FEATURE_TRACE is "false"', async () => {
    process.env.FEATURE_TRACE = 'false'
    const settings = createSettings(process.env)
    expect(settings.FeatureFlagTrace).toBe(false)
  })

  test('should set FeatureFlagTrace to true by default when FEATURE_TRACE is not set', async () => {
    delete process.env.FEATURE_TRACE
    const settings = createSettings(process.env)
    expect(settings.FeatureFlagTrace).toBe(true)
  })

  test('should set FeatureFlagMetrics to true when FEATURE_METRICS is "false"', async () => {
    process.env.FEATURE_METRICS = 'false'
    const settings = createSettings(process.env)
    expect(settings.FeatureFlagMetrics).toBe(false)
  })

  test('should set FeatureFlagMetrics to true by default when FEATURE_METRICS is not set', async () => {
    delete process.env.FEATURE_METRICS
    const settings = createSettings(process.env)
    expect(settings.FeatureFlagMetrics).toBe(true)
  })

  test('should set logeLevel to "debug" when RUNNER_DEBUG is "1"', async () => {
    process.env.RUNNER_DEBUG = '1'
    const settings = createSettings(process.env)
    expect(settings.logeLevel).toBe('debug')
  })

  test('should set logeLevel to OTEL_LOG_LEVEL when set', async () => {
    process.env.RUNNER_DEBUG = '0'
    process.env.OTEL_LOG_LEVEL = 'warn'
    const settings = createSettings(process.env)
    expect(settings.logeLevel).toBe('warn')
  })

  test('should set logeLevel to "info" by default when no related env variables are set', async () => {
    delete process.env.RUNNER_DEBUG
    delete process.env.OTEL_LOG_LEVEL
    const settings = createSettings(process.env)
    expect(settings.logeLevel).toBe('info')
  })
})

describe('extractCustomAttributes', () => {
  test('should extract custom attributes from environment variables', async () => {
    const env = {
      CUSTOM_ATTRIBUTE_TRACE_JOB_TEAM: 'backend-team',
      CUSTOM_ATTRIBUTE_TRACE_JOB_ENVIRONMENT: 'production',
      CUSTOM_ATTRIBUTE_TRACE_JOB_REGION: 'us-west-2',
      OTHER_ENV_VAR: 'should-be-ignored'
    }

    const result = extractCustomAttributes(env, 'CUSTOM_ATTRIBUTE_TRACE_JOB')

    expect(result).toEqual({
      team: 'backend-team',
      environment: 'production',
      region: 'us-west-2'
    })
  })

  test('should return empty object when no matching environment variables exist', async () => {
    const env = {
      OTHER_ENV_VAR: 'some-value',
      ANOTHER_VAR: 'another-value'
    }

    const result = extractCustomAttributes(env, 'CUSTOM_ATTRIBUTE_TRACE_JOB')

    expect(result).toEqual({})
  })

  test('should ignore environment variables with undefined values', async () => {
    const env = {
      CUSTOM_ATTRIBUTE_TRACE_JOB_TEAM: 'backend-team',
      CUSTOM_ATTRIBUTE_TRACE_JOB_REGION: undefined,
      CUSTOM_ATTRIBUTE_TRACE_JOB_ENVIRONMENT: ''
    }

    const result = extractCustomAttributes(env, 'CUSTOM_ATTRIBUTE_TRACE_JOB')

    expect(result).toEqual({
      team: 'backend-team'
    })
  })

  test('should convert attribute names to lowercase', async () => {
    const env = {
      CUSTOM_ATTRIBUTE_TRACE_JOB_TEAM_NAME: 'backend-team',
      CUSTOM_ATTRIBUTE_TRACE_JOB_DEPLOYMENT_ENVIRONMENT: 'production'
    }

    const result = extractCustomAttributes(env, 'CUSTOM_ATTRIBUTE_TRACE_JOB')

    expect(result).toEqual({
      team_name: 'backend-team',
      deployment_environment: 'production'
    })
  })

  test('should work with different prefixes', async () => {
    const env = {
      CUSTOM_ATTRIBUTE_TRACE_WORKFLOW_PROJECT: 'my-app',
      CUSTOM_ATTRIBUTE_TRACE_WORKFLOW_VERSION: 'v1.2.3',
      CUSTOM_ATTRIBUTE_TRACE_STEP_CATEGORY: 'build'
    }

    const workflowResult = extractCustomAttributes(
      env,
      'CUSTOM_ATTRIBUTE_TRACE_WORKFLOW'
    )
    const stepResult = extractCustomAttributes(
      env,
      'CUSTOM_ATTRIBUTE_TRACE_STEP'
    )

    expect(workflowResult).toEqual({
      project: 'my-app',
      version: 'v1.2.3'
    })

    expect(stepResult).toEqual({
      category: 'build'
    })
  })
})

describe('createSettings with custom attributes', () => {
  test('should include custom attributes in settings', async () => {
    const env = {
      CUSTOM_ATTRIBUTE_TRACE_JOB_TEAM: 'backend-team',
      CUSTOM_ATTRIBUTE_TRACE_WORKFLOW_PROJECT: 'my-app',
      CUSTOM_ATTRIBUTE_TRACE_STEP_CATEGORY: 'build'
    }

    const settings = createSettings(env)

    expect(settings.customJobAttributes).toEqual({
      team: 'backend-team'
    })
    expect(settings.customWorkflowAttributes).toEqual({
      project: 'my-app'
    })
    expect(settings.customStepAttributes).toEqual({
      category: 'build'
    })
  })
})
