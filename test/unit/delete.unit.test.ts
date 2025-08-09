import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { app } from '../../src/index.ts'
import type { z } from 'zod'
import type { ErrorSchema } from '../../src/schema/drive'
import { mockEnvironments } from '../utils/mock-helpers'

// 型定義
type ErrorResponse = z.infer<typeof ErrorSchema>

describe('Delete Folder Contents Handler Unit Tests', () => {

  it('should handle environment variables not passed to handler', async () => {
    const ctx = createExecutionContext()

    const request = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folderId: 'test-folder-id' })
    })

    const result = await app.request(request, {}, mockEnvironments.empty(), ctx)
    await waitOnExecutionContext(ctx)

    expect(result.status).toBe(400)
    const data = await result.json<ErrorResponse>()
    expect(data.error).toBe('Missing required environment variables')
  })

  it('should handle missing folderId', async () => {
    const ctx = createExecutionContext()

    const request = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })

    const result = await app.request(request, {}, mockEnvironments.validEnv(), ctx)
    await waitOnExecutionContext(ctx)
    
    expect(result.status).toBe(400)
  })

  it('should handle missing environment variables', async () => {
    const ctx = createExecutionContext()

    const request = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folderId: 'test-folder-id' })
    })

    const result = await app.request(request, {}, mockEnvironments.empty(), ctx)
    await waitOnExecutionContext(ctx)
    
    expect(result.status).toBe(400)
  })

  it('should handle environment variables in test environment', async () => {
    const ctx = createExecutionContext()

    const request = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folderId: 'test-folder-id' })
    })

    const result = await app.request(request, {}, mockEnvironments.empty(), ctx)
    await waitOnExecutionContext(ctx)
    
    expect(result.status).toBe(400)
    const data = await result.json<ErrorResponse>()
    expect(data.error).toBe('Missing required environment variables')
  })

  it('should handle environment variable access in Cloudflare test environment', async () => {
    const ctx = createExecutionContext()

    const request = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ folderId: 'test-folder-id' })
    })

    const result = await app.request(request, {}, mockEnvironments.empty(), ctx)
    await waitOnExecutionContext(ctx)
    
    expect(result.status).toBe(400)
    const data = await result.json<ErrorResponse>()
    expect(data.error).toBe('Missing required environment variables')
  })

})