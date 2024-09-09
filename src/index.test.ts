import { jest } from '@jest/globals'
import * as main from './main.js'

// Mock the action's entrypoint
const runMock = jest.spyOn(main, 'run').mockImplementation(async () => {})

describe('index', () => {
  it('calls run when imported', async () => {
    await import('./index.js')
    expect(runMock).toHaveBeenCalled()
  })
})
