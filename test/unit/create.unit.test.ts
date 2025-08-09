import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { app } from '../../src/index.ts'
import type { z } from 'zod'
import type { ErrorSchema, FolderCreateResponseSchema } from '../../src/schema/drive'
import { mockCreateFolderResponses } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>
type FolderCreateResponse = z.infer<typeof FolderCreateResponseSchema>

// Mock the googleDrive utilities before importing
vi.mock('../../src/utils/googleDrive')
import { createFolder } from '../../src/utils/googleDrive'

describe('Create Folder API Unit Tests', () => {
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

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })
  })

  describe('Folder Creation', () => {
    test('should create folder successfully', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockResolvedValue(mockCreateFolderResponses.success())

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderCreateResponse>()
      expect(data.success).toBe(true)
      expect(data.folder).toEqual({
        id: 'folder-id',
        name: 'Test Folder',
        webViewLink: 'https://drive.google.com/folder-link'
      })
    })

    test('should handle folder name required error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockResolvedValue(mockCreateFolderResponses.noName())

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: null })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json() as { error: { name: string } }
      // ZodError occurs before our code validation
      expect(data.error.name).toBe('ZodError')
    })

    test('should create folder with custom parent ID', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockResolvedValue(mockCreateFolderResponses.success())

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder', parentId: 'custom-parent' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      expect(createFolder).toHaveBeenCalledWith(
        'Test Folder',
        'custom-parent',
        expect.objectContaining({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          refreshToken: 'test-refresh-token'
        }),
        'test-default-folder-id'
      )
    })

    test('should handle createFolder utility error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockResolvedValue(mockCreateFolderResponses.genericError('Some utility error'))

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Some utility error')
    })
  })

  describe('Error Handling', () => {
    test('should handle token refresh error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockRejectedValue(
        new Error('Failed to refresh access token: Invalid credentials')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
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

      vi.mocked(createFolder).mockRejectedValue(
        new Error('No access token in response')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to get access token')
    })

    test('should handle create folder API error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockRejectedValue(
        new Error('Failed to create folder: API Error')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
      expect(data.details).toBe('API Error')
    })

    test('should handle generic error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockRejectedValue(
        new Error('Some unexpected error')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
      expect(data.details).toBe('Some unexpected error')
    })

    test('should handle non-Error object', async () => {
      const ctx = createExecutionContext()

      vi.mocked(createFolder).mockRejectedValue('String error')

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Folder' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
      expect(data.details).toBe('Unknown error')
    })
  })
})