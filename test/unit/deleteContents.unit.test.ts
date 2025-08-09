import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { app } from '../../src/index.ts'
import type { z } from 'zod'
import type { ErrorSchema, FolderDeleteResponseSchema } from '../../src/schema/drive'
import { mockDeleteFolderContentsResponses } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>
type FolderDeleteResponse = z.infer<typeof FolderDeleteResponseSchema>

// Mock the googleDrive utilities before importing
vi.mock('../../src/utils/googleDrive')
import { deleteFolderContents } from '../../src/utils/googleDrive'

describe('Delete Folder Contents API Unit Tests', () => {
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

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })
  })

  describe('Folder Content Deletion', () => {
    test('should delete folder contents successfully', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.success(3))

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderDeleteResponse>()
      expect(data.success).toBe(true)
      expect(data.message).toBe('Deleted 3 files from folder. ')
    })

    test('should handle folder ID required error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.noFolderId())

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: null })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json() as { error: { name: string } }
      // ZodError occurs before our code validation
      expect(data.error.name).toBe('ZodError')
    })

    test('should handle unauthorized folder access', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.unauthorizedFolder('test-folder-id'))

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(403)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Unauthorized folder access')
      expect(data.details).toBe('Folder test-folder-id is not under the allowed default folder')
    })

    test('should delete contents with errors reported', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.success(2, 1))

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderDeleteResponse>()
      expect(data.success).toBe(true)
      expect(data.message).toContain('Errors: 1')
    })

    test('should call deleteFolderContents with correct parameters', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.success(0))

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'custom-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      expect(deleteFolderContents).toHaveBeenCalledWith(
        'custom-folder-id',
        expect.objectContaining({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          refreshToken: 'test-refresh-token'
        }),
        'test-default-folder-id'
      )
    })

    test('should handle deleteFolderContents utility error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockResolvedValue(mockDeleteFolderContentsResponses.genericError('Some utility error'))

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
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

      vi.mocked(deleteFolderContents).mockRejectedValue(
        new Error('Failed to refresh access token: Invalid credentials')
      )

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
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

      vi.mocked(deleteFolderContents).mockRejectedValue(
        new Error('No access token in response')
      )

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to get access token')
    })

    test('should handle list folder contents error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockRejectedValue(
        new Error('Failed to list folder contents: API Error')
      )

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to list folder contents')
      expect(data.details).toBe('API Error')
    })

    test('should handle generic error', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockRejectedValue(
        new Error('Some unexpected error')
      )

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to delete folder contents')
      expect(data.details).toBe('Some unexpected error')
    })

    test('should handle non-Error object', async () => {
      const ctx = createExecutionContext()

      vi.mocked(deleteFolderContents).mockRejectedValue('String error')

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: 'test-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to delete folder contents')
      expect(data.details).toBe('Unknown error')
    })
  })
})