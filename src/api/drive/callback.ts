import { createRoute, RouteHandler, z } from '@hono/zod-openapi'
import { ErrorSchema, AuthCallbackResponseSchema } from '../../schema/drive'
import { EnvHono } from '../..'
import { exchangeCodeForTokens } from '../../utils/oauth'

export const callbackRoute = createRoute({
  method: 'get',
  path: '/callback',
  request: {
    query: z.object({
      code: z.string().describe('Authorization code from Google OAuth'),
      scope: z.string().optional().describe('OAuth scope'),
      error: z.string().optional().describe('OAuth error if any')
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthCallbackResponseSchema
        }
      },
      description: 'OAuth callback processed successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request or OAuth error'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Internal server error'
    }
  },
  tags: ['Authentication']
})

export const callbackHandler: RouteHandler<typeof callbackRoute, EnvHono> = async (c) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = c.env

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return c.json({ error: 'Missing required environment variables' }, 400)
    }

    const url = new URL(c.req.url)
    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return c.json({ error: 'OAuth error', details: error }, 400)
    }

    if (!code) {
      return c.json({ error: 'Missing authorization code' }, 400)
    }

    // Exchange authorization code for tokens using type-safe function
    let tokens
    try {
      tokens = await exchangeCodeForTokens({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        code: code,
        redirectUri: 'http://localhost:3000/api/drive/callback'
      })
    } catch (error) {
      console.error('Token exchange failed:', error)
      return c.json({
        error: 'Failed to exchange authorization code for tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500)
    }

    console.log('Received tokens:', tokens)

    if (!tokens.refresh_token) {
      return c.json({
        success: false,
        message: 'No refresh token received. This may happen if the app was already authorized. Try revoking access at https://myaccount.google.com/permissions and re-authorize.',
        accessToken: tokens.access_token ? 'Access token received' : 'No access token'
      }, 200)
    }

    return c.json({
      success: true,
      refreshToken: tokens.refresh_token,
      message: `Refresh Token obtained! Add this to your .dev.vars file: GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
    }, 200)

  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.json({
      error: 'Failed to exchange code for tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}