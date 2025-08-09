import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect } from 'vitest'
import { app } from '../../src/index.ts'
import type { z } from 'zod'
import type { ErrorSchema } from '../../src/schema/drive'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>

// Mock environment for tests that need empty env
const emptyEnv = {} as typeof env

// Valid mock environment with all required variables
const validEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
  GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
}

describe('Hono App Integration Tests', () => {

  describe('Folder Management', () => {
    test('GET /api/drive/list-folders should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/list-folders', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('POST /api/drive/create-folder should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'New Test Folder',
          parentId: 'test-default-folder-id'
        })
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('POST /api/drive/create-folder should handle validation errors', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentId: 'test-default-folder-id'
          // name is missing
        })
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })
  })

  describe('File Management', () => {
    test('DELETE /api/drive/delete-folder-contents should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          folderId: 'test-default-folder-id'
        })
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('DELETE /api/drive/delete-folder-contents should handle validation errors', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/delete-folder-contents', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // folderId is missing
        })
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })
  })

  describe('File Upload Endpoint', () => {
    test('POST /api/drive/upload should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const formData = new FormData()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)
      formData.append('folderId', 'test-folder-id')

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('POST /api/drive/upload should handle missing file validation', async () => {
      const ctx = createExecutionContext()

      const formData = new FormData()
      formData.append('folderId', 'test-folder-id')
      // file is missing

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })

    test('POST /api/drive/upload should handle empty environment', async () => {
      const ctx = createExecutionContext()

      const formData = new FormData()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)
      formData.append('folderId', 'test-folder-id')

      const request = new Request('http://localhost/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })
  })

  describe('Auth Endpoints', () => {
    test('GET /api/drive/auth-url should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/auth-url', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing GOOGLE_CLIENT_ID')
    })

    test('GET /api/drive/callback should handle missing environment variables', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/callback?code=test-auth-code', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json<ErrorResponse>()
      expect(data.error).toBe('Missing required environment variables')
    })

    test('GET /api/drive/callback should handle missing code parameter', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/callback', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
      const data = await res.json() as { error: { name: string } }
      expect(data.error.name).toBe('ZodError')
    })
  })

  describe('API Error Handling', () => {
    test('should handle invalid JSON in request body', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json{'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(400)
    })

    test('should handle wrong HTTP method', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/create-folder', {
        method: 'GET'  // Wrong method, should be POST
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(404)  // Route not found with wrong method
    })

    test('should handle non-existent route', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/api/drive/non-existent', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(404)
    })
  })

  describe('Root Endpoint', () => {
    test('GET / should return service status', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('Google Drive API - File Upload Service')
    })

    test('GET /doc should return Swagger UI', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/doc', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(200)
      const contentType = res.headers.get('content-type')
      expect(contentType).toContain('text/html')
    })

    test('GET /specification should return OpenAPI spec', async () => {
      const ctx = createExecutionContext()

      const request = new Request('http://localhost/specification', {
        method: 'GET'
      })

      const res = await app.request(request, {}, emptyEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(200)
      const data = await res.json() as { openapi: string; info: { title: string } }
      expect(data.openapi).toBe('3.0.0')
      expect(data.info.title).toBe('Google Drive API - File Upload Service')
    })
  })

  describe('Default Export (fetch handler)', () => {
    test('should handle request through default export fetch method', async () => {
      const ctx = createExecutionContext()
      const { default: appHandler } = await import('../../src/index.ts')

      const request = new Request('http://localhost/', {
        method: 'GET'
      })

      const res = await appHandler.fetch(request, env, ctx)
      await waitOnExecutionContext(ctx)

      expect(res.status).toBe(200)
      const text = await res.text()
      expect(text).toBe('Google Drive API - File Upload Service')
    })
  })
})