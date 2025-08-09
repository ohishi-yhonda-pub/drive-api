import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { z } from 'zod'
import type { ErrorSchema, FileUploadResponseSchema } from '../../src/schema/drive'
import { mockProcessFileUploadResponses } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>
type UploadResponse = z.infer<typeof FileUploadResponseSchema>

// Mock the googleDrive utilities before importing
vi.mock('../../src/utils/googleDrive')

import { app } from '../../src/index.ts'
import { processFileUpload } from '../../src/utils/googleDrive'

describe('Upload API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Mock environment object for testing
  const MOCK_ENV = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  }

  describe('Environment Variables', () => {
    test('should handle missing environment variables', async () => {
      const ctx = createExecutionContext()
      const emptyEnv = {} as typeof env

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt', { type: 'text/plain' }))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)
      
      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })
  })

  describe('File Validation', () => {
    test('should handle missing file', async () => {
      const ctx = createExecutionContext()

      const formData = new FormData()
      // No file appended

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json() as { error: { name: string } }
      // ZodError occurs before our code validation
      expect(data.error.name).toBe('ZodError')
    })

    test('should handle null file in form data', async () => {
      const ctx = createExecutionContext()

      const formData = new FormData()
      // @ts-expect-error - Testing null file value
      formData.append('file', null) // Force null value

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })
  })

  describe('Upload Functionality', () => {
    test('should upload file successfully', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockResolvedValue(mockProcessFileUploadResponses.success())

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<UploadResponse>()
      expect(data.success).toBe(true)
    })

    test('should handle invalid folder ID', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockResolvedValue(mockProcessFileUploadResponses.invalidFolderId())

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))
      formData.append('folderId', 'invalid-id')

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Invalid folder ID')
    })

    test('should handle unauthorized folder access', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockResolvedValue(mockProcessFileUploadResponses.unauthorizedFolder())

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))
      formData.append('folderId', 'unauthorized-id')

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(403)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Unauthorized folder access')
    })

    test('should handle no file provided', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockResolvedValue(mockProcessFileUploadResponses.noFile())

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('No file provided')
    })
  })

  describe('Error Handling', () => {
    test('should handle token refresh error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockRejectedValue(
        new Error('Failed to refresh access token: Invalid credentials')
      )

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to refresh access token')
      expect(data.details).toBe('Invalid credentials')
    })

    test('should handle missing access token error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockRejectedValue(
        new Error('No access token in response')
      )

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to get access token')
    })

    test('should handle upload failure', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockRejectedValue(
        new Error('Failed to upload to Google Drive: Network error')
      )

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to upload to Google Drive')
      expect(data.details).toBe('Network error')
    })

    test('should handle generic error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockRejectedValue(
        new Error('Some unexpected error')
      )

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to upload file')
      expect(data.details).toBe('Some unexpected error')
    })

    test('should handle non-Error object', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(processFileUpload).mockRejectedValue('String error')

      const formData = new FormData()
      formData.append('file', new File(['test content'], 'test.txt'))

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to upload file')
      expect(data.details).toBe('Unknown error')
    })
  })
})