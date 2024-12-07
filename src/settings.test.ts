import { test, describe, expect } from 'vitest'
import { createSettings } from './settings.js'

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
