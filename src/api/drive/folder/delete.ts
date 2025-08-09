import { createRoute, RouteHandler } from '@hono/zod-openapi'
import { ErrorSchema, FolderDeleteRequestSchema, FolderDeleteResponseSchema } from '../../../schema/drive'
import { deleteFolderContents } from '../../../utils/googleDrive'

import type { EnvHono } from '../../..'
export const deleteFolderContentsRoute = createRoute({
  method: 'delete',
  path: '/delete-folder-contents',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FolderDeleteRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FolderDeleteResponseSchema
        }
      },
      description: 'Folder contents deleted successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request'
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Forbidden - folder access denied'
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
  tags: ['Folder API']
})

export const deleteFolderContentsHandler: RouteHandler<typeof deleteFolderContentsRoute, EnvHono> = async (c) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_DEFAULT_FOLDER_ID } = c.env

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
      return c.json({ error: 'Missing required environment variables' }, 400)
    }

    const { folderId } = await c.req.json()

    const result = await deleteFolderContents(
      folderId,
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN
      },
      GOOGLE_DRIVE_DEFAULT_FOLDER_ID
    )

    if (!result.success) {
      if (result.error === 'Unauthorized folder access') {
        return c.json({ error: result.error, details: result.details }, 403)
      }
      return c.json({ error: result.error || 'Delete folder contents failed' }, 400)
    }

    return c.json({
      success: true,
      message: result.message
    }, 200)

  } catch (error) {
    console.error('Delete folder contents error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Failed to refresh access token')) {
        return c.json({
          error: 'Failed to refresh access token',
          details: error.message.replace('Failed to refresh access token: ', '')
        }, 500)
      }
      if (error.message.includes('No access token')) {
        return c.json({ error: 'Failed to get access token' }, 500)
      }
      if (error.message.includes('Failed to list folder contents')) {
        return c.json({
          error: 'Failed to list folder contents',
          details: error.message.replace('Failed to list folder contents: ', '')
        }, 500)
      }
    }

    return c.json({
      error: 'Failed to delete folder contents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}