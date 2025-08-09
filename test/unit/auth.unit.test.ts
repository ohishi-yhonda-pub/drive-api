import { describe, test, expect } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { app } from '../../src/index'
import type { z } from 'zod'
import type { AuthUrlResponseSchema, ErrorSchema } from '../../src/schema/drive'
import { mockEnvironments } from '../utils/mock-helpers'

// 型定義
type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>
type ErrorResponse = z.infer<typeof ErrorSchema>

describe('Auth Handler Unit Tests', () => {
  describe('authUrlHandler', () => {
    test('should return auth URL when GOOGLE_CLIENT_ID is provided', async () => {
      const ctx = createExecutionContext()
      const testEnv = mockEnvironments.validEnv()
      
      const request = new Request('http://localhost/api/drive/auth-url')
      const result = await app.request(request, {}, testEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<AuthUrlResponse>()
      const authUrl = data.authUrl

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(authUrl).toContain('client_id=test-client-id')
      expect(authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fdrive%2Fcallback')
      expect(authUrl).toContain('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file')
      expect(authUrl).toContain('access_type=offline')
      expect(authUrl).toContain('prompt=consent')
      expect(authUrl).toContain('response_type=code')
    })

    test('should return error when GOOGLE_CLIENT_ID is missing', async () => {
      const ctx = createExecutionContext()
      const testEnv = mockEnvironments.missingClientId()
      
      const request = new Request('http://localhost/api/drive/auth-url')
      const result = await app.request(request, {}, testEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing GOOGLE_CLIENT_ID')
    })

    test('should handle empty string GOOGLE_CLIENT_ID', async () => {
      const ctx = createExecutionContext()
      const testEnv = mockEnvironments.emptyClientId()
      
      const request = new Request('http://localhost/api/drive/auth-url')
      const result = await app.request(request, {}, testEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(400)
      const data = await result.json<ErrorResponse>()
      expect(data.error).toBe('Missing GOOGLE_CLIENT_ID')
    })

    test('should properly encode special characters in client ID', async () => {
      const ctx = createExecutionContext()
      const testEnv = mockEnvironments.specialCharClientId()
      
      const request = new Request('http://localhost/api/drive/auth-url')
      const result = await app.request(request, {}, testEnv, ctx)
      await waitOnExecutionContext(ctx)

      expect(result.status).toBe(200)
      const data = await result.json<AuthUrlResponse>()
      expect(data.authUrl).toContain('client_id=test-client%40%26%3D')
    })
  })
})