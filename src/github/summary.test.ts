/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { summary } from '@actions/core'
import { writeSummary, type SummaryOptions } from './summary.js'

// Mock @actions/core
vi.mock('@actions/core', () => ({
  summary: {
    addHeading: vi.fn(),
    addTable: vi.fn(),
    write: vi.fn()
  }
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

  describe('writeSummary', () => {
    it('should write summary with valid trace ID', async () => {
      const options: SummaryOptions = {
        traceId: 'cd18b4710d68394a9bdfa33be609d9ab'
      }

      await writeSummary(options)

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

    it('should handle standard 32-character trace IDs correctly', async () => {
      const standardTraceId = 'test1234567890abcdef1234567890ab' // 32 characters for testing
      const options: SummaryOptions = {
        traceId: standardTraceId
      }

      await writeSummary(options)

      expect(mockSummary.addTable).toHaveBeenCalledWith([
        [{ data: 'Workflow Trace ID', header: true }, { data: standardTraceId }]
      ])
    })

    it('should throw error for empty trace ID', async () => {
      const options: SummaryOptions = {
        traceId: ''
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Trace ID is required and cannot be empty'
      )

      expect(mockSummary.addHeading).not.toHaveBeenCalled()
      expect(mockSummary.addTable).not.toHaveBeenCalled()
      expect(mockSummary.write).not.toHaveBeenCalled()
    })

    it('should throw error for whitespace-only trace ID', async () => {
      const options: SummaryOptions = {
        traceId: '   \t\n   '
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Trace ID is required and cannot be empty'
      )

      expect(mockSummary.addHeading).not.toHaveBeenCalled()
      expect(mockSummary.addTable).not.toHaveBeenCalled()
      expect(mockSummary.write).not.toHaveBeenCalled()
    })

    it('should handle summary API write failure', async () => {
      const writeError = new Error('GitHub API rate limit exceeded')
      mockSummary.write.mockRejectedValue(writeError)

      const options: SummaryOptions = {
        traceId: 'test567890abcdef1234567890abcdef'
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Failed to write summary: GitHub API rate limit exceeded'
      )

      expect(mockSummary.addHeading).toHaveBeenCalled()
      expect(mockSummary.addTable).toHaveBeenCalled()
      expect(mockSummary.write).toHaveBeenCalled()
    })

    it('should handle summary API addHeading failure', async () => {
      const headingError = new Error('Permission denied')
      mockSummary.addHeading.mockImplementation(() => {
        throw headingError
      })

      const options: SummaryOptions = {
        traceId: 'test890abcdef1234567890abcdef12'
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Failed to write summary: Permission denied'
      )
    })

    it('should handle summary API addTable failure', async () => {
      const tableError = new Error('Invalid table format')
      mockSummary.addTable.mockImplementation(() => {
        throw tableError
      })

      const options: SummaryOptions = {
        traceId: 'testabcdef1234567890abcdef123456'
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Failed to write summary: Invalid table format'
      )
    })

    it('should handle non-Error exceptions from summary API', async () => {
      mockSummary.write.mockRejectedValue('String error message')

      const options: SummaryOptions = {
        traceId: 'testcdef1234567890abcdef1234567'
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Failed to write summary: String error message'
      )
    })

    it('should handle null/undefined exceptions from summary API', async () => {
      mockSummary.write.mockRejectedValue(null)

      const options: SummaryOptions = {
        traceId: 'testef1234567890abcdef12345678ab'
      }

      await expect(writeSummary(options)).rejects.toThrow(
        'Failed to write summary: null'
      )
    })

    it('should trim whitespace from trace ID before validation', async () => {
      const options: SummaryOptions = {
        traceId: '  test234567890abcdef1234567890ab  '
      }

      await writeSummary(options)

      // Should still work because we trim before checking if empty
      expect(mockSummary.addTable).toHaveBeenCalledWith([
        [
          { data: 'Workflow Trace ID', header: true },
          { data: '  test234567890abcdef1234567890ab  ' }
        ]
      ])
    })

    it('should maintain method chaining in summary API calls', async () => {
      const options: SummaryOptions = {
        traceId: 'test67890abcdef1234567890abcdef1'
      }

      await writeSummary(options)

      // Verify the chaining works correctly
      expect(mockSummary.addHeading).toHaveBeenCalledBefore(
        mockSummary.addTable
      )
      expect(mockSummary.addTable).toHaveBeenCalledBefore(mockSummary.write)
    })

    it('should use correct heading level and format', async () => {
      const options: SummaryOptions = {
        traceId: 'test90abcdef1234567890abcdef123'
      }

      await writeSummary(options)

      expect(mockSummary.addHeading).toHaveBeenCalledWith(
        'OpenTelemetry Trace Information',
        3
      )
    })
  })
})
