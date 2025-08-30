/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { summary } from '@actions/core'
import { writeSummaryIfNeeded } from './summary.js'

// Mock @actions/core
vi.mock('@actions/core', () => ({
  summary: {
    addHeading: vi.fn(),
    addTable: vi.fn(),
    write: vi.fn()
  },
  info: vi.fn(),
  warning: vi.fn()
}))

describe('summary', () => {
  const mockSummary = vi.mocked(summary)

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup chainable mock methods
    mockSummary.addHeading.mockReturnValue(summary)
    mockSummary.addTable.mockReturnValue(summary)
    mockSummary.write.mockResolvedValue(summary)
  })

  describe('writeSummaryIfNeeded', () => {
    it('should write summary with valid trace ID', async () => {
      const traceId = 'cd18b4710d68394a9bdfa33be609d9ab'

      await writeSummaryIfNeeded(traceId)

      expect(mockSummary.addHeading).toHaveBeenCalledWith(
        'OpenTelemetry Trace Information',
        3
      )
      expect(mockSummary.addTable).toHaveBeenCalledWith([
        [
          { data: 'Workflow Trace ID', header: true },
          { data: 'cd18b4710d68394a9bdfa33be609d9ab' }
        ]
      ])
      expect(mockSummary.write).toHaveBeenCalledOnce()
    })

    it('should handle empty trace ID by displaying no trace message', async () => {
      await writeSummaryIfNeeded('')

      expect(mockSummary.addHeading).toHaveBeenCalledWith(
        'OpenTelemetry Trace Information',
        3
      )
      expect(mockSummary.addTable).toHaveBeenCalledWith([
        [
          { data: 'Workflow Trace ID', header: true },
          { data: 'No trace ID was generated' }
        ]
      ])
      expect(mockSummary.write).toHaveBeenCalledOnce()
    })

    it('should handle summary writing failures gracefully with valid trace ID', async () => {
      const writeError = new Error('GitHub API rate limit exceeded')
      mockSummary.write.mockRejectedValue(writeError)

      const traceId = 'test567890abcdef1234567890abcdef'

      // Should not throw an error
      await expect(writeSummaryIfNeeded(traceId)).resolves.toBeUndefined()
    })

    it('should handle summary writing failures gracefully with empty trace ID', async () => {
      const writeError = new Error('Permission denied')
      mockSummary.write.mockRejectedValue(writeError)

      // Should not throw an error
      await expect(writeSummaryIfNeeded('')).resolves.toBeUndefined()
    })

    it('should handle summary API addHeading failure gracefully', async () => {
      const headingError = new Error('Permission denied')
      mockSummary.addHeading.mockImplementation(() => {
        throw headingError
      })

      const traceId = 'test890abcdef1234567890abcdef12'

      // Should not throw an error
      await expect(writeSummaryIfNeeded(traceId)).resolves.toBeUndefined()
    })

    it('should handle non-Error exceptions from summary API', async () => {
      mockSummary.write.mockRejectedValue('String error message')

      const traceId = 'testcdef1234567890abcdef1234567'

      // Should not throw an error
      await expect(writeSummaryIfNeeded(traceId)).resolves.toBeUndefined()
    })

    it('should never throw errors and always complete gracefully', async () => {
      // Test with various error scenarios to ensure no exceptions are thrown
      mockSummary.addHeading.mockImplementation(() => {
        throw new Error('Heading error')
      })

      await expect(
        writeSummaryIfNeeded('test-trace-id')
      ).resolves.toBeUndefined()

      mockSummary.addHeading.mockReturnValue(summary)
      mockSummary.addTable.mockImplementation(() => {
        throw new Error('Table error')
      })

      await expect(
        writeSummaryIfNeeded('test-trace-id-2')
      ).resolves.toBeUndefined()

      mockSummary.addTable.mockReturnValue(summary)
      mockSummary.write.mockRejectedValue(new Error('Write error'))

      await expect(
        writeSummaryIfNeeded('test-trace-id-3')
      ).resolves.toBeUndefined()
    })

    it('should log success message when summary is written successfully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const traceId = 'successful-trace-id-123456789'

      await writeSummaryIfNeeded(traceId)

      expect(consoleSpy).toHaveBeenCalledWith(
        'Trace ID summary written successfully.'
      )

      consoleSpy.mockRestore()
    })
  })
})
