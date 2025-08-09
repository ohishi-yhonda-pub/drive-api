import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { app } from '../../src/index.ts'
import type { z } from 'zod'
import type { ErrorSchema, FolderListResponseSchema } from '../../src/schema/drive'
import { mockListFoldersResults } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>
type FolderListResponse = z.infer<typeof FolderListResponseSchema>

// Mock the googleDrive utilities before importing
vi.mock('../../src/utils/googleDrive')

import { getAccessToken, listFolders } from '../../src/utils/googleDrive'

describe('List Folders API Unit Tests', () => {
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

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)
      
      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })
  })

  describe('List Functionality', () => {
    test('should list folders successfully without parentId', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue(mockListFoldersResults.singleFolder())

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(1)
      
      // Should use default folder ID
      expect(listFolders).toHaveBeenCalledWith('test-default-folder-id', 'test-access-token')
    })

    test('should list folders with custom parentId', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue(mockListFoldersResults.customFolder())

      const request = new Request('http://localhost/api/drive/list-folders?parentId=custom-parent-id', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(1)
      
      // Should use custom parent ID
      expect(listFolders).toHaveBeenCalledWith('custom-parent-id', 'test-access-token')
    })

    test('should handle empty folder list', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue(mockListFoldersResults.empty())

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(0)
    })

    test('should handle parentId as empty string', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue(mockListFoldersResults.empty())

      const request = new Request('http://localhost/api/drive/list-folders?parentId=', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      // Should use default folder ID when empty string
      expect(listFolders).toHaveBeenCalledWith('test-default-folder-id', 'test-access-token')
    })

    test('should handle parentId as null string', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue(mockListFoldersResults.empty())

      const request = new Request('http://localhost/api/drive/list-folders?parentId=null', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      // Should use 'null' as the parentId when explicitly provided
      expect(listFolders).toHaveBeenCalledWith('null', 'test-access-token')
    })
  })

  describe('Error Handling', () => {
    test('should handle token refresh error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockRejectedValue(
        new Error('Failed to refresh access token: Invalid credentials')
      )

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
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
      
      vi.mocked(getAccessToken).mockRejectedValue(
        new Error('No access token in response')
      )

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to get access token')
    })

    test('should handle list folders API error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockRejectedValue(
        new Error('Failed to list folders: Network error')
      )

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to list folders')
      expect(data.details).toBe('Network error')
    })

    test('should handle generic error', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockRejectedValue(
        new Error('Some unexpected error')
      )

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to list folders')
      expect(data.details).toBe('Some unexpected error')
    })

    test('should handle non-Error object', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockRejectedValue('String error')

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to list folders')
      expect(data.details).toBe('Unknown error')
    })
  })
})