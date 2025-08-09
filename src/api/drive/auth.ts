import { createRoute, RouteHandler } from '@hono/zod-openapi'
import { ErrorSchema, AuthUrlResponseSchema } from '../../schema/drive'

import type { EnvHono } from '../..'

export const authUrlRoute = createRoute({
  method: 'get',
  path: '/auth-url',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AuthUrlResponseSchema
        }
      },
      description: 'Google OAuth authorization URL'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Missing configuration'
    }
  },
  tags: ['Drive API']
})

export const authUrlHandler: RouteHandler<typeof authUrlRoute, EnvHono> = (c) => {
  const { GOOGLE_CLIENT_ID } = c.env

  if (!GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Missing GOOGLE_CLIENT_ID' }, 400)
  }

  const redirectUri = 'http://localhost:3000/api/drive/callback'
  const scope = 'https://www.googleapis.com/auth/drive.file'

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&response_type=code`

  return c.json({ authUrl }, 200)
}