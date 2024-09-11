import { expect, describe, vi, test } from 'vitest'
import * as main from './main.js'

// Mock the action's entrypoint
const runMock = vi.spyOn(main, 'run').mockImplementation(async () => {})

describe('index', () => {
  test('calls run when imported', async () => {
    await import('./index.js')
    expect(runMock).toHaveBeenCalled()
  })
})
