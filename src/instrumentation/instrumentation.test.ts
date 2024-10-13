import { describe, test, expect } from 'vitest'
import { initialize, shutdown } from './instrumentation.js'

describe('initialize', () => {
  test('should initialize once', () => {
    expect(() => initialize()).not.toThrow()
    expect(() => initialize()).toThrow(
      'Global meter provider can not be set. Please check meter provider settings.'
    )
  })
})
describe('shutdown', () => {
  test('should shutdown be success', async () => {
    await expect(shutdown()).resolves.not.toThrow()
  })
  test('should shutdown be run in any times', async () => {
    await expect(shutdown()).resolves.not.toThrow()
    await expect(shutdown()).resolves.not.toThrow()
    await expect(shutdown()).resolves.not.toThrow()
  })
})
