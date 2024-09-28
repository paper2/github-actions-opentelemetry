import { describe, test, expect } from 'vitest'
import { calcDiffSec } from './calc-diff-sec.js'

describe('calcDiffSec', () => {
  test('should calculate the difference in seconds between two dates', () => {
    const date1 = new Date('2023-01-01T00:00:00Z')
    const date2 = new Date('2023-01-01T00:00:10Z')

    const diff = calcDiffSec(date1, date2)

    expect(diff).toBe(10)
  })

  test('should return a negative value if the first date is earlier', () => {
    const date1 = new Date('2023-01-01T00:00:20Z')
    const date2 = new Date('2023-01-01T00:00:10Z')

    const diff = calcDiffSec(date1, date2)

    expect(diff).toBe(-10)
  })
})
