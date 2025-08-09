import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { z } from 'zod'
import type { ErrorSchema, FolderCreateResponseSchema, FolderListResponseSchema } from '../../src/schema/drive'
import { mockCreateFolderResponses, mockListFoldersResults } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>
type FolderCreateResponse = z.infer<typeof FolderCreateResponseSchema>
type FolderListResponse = z.infer<typeof FolderListResponseSchema>

// Mock the googleDrive utilities before importing
vi.mock('../../src/utils/googleDrive')
import { createFolder, listFolders, getAccessToken } from '../../src/utils/googleDrive'
import { app } from '../../src/index.ts'

describe('Folder API Unit Tests', () => {
  // Mock environment object for testing  
  const MOCK_ENV = {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  }


  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  describe('Create Folder API', () => {
    test('should handle missing environment variables for create folder', async () => {
      const ctx = createExecutionContext()
      const emptyEnv = {} as typeof env

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder',
          parentId: 'parent-folder-id'
        })
      })

      const result = await app.request(request, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('should handle missing name', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parentId: 'parent-folder-id' })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })

    test('should handle environment variables not passed to handler in create folder', async () => {
      const ctx = createExecutionContext()
      const emptyEnv = {} as typeof env

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('should handle API failure for create folder', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockRejectedValue(
        new Error('Failed to create folder: API Error')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
    })

    test('should handle null access token from refresh for create folder', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockRejectedValue(
        new Error('No access token in response')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to get access token')
    })

    test('should handle general exception with Error object for create folder', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockRejectedValue(
        new Error('Some unexpected error')
      )

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
      expect(data.details).toBe('Some unexpected error')
    })

    test('should handle general exception with non-Error object for create folder', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockRejectedValue('String error')

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to create folder')
      expect(data.details).toBe('Unknown error')
    })

    test('should use default parent folder when parentId not provided', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockResolvedValue({
        success: true,
        folder: {
          id: 'new-folder-id',
          name: 'Test Folder',
          webViewLink: 'https://drive.google.com/folder-link'
        }
      })

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test Folder'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderCreateResponse>()
      expect(data.success).toBe(true)
    })

    test('should handle Drive API create folder failure', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(createFolder).mockResolvedValue({
        success: false,
        error: 'Folder name is required'
      })

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: '',
          parentId: 'parent-folder-id'
        })
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Folder name is required')
    })
  })

  describe('List Folders API', () => {
    test('should return error when environment variables are missing for list folders', async () => {
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

    test('should handle empty folders list', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue([])

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.folders).toEqual([])
    })

    test('should list folders successfully', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue([
        {
          id: 'folder1',
          name: 'Folder 1',
          webViewLink: 'https://drive.google.com/folder1',
          createdTime: '2023-01-01T00:00:00Z'
        },
        {
          id: 'folder2',
          name: 'Folder 2',
          webViewLink: 'https://drive.google.com/folder2',
          createdTime: '2023-01-02T00:00:00Z'
        }
      ])

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(2)
    })

    test('should list folders with custom parent ID', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue([
        {
          id: 'folder3',
          name: 'Folder 3',
          webViewLink: 'https://drive.google.com/folder3',
          createdTime: '2023-01-03T00:00:00Z'
        }
      ])

      const request = new Request('http://localhost/api/drive/list-folders?parentId=custom-parent-id', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      expect(listFolders).toHaveBeenCalledWith('custom-parent-id', 'test-access-token')
    })

    test('should handle API failure for list folders', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockRejectedValue(
        new Error('Failed to list folders: API Error')
      )

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(500)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Failed to list folders')
    })

    test('should handle folders without webViewLink', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue([
        {
          id: 'folder-no-link',
          name: 'Folder Without Link',
          webViewLink: null,
          createdTime: '2023-01-01T00:00:00Z'
        }
      ])

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.folders[0].webViewLink).toBeNull()
    })

    test('should use default parent when parentId not provided', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockResolvedValue([
        {
          id: 'folder1', 
          name: 'Folder 1', 
          webViewLink: 'link1', 
          createdTime: '2023-01-01'
        }
      ])

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const result = await app.request(request, {}, MOCK_ENV, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(1)
      
      // Verify default folder ID was used
      expect(listFolders).toHaveBeenCalledWith('test-default-folder-id', 'test-access-token')
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
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      expect(data.folders).toHaveLength(0)
      
      // Should use default folder ID when empty string provided
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
      const data = await result.json<FolderListResponse>()
      expect(data.success).toBe(true)
      
      // Should use 'null' as the parentId when explicitly provided
      expect(listFolders).toHaveBeenCalledWith('null', 'test-access-token')
    })

    test('should handle null access token from refresh for list folders', async () => {
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

    test('should handle general exception with Error object for list folders', async () => {
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

    test('should handle general exception with non-Error object for list folders', async () => {
      const ctx = createExecutionContext()
      
      vi.mocked(getAccessToken).mockResolvedValue('test-access-token')
      vi.mocked(listFolders).mockRejectedValue('String error')

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

    test('should handle Drive API list folders failure', async () => {
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
  })
})