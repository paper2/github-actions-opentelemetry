import { describe, test, expect } from 'vitest'
import { initialize, shutdown } from './instrumentation.js'

describe('initialize', () => {
  test('should initialize successfully', () => {
    expect(() => initialize()).not.toThrow()
  })
  test('should initilize be run in any times', async () => {
    expect(() => initialize()).not.toThrow()
    expect(() => initialize()).not.toThrow()
    expect(() => initialize()).not.toThrow()
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
