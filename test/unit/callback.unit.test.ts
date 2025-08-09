import { describe, test, expect, vi, beforeEach } from 'vitest'
import { callbackHandler } from '../../src/api/drive/callback'
import type { Context } from 'hono'
import type { EnvHono } from '../../src/index'
import type { z } from 'zod'
import type { AuthCallbackResponseSchema, ErrorSchema } from '../../src/schema/drive'
import { mockEnvironments, mockCallbackResponses, createMockCallbackContext, mockOAuthResponses } from '../utils/mock-helpers'

// 型定義
type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>
type ErrorResponse = z.infer<typeof ErrorSchema>

describe('Callback Handler Unit Tests', () => {
  let mockFetch: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  describe('Environment Variable Validation', () => {
    test('should return error when GOOGLE_CLIENT_ID is missing', async () => {
      const mockEnv = mockEnvironments.missingClientId()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith(
        { error: 'Missing required environment variables' }, 
        400
      )
    })

    test('should return error when GOOGLE_CLIENT_SECRET is missing', async () => {
      const mockEnv = { ...mockEnvironments.validEnv(), GOOGLE_CLIENT_SECRET: undefined }
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith(
        { error: 'Missing required environment variables' }, 
        400
      )
    })
  })

  describe('OAuth Error Handling', () => {
    test('should handle OAuth error parameter', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?error=access_denied')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith(
        { error: 'OAuth error', details: 'access_denied' }, 
        400
      )
    })

    test('should handle missing authorization code', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith(
        { error: 'Missing authorization code' }, 
        400
      )
    })
  })

  describe('Token Exchange', () => {
    test('should successfully exchange code for tokens with refresh token', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockResolvedValueOnce(mockCallbackResponses.oAuthTokenSuccess('new-refresh-token'))
      
      await callbackHandler(context)
      
      expect(mockFetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'test-auth-code',
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000/api/drive/callback'
        })
      })

      expect(context.json).toHaveBeenCalledWith({
        success: true,
        refreshToken: 'new-refresh-token',
        message: 'Refresh Token obtained! Add this to your .dev.vars file: GOOGLE_REFRESH_TOKEN=new-refresh-token'
      }, 200)
    })

    test('should handle response without refresh token', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockResolvedValueOnce(mockCallbackResponses.oAuthTokenWithoutRefresh('access-token-only'))
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        success: false,
        message: 'No refresh token received. This may happen if the app was already authorized. Try revoking access at https://myaccount.google.com/permissions and re-authorize.',
        accessToken: 'Access token received'
      }, 200)
    })

    test('should handle response without refresh token but empty access token', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockResolvedValueOnce(mockCallbackResponses.oAuthTokenWithoutRefreshButWithAccess(''))
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        success: false,
        message: 'No refresh token received. This may happen if the app was already authorized. Try revoking access at https://myaccount.google.com/permissions and re-authorize.',
        accessToken: 'No access token'
      }, 200)
    })

    test('should handle token exchange failure', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockResolvedValueOnce(mockCallbackResponses.oAuthTokenError('Invalid authorization code'))
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        error: 'Failed to exchange authorization code for tokens',
        details: 'Token exchange failed: Invalid authorization code'
      }, 500)
    })
  })

  describe('Error Handling', () => {
    test('should handle network errors during token exchange', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        error: 'Failed to exchange authorization code for tokens',
        details: 'Network error'
      }, 500)
    })

    test('should handle non-Error exceptions', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test-auth-code')

      mockFetch.mockRejectedValueOnce('String error')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        error: 'Failed to exchange authorization code for tokens',
        details: 'Unknown error'
      }, 500)
    })

    test('should handle outer catch block with Error instance', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = createMockCallbackContext(mockEnv, 'invalid-url')
      
      await callbackHandler(context)
      
      expect(context.json).toHaveBeenCalledWith({
        error: 'Failed to exchange code for tokens',
        details: expect.any(String)
      }, 500)
    })

    test('should handle outer catch block with non-Error exception', async () => {
      const mockEnv = mockEnvironments.validEnv()
      const context = {
        ...createMockCallbackContext(mockEnv, 'http://localhost/callback?code=test'),
        req: { get url() { throw 'String error in getter' } }
      }
      
      await callbackHandler(context as any)
      
      expect(context.json).toHaveBeenCalledWith({
        error: 'Failed to exchange code for tokens',
        details: 'Unknown error'
      }, 500)
    })
  })
})